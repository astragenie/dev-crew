// Aggregate cost regression gate (SLICE-52).
// Mirrors slice-cost-ceiling.mts — fail-open evaluator that returns a
// structured signal when current aggregate spend > threshold.
//
// FEAT-167 / SLICE-101: two evaluation modes.
//   - "median" (default): threshold = rolling median × multiplier
//   - "expected_usd": threshold = effort_points × median_usd_per_point × multiplier
// Selected by `config.loop.costRegressionMode`. When unset, auto-flips to
// `expected_usd` once >= 3 done FEATs in backlog carry `effort_points`.
// Falls back to `median` whenever the per-slice `effort_points` or bootstrap
// `costMedianUsdPerPoint` is missing — never silently mis-evaluates.

import fs from "node:fs/promises";
import path from "node:path";

import {
  loadAggregateCostReport,
  computeRollingMedian,
  type AggregateCostReport
} from "./cost-alert-loader.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

export const COST_REGRESSION_MODES = ["median", "expected_usd"] as const;
export type CostRegressionMode = (typeof COST_REGRESSION_MODES)[number];
const EFFORT_POINTS_AUTOFLIP_THRESHOLD = 3;

export const DEFAULT_COST_REGRESSION_WINDOW = 5;
export const DEFAULT_COST_REGRESSION_MULTIPLIER = 3.0;
// Gate stays dormant until at least this many historical samples have
// accumulated. With sampleCount=2 the median is dominated by a single
// outlier (e.g. retro/snapshot batch) and the gate false-trips at the
// first real slice cost. 3 is the smallest window that survives one
// contaminated sample without halting the loop. Tune via
// loop.costRegressionMinSamples in .claude/loop.json.
export const DEFAULT_COST_REGRESSION_MIN_SAMPLES = 3;

/** Signal returned by checkCostRegression when the gate fires. */
export interface CostRegressionSignal {
  triggered: true;
  /** Current slice aggregate spend in USD. */
  currentUsd: number;
  /** Rolling median of the historical baseline in USD. */
  medianUsd: number;
  /** Effective threshold = (medianUsd | expectedUsd) × multiplier. */
  thresholdUsd: number;
  /** Multiplier from config (default 3.0). */
  multiplier: number;
  /** Window from config (default 5). */
  window: number;
  /** Reports actually used for the median (≤ window). */
  sampleCount: number;
  /** Current slice id (e.g. "SLICE-52") if known. */
  slice: string | null;
  /** Path to the current aggregate report (audit). */
  currentReportPath: string;
  /** Evaluation mode used for this decision. FEAT-167 / SLICE-101. */
  mode: CostRegressionMode;
  /** Expected USD when mode === "expected_usd"; null in median mode. */
  expectedUsd: number | null;
}

function resolveWindow(config: Record<string, any> | null): number {
  const raw = config?.loop?.costRegressionWindow;
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0
    ? raw
    : DEFAULT_COST_REGRESSION_WINDOW;
}

function resolveMultiplier(config: Record<string, any> | null): number {
  const raw = config?.loop?.costRegressionMultiplier;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_COST_REGRESSION_MULTIPLIER;
}

function resolveMinSamples(config: Record<string, any> | null): number {
  const raw = config?.loop?.costRegressionMinSamples;
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0
    ? raw
    : DEFAULT_COST_REGRESSION_MIN_SAMPLES;
}

function resolveCostProject(config: Record<string, any> | null): string | null {
  const raw = config?.loop?.costProject;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function resolveCostProjectAliases(config: Record<string, any> | null): string[] {
  const raw = config?.loop?.costProjectAliases;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.length > 0);
}

export function resolveCostRegressionMode(
  config: Record<string, any> | null
): CostRegressionMode | null {
  const raw = config?.loop?.costRegressionMode;
  if (raw === "median" || raw === "expected_usd") return raw;
  return null;
}

export function resolveCostMedianUsdPerPoint(
  config: Record<string, any> | null
): number | null {
  const raw = config?.loop?.costMedianUsdPerPoint;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : null;
}

/**
 * Schema-validate the cost-regression keys inside a parsed `.claude/loop.json`.
 * Returns an array of human-readable error strings (empty when valid). Pure;
 * does not throw, does not exit. Caller decides how to surface results — a
 * future `.claude/loop.json` walker can collect these alongside other config
 * validations.
 */
export function validateCostRegressionConfig(config: Record<string, any> | null): string[] {
  const errors: string[] = [];
  const loop = config?.loop;
  if (!loop || typeof loop !== "object") return errors;
  if ("costRegressionMode" in loop) {
    const v = loop.costRegressionMode;
    if (v !== null && v !== "median" && v !== "expected_usd") {
      errors.push(
        `.claude/loop.json: loop.costRegressionMode must be null, "median", or "expected_usd" (got ${JSON.stringify(v)})`
      );
    }
  }
  if ("costMedianUsdPerPoint" in loop) {
    const v = loop.costMedianUsdPerPoint;
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
      errors.push(
        `.claude/loop.json: loop.costMedianUsdPerPoint must be null or a non-negative finite number (got ${JSON.stringify(v)})`
      );
    }
  }
  return errors;
}

/**
 * Count done/ FEATs whose frontmatter carries an integer `effort_points`.
 * Used to auto-flip from median to expected_usd mode once enough samples
 * accumulate. Returns 0 when the backlog directory is missing — fail-open
 * stays on median mode rather than tripping on an empty repo.
 */
export async function countDoneFeatsWithEffortPoints(repoPath: string): Promise<number> {
  const dir = path.join(repoPath, ".claude/artifacts/loop/backlog/done");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return 0;
  }
  let count = 0;
  for (const name of entries) {
    if (!name.startsWith("FEAT-") || !name.endsWith(".md")) continue;
    let content: string;
    try {
      content = await fs.readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    const { frontmatter } = parseFrontmatter(content);
    if (Number.isInteger(frontmatter.effort_points)) count += 1;
  }
  return count;
}

/**
 * Extract this project's slice of an aggregate report's USD spend.
 *
 * - When `perProjectUsd` is present on the report AND `costProject` is
 *   configured, return the sum of the project's entry + all matching
 *   alias entries. Missing keys contribute 0; if NO key matches the
 *   map at all, fall back to `report.usd` (defensive — treats an
 *   unknown current project as the legacy single-project case).
 * - When `perProjectUsd` is absent (older aggregate reports written
 *   before hero-crew SLICE-1 shipped) OR `costProject` is not
 *   configured, return `report.usd` unchanged — back-compat path.
 *
 * FEAT-166 / SLICE-91. Pure function; no I/O.
 */
function extractProjectUsd(
  report: AggregateCostReport,
  costProject: string | null,
  aliases: string[]
): number | null {
  if (!costProject || !report.perProjectUsd) return report.usd;
  const keys = [costProject, ...aliases];
  let sum = 0;
  let matched = false;
  for (const key of keys) {
    const v = report.perProjectUsd[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      matched = true;
    }
  }
  return matched ? sum : report.usd;
}

/**
 * Fail-open evaluator for the rolling-median cost regression gate.
 *
 * Returns null when:
 *   - no aggregate reports exist,
 *   - current report has no parseable `usd`,
 *   - sampleCount === 0 (single-report fallback),
 *   - currentUsd <= thresholdUsd.
 *
 * Returns a CostRegressionSignal when currentUsd > thresholdUsd.
 */
export async function checkCostRegression(
  repoPath: string,
  config: Record<string, any> | null
): Promise<CostRegressionSignal | null> {
  const window = resolveWindow(config);
  const multiplier = resolveMultiplier(config);
  const minSamples = resolveMinSamples(config);
  const costProject = resolveCostProject(config);
  const aliases = resolveCostProjectAliases(config);

  // Load up to window+1 reports (current + window historical)
  const { reports } = await loadAggregateCostReport(repoPath, { limit: window + 1 });

  if (reports.length === 0) return null;

  const current = reports[0]!;
  // Filter current spend by this project (sums costProject + aliases when
  // perProjectUsd is present on the report; falls back to fm.usd
  // otherwise). FEAT-166 / SLICE-91 — prevents cross-project aggregate
  // inflation from tripping the gate.
  const currentUsd = extractProjectUsd(current, costProject, aliases);
  if (currentUsd === null) return null;

  // Apply the same per-project view to historical reports so the
  // rolling median is computed against THIS project's slice — not the
  // cross-project sum. Reports without perProjectUsd fall back to their
  // fm.usd transparently, preserving the existing baseline shape.
  const projectFilteredReports = reports.map((r) => ({
    ...r,
    usd: extractProjectUsd(r, costProject, aliases)
  }));

  const { median, sampleCount } = computeRollingMedian({
    reports: projectFilteredReports,
    window
  });
  if (sampleCount === 0 || median === null) return null;
  // Dormant until enough samples to make the median stable. Without this,
  // a single outlier ($1500+ retro batch) sets the median and every
  // subsequent normal-priced slice trips the gate.
  if (sampleCount < minSamples) return null;

  // FEAT-167 / SLICE-101: pick the evaluation mode. Explicit config wins;
  // otherwise auto-flip to expected_usd once enough done FEATs carry
  // effort_points. Falls back to median whenever the expected formula
  // can't be computed (no per-slice effort_points or no bootstrap median).
  const explicitMode = resolveCostRegressionMode(config);
  let mode: CostRegressionMode = explicitMode ?? "median";
  if (explicitMode === null) {
    const sampleEligibleFeats = await countDoneFeatsWithEffortPoints(repoPath);
    if (sampleEligibleFeats >= EFFORT_POINTS_AUTOFLIP_THRESHOLD) {
      mode = "expected_usd";
    }
  }

  const medianUsdPerPoint = resolveCostMedianUsdPerPoint(config);
  const effortPoints = current.effortPoints;
  let expectedUsd: number | null = null;
  let thresholdUsd = median * multiplier;
  if (mode === "expected_usd" && effortPoints !== null && medianUsdPerPoint !== null) {
    expectedUsd = effortPoints * medianUsdPerPoint;
    thresholdUsd = expectedUsd * multiplier;
  } else {
    // The expected formula needs both effort_points on the current report
    // AND a bootstrap median per point. Missing either → degrade gracefully
    // to median mode so the gate never silently mis-evaluates.
    mode = "median";
  }
  const triggered = currentUsd > thresholdUsd;

  emitObservabilityLog({
    mode,
    actualUsd: currentUsd,
    expectedUsd,
    medianUsdPerPoint: mode === "expected_usd" ? medianUsdPerPoint : null,
    effortPoints: mode === "expected_usd" ? effortPoints : null,
    thresholdUsd,
    triggered,
    multiplier,
    window,
    sampleCount
  });

  if (!triggered) return null;

  return {
    triggered: true,
    currentUsd,
    medianUsd: median,
    thresholdUsd,
    multiplier,
    window,
    sampleCount,
    slice: current.slice,
    currentReportPath: current.path,
    mode,
    expectedUsd
  };
}

interface ObservabilityEvent {
  mode: "median" | "expected_usd";
  actualUsd: number;
  expectedUsd: number | null;
  medianUsdPerPoint: number | null;
  effortPoints: number | null;
  thresholdUsd: number;
  triggered: boolean;
  multiplier: number;
  window: number;
  sampleCount: number;
}

/**
 * Emit one structured `cost-regression-check` JSON line per evaluation.
 *
 * Goes to stderr (stdout stays machine-parseable for CLI consumers).
 * Set env `LOOP_DISABLE_COST_REGRESSION_LOG=1` to silence — tests that
 * spawn the regression check repeatedly use this to keep output clean.
 *
 * FEAT-167 AC-3.
 */
export function emitObservabilityLog(event: ObservabilityEvent): void {
  if (process.env.LOOP_DISABLE_COST_REGRESSION_LOG === "1") return;
  process.stderr.write(
    JSON.stringify({
      event: "cost-regression-check",
      timestamp: new Date().toISOString(),
      mode: event.mode,
      actual_usd: event.actualUsd,
      expected_usd: event.expectedUsd,
      median_usd_per_point: event.medianUsdPerPoint,
      effort_points: event.effortPoints,
      threshold_usd: event.thresholdUsd,
      triggered: event.triggered,
      multiplier: event.multiplier,
      window: event.window,
      sample_count: event.sampleCount
    }) + "\n"
  );
}
