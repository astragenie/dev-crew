// src/tests/wave/runner.test.mts
import { describe, expect, test } from "bun:test";
import { loopWaves, runWave } from "../../scripts/lib/wave/runner.mjs";
import type { WaveConfig, WorktreeResult } from "../../scripts/lib/wave/types.mjs";

const cfg: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:o",
  sliceCommandFallback: "/crew:b",
  fixCommand: "/crew:f",
  maxParallel: 3,
  dispatchTimeoutMs: 1,
  postMergeTestCmd: "",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: "x"
};

describe("runWave pre-flight", () => {
  test("halts with dirty_main when git status reports modifications", async () => {
    const r = await runWave("/tmp/fake-dirty-repo", {
      gitStatusFn: async () => ({ clean: false }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => ({
        waveId: "w",
        size: 1,
        items: [],
        rejected: [],
        config: { waveSize: 3, sliceCommand: "/crew:o" }
      }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg
    });
    expect(r.haltReason).toBe("dirty_main");
  });

  test("halts with backlog_exhausted when plan size is 0", async () => {
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => ({
        waveId: "w",
        size: 0,
        items: [],
        rejected: [],
        config: { waveSize: 3, sliceCommand: "/crew:o" }
      }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg
    });
    expect(r.haltReason).toBe("backlog_exhausted");
  });

  test("halts with stop_check_fired when stop-check returns shouldStop", async () => {
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({
        shouldStop: true,
        reason: "marathon_checkpoint_required",
        severity: "error" as const
      }),
      planFn: () => ({
        waveId: "w",
        size: 1,
        items: [],
        rejected: [],
        config: { waveSize: 3, sliceCommand: "/crew:o" }
      }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg
    });
    expect(r.haltReason).toBe("stop_check_fired");
  });
});

describe("runWave failure pivots", () => {
  test("FAIL worktree produces a FailurePivot in result; PASS items still merge", async () => {
    const plan = {
      waveId: "w-mixed",
      size: 2,
      items: [
        {
          sliceId: "S1",
          featureId: "F1",
          worktreeBranch: "wave/w-mixed/S1",
          sliceCommand: "/crew:o",
          dispatchPrompt: "p1"
        },
        {
          sliceId: "S2",
          featureId: "F2",
          worktreeBranch: "wave/w-mixed/S2",
          sliceCommand: "/crew:o",
          dispatchPrompt: "p2"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const wts: WorktreeResult[] = [
      {
        sliceId: "S1",
        branch: "wave/w-mixed/S1",
        worktreePath: "/wt/S1",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      },
      {
        sliceId: "S2",
        branch: "wave/w-mixed/S2",
        worktreePath: "/wt/S2",
        status: "FAIL",
        marker: { status: "FAIL" },
        artifacts: [".claude/artifacts/crew/handoffs/S2-fail.md"]
      }
    ];
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "r1",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: i.dispatchPrompt
        }))
      }),
      dispatchFn: async () => wts,
      finalizeFn: async () => ({
        merged: ["wave/w-mixed/S1"],
        conflicts: [],
        failed: ["wave/w-mixed/S2"]
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const, logPath: "log" }),
      cfg
    });
    expect(r.haltReason).toBeNull();
    expect(r.mergedBranches).toEqual(["wave/w-mixed/S1"]);
    expect(r.failedBranches).toEqual(["wave/w-mixed/S2"]);
    expect(r.failurePivots).toHaveLength(1);
    expect(r.failurePivots[0]!.sliceId).toBe("S2");
    expect(r.failurePivots[0]!.failureKind).toBe("worktree_fail");
  });
});

describe("runWave dispatch timeout", () => {
  test("dispatch hang produces agent_error per worktree, finalize still runs", async () => {
    const plan = {
      waveId: "w-timeout",
      size: 1,
      items: [
        {
          sliceId: "S1",
          featureId: "F1",
          worktreeBranch: "wave/w-timeout/S1",
          sliceCommand: "/crew:o",
          dispatchPrompt: "p1"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const tinyTimeoutCfg = { ...cfg, dispatchTimeoutMs: 10 };
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "r-timeout",
        agentBatch: [
          {
            sliceId: "S1",
            worktreePath: "/wt/S1",
            branch: "wave/w-timeout/S1",
            prompt: "p1"
          }
        ]
      }),
      dispatchFn: () => new Promise(() => {}), // never resolves
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: ["wave/w-timeout/S1"] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg: tinyTimeoutCfg
    });
    expect(r.worktreeResults).toHaveLength(1);
    expect(r.worktreeResults[0]!.status).toBe("agent_error");
    expect(r.failurePivots).toHaveLength(1);
    expect(r.failurePivots[0]!.failureKind).toBe("agent_error");
  });
});

describe("loopWaves", () => {
  test("halts immediately on backlog_exhausted", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: "w",
          plan: {
            waveId: "w",
            size: 0,
            items: [],
            rejected: [],
            config: { waveSize: 3, sliceCommand: "/c" }
          },
          worktreeResults: [],
          mergedBranches: [],
          failedBranches: [],
          postMergeTest: { ran: false, status: "skipped" as const },
          failurePivots: [],
          durationMs: 0,
          haltReason: "backlog_exhausted"
        };
      },
      maxIterations: 25,
      maxWaves: undefined
    });
    expect(calls).toBe(1);
    expect(r.haltReason).toBe("backlog_exhausted");
    expect(r.wavesRun).toBe(1);
  });

  test("runs until maxWaves cap", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: `w-${calls}`,
          plan: {
            waveId: `w-${calls}`,
            size: 1,
            items: [],
            rejected: [],
            config: { waveSize: 3, sliceCommand: "/c" }
          },
          worktreeResults: [],
          mergedBranches: ["x"],
          failedBranches: [],
          postMergeTest: { ran: true, status: "PASS" as const },
          failurePivots: [],
          durationMs: 0,
          haltReason: null
        };
      },
      maxIterations: 100,
      maxWaves: 3
    });
    expect(r.wavesRun).toBe(3);
    expect(r.haltReason).toBe("max_waves");
  });

  test("halts on post_merge_red", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: `w-${calls}`,
          plan: {
            waveId: `w-${calls}`,
            size: 1,
            items: [],
            rejected: [],
            config: { waveSize: 3, sliceCommand: "/c" }
          },
          worktreeResults: [],
          mergedBranches: ["x"],
          failedBranches: [],
          postMergeTest: { ran: true, status: "FAIL" as const, logPath: "log" },
          failurePivots: [],
          durationMs: 0,
          haltReason: "post_merge_red"
        };
      },
      maxIterations: 100,
      maxWaves: 10
    });
    expect(r.wavesRun).toBe(1);
    expect(r.haltReason).toBe("post_merge_red");
  });
});
