// Aggregate cost regression gate (SLICE-52).
// Mirrors slice-cost-ceiling.mts — fail-open evaluator that returns a
// structured signal when current aggregate spend > median × multiplier.

import {
  loadAggregateCostReport,
  computeRollingMedian,
  type AggregateCostReport
} from "./cost-alert-loader.mjs";

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
  /** Effective threshold = medianUsd × multiplier. */
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

  const thresholdUsd = median * multiplier;
  if (currentUsd <= thresholdUsd) return null;

  return {
    triggered: true,
    currentUsd,
    medianUsd: median,
    thresholdUsd,
    multiplier,
    window,
    sampleCount,
    slice: current.slice,
    currentReportPath: current.path
  };
}
