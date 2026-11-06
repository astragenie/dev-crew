// Extracted from scripts/crew.mjs — "cost-slice" command handler body.
// Kept in cost-hygiene/ because it emits per-slice and aggregate cost artifacts.
import path from "node:path";
import {
  aggregateDispatchTiming,
  aggregateBashGates,
  getLatestRunId
} from "../dispatch-timing-reader.mjs";
import type { DispatchBreakdown } from "../artifacts/types.mjs";
// FEAT-025 AC-1 (SLICE-50 review B blocker): this handler is the autonomous
// loop's actual close path (src/scripts/lib/slice-linker/crew-bridge.mts ->
// costSliceHandler) — the honesty refusal + run_id contract was previously
// wired only into emit-cost-report.mts's maybeEmitCostReport, which this
// path never calls. Shares the guard logic rather than re-implementing it.
import { evaluateCostReportGuard } from "./cost-report-guard.mjs";

interface MaybeEmitAggregateSliceOpts {
  repoPath: string;
  startedAt: string;
  completedAt: string | null;
  runTitle: string;
  outcome: Record<string, unknown>;
  feature: string | null;
  phase: string | null;
  notes: string | null;
  sourceProject: string | null | undefined;
  writeArtifact: (
    repoPath: string,
    kind: string,
    fields: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  computeSessionCost: (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
}

async function maybeEmitAggregateSlice(
  opts: MaybeEmitAggregateSliceOpts
): Promise<Record<string, unknown> | null> {
  const {
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature,
    phase,
    notes,
    sourceProject,
    writeArtifact,
    computeSessionCost
  } = opts;
  const aggregateCost = await computeSessionCost(repoPath, {
    startedAt,
    completedAt,
    sourceProject,
    aggregateAll: true
  });
  const sources = aggregateCost["sources"] as unknown[] | undefined;
  if (!sources || sources.length <= 1) return null;
  const artifact = await writeArtifact(repoPath, "cost-report-aggregate", {
    title: runTitle,
    runTitle,
    cost: aggregateCost,
    outcome,
    notes,
    feature,
    phase
  });
  artifact["cost"] = aggregateCost as unknown;
  artifact["outcome"] = outcome as unknown;
  return artifact;
}

export interface CostSliceContext {
  repoPath: string;
  flags: Record<string, unknown>;
}

interface CostSliceParams {
  startedAt: string | undefined;
  completedAt: string | null;
  runTitle: string;
  notes: string | null;
  feature: string | null | undefined;
  phase: string | null | undefined;
  sourceProject: string | null | undefined;
}

function resolveCostSliceParams(
  flags: Record<string, unknown>,
  run: { startedAt?: string; completedAt?: string | null; title?: string } | null
): CostSliceParams {
  return {
    startedAt: (flags["startedAt"] as string | undefined) || run?.startedAt,
    completedAt: (flags["completedAt"] as string | null) || run?.completedAt || null,
    runTitle:
      (flags["runTitle"] as string | undefined) ||
      (flags["title"] as string | undefined) ||
      run?.title ||
      "manual-cost-slice",
    notes: (flags["summary"] as string | null) || null,
    feature: flags["feature"] as string | null | undefined,
    phase: flags["phase"] as string | null | undefined,
    sourceProject: flags["sourceProject"] as string | null | undefined
  };
}

/**
 * Collect dispatch + bash-gate telemetry for the cost-report breakdown section (FEAT-151).
 * Non-fatal: returns undefined on any error so the rest of the report still renders.
 */
async function collectDispatchBreakdown(
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
    // Suppress if both sources are empty (nothing interesting to show)
    if (dispatch.rowCount === 0 && gates.rowCount === 0) return undefined;
    return { dispatch, gates };
  } catch {
    return undefined;
  }
}

// Extracted to keep costSliceHandler's cognitive complexity under the
// repo's cap (AGENTS.md § Style) — builds the guard-evaluation params from
// the handler's locals (biome flags this as a bundle, not individually).
function buildGuardParams(
  repoPath: string,
  run: Record<string, unknown> | null,
  flags: Record<string, unknown>,
  startedAt: string,
  completedAt: string | null,
  sliceCost: Record<string, unknown>
): Parameters<typeof evaluateCostReportGuard>[0] {
  const scanWindow = (sliceCost["window"] as { start?: string; end?: string } | undefined) ?? {};
  return {
    repoPath,
    run,
    startedAt: scanWindow.start ?? startedAt,
    completedAt: scanWindow.end ?? completedAt ?? new Date().toISOString(),
    sessionsScanned: Number(sliceCost["sessionsScanned"] ?? 0),
    usd: Number((sliceCost["usd"] as number | undefined) ?? 0),
    allowWideWindow: flags["allowWideWindow"] === true,
    maxWindowHours:
      typeof flags["maxWindowHours"] === "number" ? (flags["maxWindowHours"] as number) : undefined
  };
}

/**
 * Handler for the "cost-slice" CLI command.
 */
export async function costSliceHandler({
  repoPath,
  flags
}: CostSliceContext): Promise<Record<string, unknown>> {
  const { loadWorkflowState } = await import("../workflow-state.mjs");
  const { computeSessionCost: computeCost } = await import("../session-cost.mjs");
  const { collectOutcomeLinkage } = await import("../outcome-linkage.mjs");
  const { writeArtifact: writeArt } = await import("../artifacts/write.mjs");
  // Cast to permissive signatures to avoid cross-.mjs JSDoc type mismatches.
  const computeSessionCost = computeCost as (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  const state = await loadWorkflowState(repoPath);
  const run = state?.currentRun || null;
  const { startedAt, completedAt, runTitle, notes, feature, phase, sourceProject } =
    resolveCostSliceParams(flags, run);
  if (!startedAt) {
    throw new Error("cost-slice requires --started-at or an active/last run with startedAt");
  }
  const [sliceCost, dispatchBreakdown] = await Promise.all([
    computeSessionCost(repoPath, {
      startedAt,
      completedAt,
      sourceProject,
      aggregateAll: false
    }),
    collectDispatchBreakdown(
      repoPath,
      (run as unknown as Record<string, unknown> | null)?.["runId"] as string | undefined
    )
  ]);
  const outcome = (await collectOutcomeLinkage(repoPath, runTitle)) as unknown as Record<
    string,
    unknown
  >;

  // FEAT-025 AC-1: refuse to write a cost report that cannot be honest about
  // what it measured. Uses the actual resolved scan window
  // (sliceCost.window) rather than the raw startedAt/completedAt params,
  // since completedAt may be null (computeSessionCost defaults it to
  // "now" internally) — window.start/end reflect what was really scanned.
  const guard = await evaluateCostReportGuard(
    buildGuardParams(
      repoPath,
      run as unknown as Record<string, unknown> | null,
      flags,
      startedAt,
      completedAt,
      sliceCost
    )
  );
  // `=== true` (not a bare `if (guard.refused)`) because the root repo's
  // lenient tsconfig.test.json (strict: false) sweeps this file in
  // transitively via crew-bridge.mts and fails to narrow a discriminated
  // union returned from an awaited call on a bare boolean-property check —
  // confirmed via a minimal repro against both tsconfigs. The explicit
  // equality check narrows correctly under both.
  if (guard.refused === true) {
    return { written: false, reason: guard.reason };
  }

  const writeResult = await writeArt(repoPath, "cost-report-slice", {
    title: runTitle,
    runTitle,
    cost: sliceCost,
    outcome,
    runId: guard.runId,
    ...(notes != null ? { notes } : {}),
    ...(feature != null ? { feature } : {}),
    ...(phase != null ? { phase } : {}),
    ...(dispatchBreakdown != null ? { dispatchBreakdown } : {})
  });
  if (writeResult.ok === false) throw writeResult.error;
  const sliceArtifact: Record<string, unknown> = { ...writeResult.value };
  sliceArtifact["cost"] = sliceCost;
  sliceArtifact["outcome"] = outcome;

  if (flags["aggregateAll"] !== true) {
    return sliceArtifact;
  }

  const writeArtifact = async (
    rp: string,
    kind: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const r = await writeArt(rp, kind, fields as import("../artifacts/write.mjs").ArtifactFields);
    if (r.ok === false) throw r.error;
    return r.value as unknown as Record<string, unknown>;
  };

  const aggregateArtifact = await maybeEmitAggregateSlice({
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature: feature ?? null,
    phase: phase ?? null,
    notes: notes ?? null,
    sourceProject,
    writeArtifact,
    computeSessionCost
  });

  return aggregateArtifact ? { slice: sliceArtifact, aggregate: aggregateArtifact } : sliceArtifact;
}
