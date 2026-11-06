// Extracted from scripts/crew.mjs — maybeEmitCostReport.
// Auto-emits cost-report artifacts after write-final-synthesis.
// Non-fatal: returns null / { error } on failure so the synthesis result still surfaces.
import path from "node:path";
import {
  aggregateDispatchTiming,
  aggregateBashGates,
  getLatestRunId
} from "../dispatch-timing-reader.mjs";
import type { DispatchBreakdown } from "../artifacts/types.mjs";
import type { AgentStatsRow } from "../agent-stats-aggregator.mjs";
// FEAT-025 AC-1 (SLICE-50 review B): the three refusal guards + run_id
// resolution now live in one shared helper so costSliceHandler (the
// autonomous loop's close path) can apply the identical contract instead
// of a second, independently-evolving copy. See cost-report-guard.mjs for
// the full rationale.
import { evaluateCostReportGuard } from "./cost-report-guard.mjs";

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
  // this slice's real work -- or a duplicate of an already-written run_id.
  const sessionsScanned = Number(sliceCost["sessionsScanned"] ?? 0);
  const usd = Number((sliceCost["usd"] as number | undefined) ?? 0);
  const guard = await evaluateCostReportGuard({
    repoPath,
    run: run as unknown as Record<string, unknown>,
    startedAt: run.startedAt,
    completedAt,
    sessionsScanned,
    usd,
    allowWideWindow: options.allowWideWindow,
    maxWindowHours: options.maxWindowHours
  });
  // `=== true` (not a bare `if (guard.refused)`): see the matching note in
  // cost-slice-handler.mts — the root repo's lenient tsconfig.test.json
  // fails to narrow this discriminated union on a bare boolean check when
  // the value comes from an awaited call.
  if (guard.refused === true) {
    return { written: false, reason: guard.reason };
  }
  const runId = guard.runId;

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
