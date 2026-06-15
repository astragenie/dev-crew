// src/scripts/lib/wave/runner.mts
// Wave runner skeleton. Pre-flight + plan + halt detection only — the rest
// of the lifecycle (failure pivot integration + loopWaves) lands in later
// tasks. All side-effecting steps are taken via injected dependencies so
// the runner is unit-testable.

import { buildFailurePivot } from "./failure-pivot.mjs";
import { appendWaveEvent, type WaveEvent } from "./events.mjs";
import type {
  FailurePivot,
  SliceCandidate,
  WaveConfig,
  WavePlan,
  WaveResult,
  WorktreeResult
} from "./types.mjs";

export type GitStatus = { clean: boolean };

export type StopCheckResult = {
  shouldStop: boolean;
  reason?: string;
  severity?: "info" | "warn" | "error" | "escalation";
};

export type PrepareResult = {
  runId: string;
  agentBatch: Array<{
    sliceId: string;
    worktreePath: string;
    branch: string;
    prompt: string;
  }>;
};

export type FinalizeResult = {
  merged: string[];
  conflicts: string[];
  failed: string[];
};

export type RunWaveDeps = {
  gitStatusFn: (repoRoot: string) => Promise<GitStatus>;
  stopCheckFn: (repoRoot: string) => Promise<StopCheckResult>;
  planFn: (repoRoot: string) => WavePlan;
  prepareFn: (repoRoot: string, plan: WavePlan) => Promise<PrepareResult>;
  dispatchFn: (batch: PrepareResult["agentBatch"], cfg: WaveConfig) => Promise<WorktreeResult[]>;
  finalizeFn: (repoRoot: string, runId: string, plan: WavePlan) => Promise<FinalizeResult>;
  postMergeTestFn: (
    repoRoot: string,
    cmd: string
  ) => Promise<{
    ran: boolean;
    status: "PASS" | "FAIL" | "skipped";
    logPath?: string;
  }>;
  cfg: WaveConfig;
  candidateLookupFn?: (sliceId: string) => SliceCandidate | undefined;
  /**
   * Optional event sink for wave-level trajectory events. Defaults to
   * appending to `.claude/artifacts/loop/waves/<waveId>/events.jsonl`.
   * Tests can inject a noop to avoid disk side effects.
   */
  recordEventFn?: (event: WaveEvent) => void;
};

export type RunWaveOutcome = WaveResult & {
  haltReason: string | null;
};

function defaultRecordEvent(repoRoot: string, artifactsRoot: string): (event: WaveEvent) => void {
  return (event) => {
    // Fire-and-forget — telemetry write must not block the wave runner.
    // appendWaveEvent is fail-silent on both JSONL write + webhook fanout.
    void appendWaveEvent(repoRoot, artifactsRoot, event);
  };
}

export async function runWave(repoRoot: string, deps: RunWaveDeps): Promise<RunWaveOutcome> {
  const t0 = Date.now();
  const record = deps.recordEventFn ?? defaultRecordEvent(repoRoot, deps.cfg.artifactsRoot);

  const status = await deps.gitStatusFn(repoRoot);
  if (!status.clean) {
    return makeOutcome(t0, "dirty_main");
  }

  const sc = await deps.stopCheckFn(repoRoot);
  if (sc.shouldStop) {
    return makeOutcome(t0, "stop_check_fired");
  }

  const plan = deps.planFn(repoRoot);
  if (plan.size === 0) {
    return makeOutcome(t0, "backlog_exhausted", plan);
  }

  // From here we have a real waveId → emit lifecycle events.
  record({ type: "wave_started", waveId: plan.waveId, timestamp: new Date().toISOString() });
  record({
    type: "plan_built",
    waveId: plan.waveId,
    timestamp: new Date().toISOString(),
    size: plan.size,
    rejectedCount: plan.rejected.length
  });

  // M2 (L2-1): emit one wave_member_slice per packed slice so downstream
  // dashboards can render wave-membership before dispatch runs.
  plan.items.forEach((item, idx) => {
    record({
      type: "wave_member_slice",
      waveId: plan.waveId,
      sliceId: item.sliceId,
      position: idx,
      timestamp: new Date().toISOString()
    });
  });

  const prepared = await deps.prepareFn(repoRoot, plan);
  record({
    type: "wave_dispatched",
    waveId: plan.waveId,
    timestamp: new Date().toISOString(),
    runId: prepared.runId,
    sliceIds: plan.items.map((i) => i.sliceId)
  });

  const worktreeResults = await dispatchWithTimeout(deps.dispatchFn, prepared.agentBatch, deps.cfg);
  const finalize = await deps.finalizeFn(repoRoot, prepared.runId, plan);
  record({
    type: "wave_finalized",
    waveId: plan.waveId,
    timestamp: new Date().toISOString(),
    merged: finalize.merged,
    conflicts: finalize.conflicts,
    failed: finalize.failed
  });

  // M2 (L2-2): emit worktree_cleaned per slice. Merged branches had their
  // worktree removed by `dispatch finalize → mergeChildren → removeChildWorktree`
  // (status=ok). Failed / conflicted branches retain their worktrees for
  // operator inspection (status=skipped).
  const mergedSet = new Set(finalize.merged);
  for (const wr of worktreeResults) {
    const status: "ok" | "skipped" = mergedSet.has(wr.branch) ? "ok" : "skipped";
    record({
      type: "worktree_cleaned",
      waveId: plan.waveId,
      sliceId: wr.sliceId,
      branch: wr.branch,
      path: wr.worktreePath,
      status,
      timestamp: new Date().toISOString()
    });
  }

  const postMergeTest = await deps.postMergeTestFn(repoRoot, deps.cfg.postMergeTestCmd);
  record({
    type: "post_merge_test",
    waveId: plan.waveId,
    timestamp: new Date().toISOString(),
    status: postMergeTest.status
  });

  const haltReason = postMergeTest.status === "FAIL" ? "post_merge_red" : null;
  const failurePivots = buildPivotsForWave(plan, worktreeResults, finalize, deps);
  if (failurePivots.length > 0) {
    record({
      type: "wave_pivoted",
      waveId: plan.waveId,
      timestamp: new Date().toISOString(),
      pivots: failurePivots.map((p) => ({ sliceId: p.sliceId, kind: p.failureKind }))
    });
  }

  const durationMs = Date.now() - t0;
  record({
    type: "wave_completed",
    waveId: plan.waveId,
    timestamp: new Date().toISOString(),
    haltReason,
    durationMs,
    passCount: finalize.merged.length,
    failCount: finalize.failed.length + finalize.conflicts.length
  });

  const result: RunWaveOutcome = {
    waveId: plan.waveId,
    plan,
    worktreeResults,
    mergedBranches: finalize.merged,
    failedBranches: [...finalize.failed, ...finalize.conflicts],
    postMergeTest,
    failurePivots,
    durationMs,
    haltReason
  };
  return result;
}

function makeOutcome(t0: number, haltReason: string, plan?: WavePlan): RunWaveOutcome {
  const emptyPlan: WavePlan = plan ?? {
    waveId: "n/a",
    size: 0,
    items: [],
    rejected: [],
    config: { waveSize: 0, sliceCommand: "" }
  };
  return {
    waveId: emptyPlan.waveId,
    plan: emptyPlan,
    worktreeResults: [],
    mergedBranches: [],
    failedBranches: [],
    postMergeTest: { ran: false, status: "skipped" },
    failurePivots: [],
    durationMs: Date.now() - t0,
    haltReason
  };
}

function buildPivotsForWave(
  plan: WavePlan,
  worktreeResults: WorktreeResult[],
  finalize: FinalizeResult,
  deps: RunWaveDeps
): FailurePivot[] {
  const pivots: FailurePivot[] = [];
  for (const wr of worktreeResults) {
    const isFail = wr.status === "FAIL" || wr.status === "timeout" || wr.status === "agent_error";
    const isMergeConflict = finalize.conflicts.includes(wr.branch);
    if (!isFail && !isMergeConflict) continue;
    const slice = deps.candidateLookupFn?.(wr.sliceId) ?? defaultCandidate(wr.sliceId, plan);
    pivots.push(
      buildFailurePivot(wr, { conflicts: finalize.conflicts }, slice, plan.waveId, deps.cfg)
    );
  }
  return pivots;
}

async function dispatchWithTimeout(
  fn: RunWaveDeps["dispatchFn"],
  batch: PrepareResult["agentBatch"],
  cfg: WaveConfig
): Promise<WorktreeResult[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<WorktreeResult[]>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`wave dispatch timeout after ${cfg.dispatchTimeoutMs}ms`)),
      cfg.dispatchTimeoutMs
    );
  });
  try {
    return await Promise.race([fn(batch, cfg), timeout]);
  } catch (err) {
    if (err instanceof Error && err.message.includes("wave dispatch timeout")) {
      return batch.map((b) => ({
        sliceId: b.sliceId,
        branch: b.branch,
        worktreePath: b.worktreePath,
        status: "agent_error" as const,
        marker: { error: err.message },
        artifacts: []
      }));
    }
    throw err;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function defaultCandidate(sliceId: string, plan: WavePlan): SliceCandidate {
  const item = plan.items.find((i) => i.sliceId === sliceId);
  return {
    sliceId,
    featureId: item?.featureId ?? "",
    slicePath: "",
    priority: "P3",
    compositeScore: 0,
    strategicFit: 0,
    touches: { paths: [], confidence: "missing" },
    pmRiskLevel: 0,
    autonomousSafe: false,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false
  };
}

export type LoopWavesDeps = {
  runWaveFn: () => Promise<RunWaveOutcome>;
  maxIterations: number;
  maxWaves: number | undefined;
};

export type LoopWavesOutcome = {
  wavesRun: number;
  haltReason: string;
  lastWave: RunWaveOutcome | null;
};

export async function loopWaves(_repoRoot: string, deps: LoopWavesDeps): Promise<LoopWavesOutcome> {
  let last: RunWaveOutcome | null = null;
  for (let i = 0; i < deps.maxIterations; i++) {
    if (deps.maxWaves !== undefined && i >= deps.maxWaves) {
      return { wavesRun: i, haltReason: "max_waves", lastWave: last };
    }
    last = await deps.runWaveFn();
    if (last.haltReason !== null) {
      return { wavesRun: i + 1, haltReason: last.haltReason, lastWave: last };
    }
  }
  return { wavesRun: deps.maxIterations, haltReason: "max_iterations", lastWave: last };
}
