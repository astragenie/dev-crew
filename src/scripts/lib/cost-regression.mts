// Aggregate cost regression gate (SLICE-52).
// Mirrors slice-cost-ceiling.mts — fail-open evaluator that returns a
// structured signal when current aggregate spend > median × multiplier.

import { loadAggregateCostReport, computeRollingMedian } from "./cost-alert-loader.mjs";

export const DEFAULT_COST_REGRESSION_WINDOW = 5;
export const DEFAULT_COST_REGRESSION_MULTIPLIER = 3.0;

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

  // Load up to window+1 reports (current + window historical)
  const { reports } = await loadAggregateCostReport(repoPath, { limit: window + 1 });

  if (reports.length === 0) return null;

  const current = reports[0];
  if (current.usd === null) return null;

  const { median, sampleCount } = computeRollingMedian({ reports, window });
  if (sampleCount === 0 || median === null) return null;

  const thresholdUsd = median * multiplier;
  if (current.usd <= thresholdUsd) return null;

  return {
    triggered: true,
    currentUsd: current.usd,
    medianUsd: median,
    thresholdUsd,
    multiplier,
    window,
    sampleCount,
    slice: current.slice,
    currentReportPath: current.path
  };
}
