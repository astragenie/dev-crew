import fs from "node:fs/promises";
import path from "node:path";

/**
 * Loop memory-config seeding (mirrors cost-setup.mts's pattern).
 *
 * Writes the `memory.{enabled,project,profile.*,feedback.*}` block into
 * `.claude/loop.json` in the shape `validate-memory-config.mts` checks for
 * (FEAT-274 / SLICE-176 — 13/15 fleet repos shipped with no memory block at
 * all, the rollout gap behind the 1.6% usefulness finding in
 * runner-plugin#525). Idempotent: every field resolves
 * override > existing > default, so an already-seeded repo's custom values
 * (including an explicit `false`) are never clobbered, and a second run
 * against an unchanged config writes nothing.
 *
 * Defaults applied when nothing is set yet:
 *   memory.enabled                     = true
 *   memory.project                     = basename(repoPath)
 *   memory.profile.enabled             = true
 *   memory.profile.topLessons          = 10
 *   memory.profile.timeoutMs           = 20000
 *   memory.feedback.enabled            = true
 *   memory.feedback.timeoutMs          = 20000
 *   memory.feedback.creditLoop.enabled = true
 *   memory.feedback.creditLoop.k       = 5
 *
 * `--features` override syntax (parsed by parseMemoryOverrides):
 *   "project=my-repo,topLessons=15,creditLoopK=7,enabled=auto"
 */

export const DEFAULT_MEMORY_ENABLED = true;
export const DEFAULT_PROFILE_ENABLED = true;
export const DEFAULT_TOP_LESSONS = 10;
export const DEFAULT_PROFILE_TIMEOUT_MS = 20000;
export const DEFAULT_FEEDBACK_ENABLED = true;
export const DEFAULT_FEEDBACK_TIMEOUT_MS = 20000;
export const DEFAULT_CREDIT_LOOP_ENABLED = true;
export const DEFAULT_CREDIT_LOOP_K = 5;

export type MemoryEnabledValue = boolean | "auto";

export interface MemoryOverrides {
  project?: string;
  enabled?: MemoryEnabledValue;
  profileEnabled?: boolean;
  topLessons?: number;
  profileTimeoutMs?: number;
  feedbackEnabled?: boolean;
  feedbackTimeoutMs?: number;
  creditLoopEnabled?: boolean;
  creditLoopK?: number;
}

const BOOLEAN_KEYS = new Set<keyof MemoryOverrides>([
  "profileEnabled",
  "feedbackEnabled",
  "creditLoopEnabled"
]);
const NUMERIC_KEYS = new Set<keyof MemoryOverrides>([
  "topLessons",
  "profileTimeoutMs",
  "feedbackTimeoutMs",
  "creditLoopK"
]);
const OVERRIDE_KEYS = new Set<keyof MemoryOverrides>([
  "project",
  "enabled",
  ...BOOLEAN_KEYS,
  ...NUMERIC_KEYS
]);

function parseEnabledOverrideValue(value: string): MemoryEnabledValue {
  if (value === "auto") return "auto";
  if (value === "true" || value === "false") return value === "true";
  throw new Error(`enabled must be "true", "false", or "auto" (got "${value}")`);
}

function parseBooleanOverrideValue(key: string, value: string): boolean {
  if (value !== "true" && value !== "false") {
    throw new Error(`${key} must be "true" or "false" (got "${value}")`);
  }
  return value === "true";
}

function parseNumericOverrideValue(key: string, value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Numeric override "${key}" must be a non-negative number (got "${value}")`);
  }
  return n;
}

function applyOverridePart(out: MemoryOverrides, key: string, value: string): void {
  if (!OVERRIDE_KEYS.has(key as keyof MemoryOverrides)) {
    throw new Error(`Unknown override "${key}". Known: ${[...OVERRIDE_KEYS].join(", ")}`);
  }
  if (key === "project") {
    out.project = value;
    return;
  }
  if (key === "enabled") {
    out.enabled = parseEnabledOverrideValue(value);
    return;
  }
  if (BOOLEAN_KEYS.has(key as keyof MemoryOverrides)) {
    (out as Record<string, boolean>)[key] = parseBooleanOverrideValue(key, value);
    return;
  }
  (out as Record<string, number>)[key] = parseNumericOverrideValue(key, value);
}

export function parseMemoryOverrides(raw: string | null | undefined): MemoryOverrides {
  if (!raw) return {};
  const out: MemoryOverrides = {};
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
    applyOverridePart(out, key, value);
  }
  return out;
}

interface LoopConfig {
  memory?: {
    enabled?: MemoryEnabledValue;
    project?: string;
    profile?: {
      enabled?: boolean;
      topLessons?: number;
      timeoutMs?: number;
      [key: string]: unknown;
    };
    feedback?: {
      enabled?: boolean;
      timeoutMs?: number;
      creditLoop?: {
        enabled?: boolean;
        k?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MemorySetupResult {
  configPath: string;
  written: boolean;
  effective: {
    enabled: MemoryEnabledValue;
    project: string;
    profile: { enabled: boolean; topLessons: number; timeoutMs: number };
    feedback: {
      enabled: boolean;
      timeoutMs: number;
      creditLoop: { enabled: boolean; k: number };
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

export async function runMemorySetup(
  repoPath: string,
  overrides: MemoryOverrides = {}
): Promise<MemorySetupResult> {
  const configPath = path.join(repoPath, ".claude", "loop.json");
  const existing = await readLoopConfig(configPath);
  const memory = existing.memory ?? {};
  const existingProfile = memory.profile ?? {};
  const existingFeedback = memory.feedback ?? {};
  const existingCreditLoop = existingFeedback.creditLoop ?? {};

  // Resolve effective values with precedence: override > existing > default.
  // `??` (not `||`) so an existing explicit `false` — an operator's opt-out
  // choice — is preserved rather than replaced by a truthy default.
  const enabled = overrides.enabled ?? memory.enabled ?? DEFAULT_MEMORY_ENABLED;
  const project = overrides.project ?? memory.project ?? path.basename(path.resolve(repoPath));

  const profile = {
    ...existingProfile,
    enabled: overrides.profileEnabled ?? existingProfile.enabled ?? DEFAULT_PROFILE_ENABLED,
    topLessons: overrides.topLessons ?? existingProfile.topLessons ?? DEFAULT_TOP_LESSONS,
    timeoutMs: overrides.profileTimeoutMs ?? existingProfile.timeoutMs ?? DEFAULT_PROFILE_TIMEOUT_MS
  };

  const creditLoop = {
    ...existingCreditLoop,
    enabled:
      overrides.creditLoopEnabled ?? existingCreditLoop.enabled ?? DEFAULT_CREDIT_LOOP_ENABLED,
    k: overrides.creditLoopK ?? existingCreditLoop.k ?? DEFAULT_CREDIT_LOOP_K
  };

  const feedback = {
    ...existingFeedback,
    enabled: overrides.feedbackEnabled ?? existingFeedback.enabled ?? DEFAULT_FEEDBACK_ENABLED,
    timeoutMs:
      overrides.feedbackTimeoutMs ?? existingFeedback.timeoutMs ?? DEFAULT_FEEDBACK_TIMEOUT_MS,
    creditLoop
  };

  // Build the new memory block, preserving unrelated existing keys.
  const nextMemory: NonNullable<LoopConfig["memory"]> = {
    ...memory,
    enabled,
    project,
    profile,
    feedback
  };

  const next: LoopConfig = { ...existing, memory: nextMemory };
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
    effective: { enabled, project, profile, feedback }
  };
}
