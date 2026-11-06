// Extracted from scripts/crew.mjs — maybeEmitCostReport.
// Auto-emits cost-report artifacts after write-final-synthesis.
// Non-fatal: returns null / { error } on failure so the synthesis result still surfaces.
import fs from "node:fs/promises";
import path from "node:path";
import {
  aggregateDispatchTiming,
  aggregateBashGates,
  getLatestRunId
} from "../dispatch-timing-reader.mjs";
import type { DispatchBreakdown } from "../artifacts/types.mjs";
import type { AgentStatsRow } from "../agent-stats-aggregator.mjs";

// FEAT-025: a cost report with zero sessions scanned, or a window wider than
// this, is more likely to be lying (stale/un-rotated currentRun, FEAT-188 S5
// / #178 incident shape) than to be real signal. Overridable via
// options.maxWindowHours; the refusal itself is overridable via
// options.allowWideWindow (CLI surface: --allow-wide-window).
const DEFAULT_MAX_WINDOW_HOURS = 24;

function windowHoursBetween(startedAt: string, completedAt: string): number {
  const ms = Date.parse(completedAt) - Date.parse(startedAt);
  if (Number.isNaN(ms)) return 0;
  return ms / (1000 * 60 * 60);
}

// run_id resolution: prefer the workflow-state run's own runId (set by
// `/runner:slice start` / dispatch-timing correlation); fall back to a
// deterministic id derived from the window itself so older workflow states
// (no runId field) still get a stable, dedup-able identifier.
function resolveRunId(
  run: Record<string, unknown>,
  startedAt: string,
  completedAt: string
): string {
  const explicit = run["runId"];
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  return `${startedAt}_${completedAt}`;
}

// Best-effort scan of existing cost-report files in the cost dir for one
// already carrying this exact run_id + usd total — "identical totals" per
// AC-1. A plain string scan (not a full frontmatter parse) keeps this
// change scoped to this module; false negatives just mean an extra (still
// honest) report gets written, never data loss.
async function findDuplicateRunId(repoPath: string, runId: string, usd: number): Promise<boolean> {
  const costDir = path.join(repoPath, ".claude", "artifacts", "crew", "cost");
  let files: string[];
  try {
    files = (await fs.readdir(costDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
  const needleRunId = `run_id: ${JSON.stringify(runId)}`;
  const needleUsd = `usd: ${usd}`;
  for (const f of files) {
    try {
      const content = await fs.readFile(path.join(costDir, f), "utf8");
      if (content.includes(needleRunId) && content.includes(needleUsd)) return true;
    } catch {
      // unreadable file — skip, never block emission on a read error
    }
  }
  return false;
}

async function collectAgentStatsForRun(repoPath: string): Promise<AgentStatsRow[] | undefined> {
  if (process.env["CREW_COST_REPORT_AGENT_STATS"] === "0") return undefined;
  try {
    const { aggregateAgentStats } = await import("../agent-stats-aggregator.mjs");
    const n = Number.parseInt(process.env["CREW_AGENT_STATS_WINDOW"] ?? "10", 10);
    const rows = await aggregateAgentStats({
      repo: repoPath,
      window: { kind: "last_n_slices", n: Number.isFinite(n) && n > 0 ? n : 10 }
    });
    return rows.length > 0 ? rows : undefined;
  } catch {
    // Non-fatal — telemetry layer should never break cost-report emission.
    return undefined;
  }
}

async function collectDispatchBreakdownForRun(
  repoPath: string,
  runId: string | undefined
): Promise<DispatchBreakdown | undefined> {
  try {
    const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? repoPath;
    const dispatchLog =
      process.env["CREW_DISPATCH_TIMING_LOG"] ??
      path.join(pluginRoot, ".claude", "logs", "dispatch-timing.jsonl");
    const bashLog =
      process.env["CREW_BASH_GATE_LOG"] ??
      path.join(pluginRoot, ".claude", "logs", "bash-gates.jsonl");
    // Fall back to scanning the log for the most recent runId when not provided
    const resolvedRunId = runId ?? (await getLatestRunId(dispatchLog));
    const [dispatch, gates] = await Promise.all([
      resolvedRunId
        ? aggregateDispatchTiming(dispatchLog, resolvedRunId)
        : Promise.resolve({ rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] }),
      aggregateBashGates(bashLog)
    ]);
    if (dispatch.rowCount === 0 && gates.rowCount === 0) return undefined;
    return { dispatch, gates };
  } catch {
    return undefined;
  }
}

interface MaybeEmitAggregateCostOpts {
  repoPath: string;
  title: string;
  startedAt: string;
  completedAt: string;
  outcome: Record<string, unknown>;
  feature: string | null;
  phase: string | null;
  writeArtifact: (
    repoPath: string,
    kind: string,
    fields: Record<string, unknown>
  ) => Promise<unknown>;
  computeSessionCost: (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
}

async function maybeEmitAggregateCost(opts: MaybeEmitAggregateCostOpts): Promise<unknown> {
  const {
    repoPath,
    title,
    startedAt,
    completedAt,
    outcome,
    feature,
    phase,
    writeArtifact,
    computeSessionCost
  } = opts;
  const aggregateCost = await computeSessionCost(repoPath, {
    startedAt,
    completedAt,
    aggregateAll: true
  });
  const sources = aggregateCost["sources"] as unknown[] | undefined;
  if (!sources || sources.length <= 1) return null;
  return writeArtifact(repoPath, "cost-report-aggregate", {
    title,
    runTitle: title,
    cost: aggregateCost,
    outcome,
    feature,
    phase
  });
}

async function emitCostReportInner(
  repoPath: string,
  runTitle: string | null,
  feature: string | null,
  phase: string | null,
  emitCostAdviseFn: (
    repoPath: string,
    opts: { title: string | null; feature: string | null; phase: string | null }
  ) => Promise<unknown>,
  options: { allowWideWindow?: boolean; maxWindowHours?: number } = {}
): Promise<Record<string, unknown>> {
  const { loadWorkflowState } = await import("../workflow-state.mjs");
  const { computeSessionCost: computeCost } = await import("../session-cost.mjs");
  const { collectOutcomeLinkage } = await import("../outcome-linkage.mjs");
  const { writeArtifact: writeArt } = await import("../artifacts/write.mjs");
  const computeSessionCost = computeCost as (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  const writeArtifact = async (
    rp: string,
    kind: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const r = await writeArt(rp, kind, fields as import("../artifacts/write.mjs").ArtifactFields);
    if (!r.ok) throw r.error;
    return r.value as unknown as Record<string, unknown>;
  };
  const state = await loadWorkflowState(repoPath);
  const run = state?.currentRun || null;
  if (!run?.startedAt) return null as unknown as Record<string, unknown>;
  const completedAt = run.completedAt || new Date().toISOString();
  const title = runTitle || run.title || "cost-report";
  const outcome = (await collectOutcomeLinkage(repoPath, title)) as unknown as Record<
    string,
    unknown
  >;
  const [sliceCost, dispatchBreakdown, agentStats] = await Promise.all([
    computeSessionCost(repoPath, {
      startedAt: run.startedAt,
      completedAt,
      aggregateAll: false
    }),
    collectDispatchBreakdownForRun(
      repoPath,
      (run as unknown as Record<string, unknown>)["runId"] as string | undefined
    ),
    collectAgentStatsForRun(repoPath)
  ]);

  // FEAT-025 AC-1: refuse to write a cost report that cannot be honest about
  // what it measured -- zero sessions scanned, or a window wide enough to be
  // a stale/un-rotated currentRun (the exact #178 incident shape) rather than
  // this slice's real work.
  const sessionsScanned = Number(sliceCost["sessionsScanned"] ?? 0);
  const maxWindowHours = options.maxWindowHours ?? DEFAULT_MAX_WINDOW_HOURS;
  const windowHours = windowHoursBetween(run.startedAt, completedAt);
  if (sessionsScanned === 0) {
    return { written: false, reason: "sessions_scanned_zero" };
  }
  if (windowHours > maxWindowHours && !options.allowWideWindow) {
    return { written: false, reason: "window_too_wide" };
  }

  const runId = resolveRunId(run as unknown as Record<string, unknown>, run.startedAt, completedAt);
  const usd = Number((sliceCost["usd"] as number | undefined) ?? 0);
  if (await findDuplicateRunId(repoPath, runId, usd)) {
    return { written: false, reason: "duplicate run_id" };
  }

  const sliceArtifact = await writeArtifact(repoPath, "cost-report-slice", {
    title,
    runTitle: title,
    cost: sliceCost,
    outcome,
    runId,
    ...(feature != null ? { feature } : {}),
    ...(phase != null ? { phase } : {}),
    ...(dispatchBreakdown != null ? { dispatchBreakdown } : {}),
    ...(agentStats != null ? { agentStats } : {})
  });
  const aggregateArtifact = await maybeEmitAggregateCost({
    repoPath,
    title,
    startedAt: run.startedAt,
    completedAt,
    outcome,
    feature,
    phase,
    writeArtifact,
    computeSessionCost
  });
  const adviseArtifact = await emitCostAdviseFn(repoPath, { title: runTitle, feature, phase });
  return { report: sliceArtifact, aggregate: aggregateArtifact, advise: adviseArtifact };
}

/**
 * Auto-emit a cost-report artifact when a run window is available.
 * Designed to be called immediately after write-final-synthesis.
 */
export async function maybeEmitCostReport(
  repoPath: string,
  options: {
    runTitle?: string | null;
    feature?: string | null;
    phase?: string | null;
    /** FEAT-025 AC-1: CLI surface is --allow-wide-window. */
    allowWideWindow?: boolean;
    maxWindowHours?: number;
  } = {},
  emitCostAdviseFn: (
    repoPath: string,
    opts: { title: string | null; feature: string | null; phase: string | null }
  ) => Promise<unknown> = async () => null
): Promise<Record<string, unknown> | null> {
  const { runTitle, feature, phase, allowWideWindow, maxWindowHours } = options;
  try {
    return await emitCostReportInner(
      repoPath,
      runTitle || null,
      feature || null,
      phase || null,
      emitCostAdviseFn,
      {
        ...(allowWideWindow !== undefined ? { allowWideWindow } : {}),
        ...(maxWindowHours !== undefined ? { maxWindowHours } : {})
      }
    );
  } catch (err) {
    return { error: (err as Error).message };
  }
}
