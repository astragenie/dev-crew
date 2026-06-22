import fs from "node:fs/promises";
import path from "node:path";

/**
 * Loop cost-config setup + migration.
 *
 * Writes the nested `loop.cost.{ceilingUsd,regression.*}` shape into
 * `.claude/loop.json`. Idempotent. When the file already has the legacy flat
 * keys (`loop.costSliceCeiling`, `loop.costRegression*`, `loop.costProject*`,
 * `loop.costMedianUsdPerPoint`, `loop.costStopThreshold`), the migrator:
 *   - moves them into the nested block,
 *   - deletes the legacy keys (including the retired `costStopThreshold`),
 *   - writes the result back atomically.
 *
 * Defaults applied when nothing is set yet:
 *   loop.cost.ceilingUsd               = 75
 *   loop.cost.regression.multiplier    = 3.0
 *   loop.cost.regression.window        = 5
 *   loop.cost.regression.minSamples    = 3
 *
 * `--features` override syntax (parsed by parseCostOverrides):
 *   "ceilingUsd=200,regressionMultiplier=2.5,regressionWindow=7"
 *   "project=astrarunner,projectAliases=runner-hardening|memory"
 */

export const DEFAULT_CEILING_USD = 75;
export const DEFAULT_REGRESSION_MULTIPLIER = 3.0;
export const DEFAULT_REGRESSION_WINDOW = 5;
export const DEFAULT_REGRESSION_MIN_SAMPLES = 3;

export interface CostOverrides {
  ceilingUsd?: number;
  regressionMultiplier?: number;
  regressionWindow?: number;
  regressionMinSamples?: number;
  regressionMode?: "median" | "expected_usd";
  medianUsdPerPoint?: number;
  project?: string;
  projectAliases?: string[];
}

const OVERRIDE_KEYS = new Set<keyof CostOverrides>([
  "ceilingUsd",
  "regressionMultiplier",
  "regressionWindow",
  "regressionMinSamples",
  "regressionMode",
  "medianUsdPerPoint",
  "project",
  "projectAliases"
]);

export function parseCostOverrides(raw: string | null | undefined): CostOverrides {
  if (!raw) return {};
  const out: CostOverrides = {};
  for (const part of raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      throw new Error(`Invalid override "${part}". Expected KEY=VALUE.`);
    }
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!OVERRIDE_KEYS.has(key as keyof CostOverrides)) {
      throw new Error(`Unknown override "${key}". Known: ${[...OVERRIDE_KEYS].join(", ")}`);
    }
    if (key === "regressionMode") {
      if (value !== "median" && value !== "expected_usd") {
        throw new Error(`regressionMode must be "median" or "expected_usd" (got "${value}")`);
      }
      out.regressionMode = value;
      continue;
    }
    if (key === "project") {
      out.project = value;
      continue;
    }
    if (key === "projectAliases") {
      out.projectAliases = value
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`Numeric override "${key}" must be a non-negative number (got "${value}")`);
    }
    (out as Record<string, number>)[key] = n;
  }
  return out;
}

interface LoopConfig {
  loop?: {
    cost?: {
      ceilingUsd?: number;
      regression?: {
        multiplier?: number;
        window?: number;
        minSamples?: number;
        mode?: "median" | "expected_usd";
        medianUsdPerPoint?: number;
        project?: string | null;
        projectAliases?: string[];
      };
    };
    costSliceCeiling?: number;
    costStopThreshold?: number;
    costRegressionMultiplier?: number;
    costRegressionWindow?: number;
    costRegressionMinSamples?: number;
    costRegressionMode?: "median" | "expected_usd";
    costMedianUsdPerPoint?: number;
    costProject?: string;
    costProjectAliases?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CostSetupResult {
  configPath: string;
  written: boolean;
  migratedLegacyKeys: string[];
  effective: {
    ceilingUsd: number;
    regression: {
      multiplier: number;
      window: number;
      minSamples: number;
      mode?: "median" | "expected_usd";
      medianUsdPerPoint?: number;
      project?: string | null;
      projectAliases?: string[];
    };
  };
}

async function readLoopConfig(configPath: string): Promise<LoopConfig> {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LoopConfig;
    return {};
  } catch {
    return {};
  }
}

export async function runCostSetup(
  repoPath: string,
  overrides: CostOverrides = {}
): Promise<CostSetupResult> {
  const configPath = path.join(repoPath, ".claude", "loop.json");
  const existing = await readLoopConfig(configPath);
  const loop = (existing.loop ?? {}) as NonNullable<LoopConfig["loop"]>;

  const existingNestedCost = loop.cost ?? {};
  const existingNestedRegression = existingNestedCost.regression ?? {};

  // Resolve effective values with precedence: override > nested > legacy > default.
  const ceilingUsd =
    overrides.ceilingUsd ??
    existingNestedCost.ceilingUsd ??
    loop.costSliceCeiling ??
    DEFAULT_CEILING_USD;

  const regression: CostSetupResult["effective"]["regression"] = {
    multiplier:
      overrides.regressionMultiplier ??
      existingNestedRegression.multiplier ??
      loop.costRegressionMultiplier ??
      DEFAULT_REGRESSION_MULTIPLIER,
    window:
      overrides.regressionWindow ??
      existingNestedRegression.window ??
      loop.costRegressionWindow ??
      DEFAULT_REGRESSION_WINDOW,
    minSamples:
      overrides.regressionMinSamples ??
      existingNestedRegression.minSamples ??
      loop.costRegressionMinSamples ??
      DEFAULT_REGRESSION_MIN_SAMPLES
  };

  const mode = overrides.regressionMode ?? existingNestedRegression.mode ?? loop.costRegressionMode;
  if (mode) regression.mode = mode;

  const medianUsdPerPoint =
    overrides.medianUsdPerPoint ??
    existingNestedRegression.medianUsdPerPoint ??
    loop.costMedianUsdPerPoint;
  if (typeof medianUsdPerPoint === "number") regression.medianUsdPerPoint = medianUsdPerPoint;

  const project = overrides.project ?? existingNestedRegression.project ?? loop.costProject ?? null;
  if (typeof project === "string" && project.length > 0) regression.project = project;

  const projectAliases =
    overrides.projectAliases ?? existingNestedRegression.projectAliases ?? loop.costProjectAliases;
  if (Array.isArray(projectAliases) && projectAliases.length > 0) {
    regression.projectAliases = projectAliases;
  }

  // Build the new loop block, preserving non-cost fields, dropping legacy cost keys.
  const migratedLegacyKeys: string[] = [];
  const nextLoop: NonNullable<LoopConfig["loop"]> = { ...loop };
  for (const k of [
    "costSliceCeiling",
    "costStopThreshold",
    "costRegressionMultiplier",
    "costRegressionWindow",
    "costRegressionMinSamples",
    "costRegressionMode",
    "costMedianUsdPerPoint",
    "costProject",
    "costProjectAliases"
  ] as const) {
    if (k in nextLoop) {
      migratedLegacyKeys.push(k);
      delete nextLoop[k];
    }
  }
  nextLoop.cost = { ceilingUsd, regression };

  const next: LoopConfig = { ...existing, loop: nextLoop };
  const nextSerialized = JSON.stringify(next, null, 2) + "\n";

  let prevSerialized = "";
  try {
    prevSerialized = await fs.readFile(configPath, "utf8");
  } catch {
    prevSerialized = "";
  }

  let written = false;
  if (prevSerialized !== nextSerialized) {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, nextSerialized, "utf8");
    written = true;
  }

  return {
    configPath,
    written,
    migratedLegacyKeys,
    effective: {
      ceilingUsd,
      regression
    }
  };
}
