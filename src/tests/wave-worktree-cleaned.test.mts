import { describe, expect, test } from "bun:test";
import { runWave } from "../scripts/lib/wave/runner.mjs";
import type { WaveConfig, WorktreeResult } from "../scripts/lib/wave/types.mjs";
import type { WaveEvent } from "../scripts/lib/wave/events.mjs";

const cfg: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:o",
  sliceCommandFallback: "/crew:b",
  fixCommand: "/crew:f",
  maxParallel: 3,
  dispatchTimeoutMs: 1000,
  postMergeTestCmd: "",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves"
};

describe("runWave — worktree_cleaned emission", () => {
  test("emits worktree_cleaned status=ok for each merged branch", async () => {
    const plan = {
      waveId: "WAVE-WTC",
      size: 2,
      items: [
        {
          sliceId: "SLICE-A",
          featureId: "F1",
          worktreeBranch: "wave/WAVE-WTC/SLICE-A",
          sliceCommand: "/crew:o"
        },
        {
          sliceId: "SLICE-B",
          featureId: "F2",
          worktreeBranch: "wave/WAVE-WTC/SLICE-B",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-A",
        branch: "wave/WAVE-WTC/SLICE-A",
        worktreePath: "/wt/SLICE-A",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      },
      {
        sliceId: "SLICE-B",
        branch: "wave/WAVE-WTC/SLICE-B",
        worktreePath: "/wt/SLICE-B",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      }
    ];
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-wtc", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "r1",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: "p"
        }))
      }),
      dispatchFn: async () => wts,
      finalizeFn: async () => ({
        merged: ["wave/WAVE-WTC/SLICE-A", "wave/WAVE-WTC/SLICE-B"],
        conflicts: [],
        failed: []
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    const wtcEvents = events.filter((e) => e.type === "worktree_cleaned");
    expect(wtcEvents).toHaveLength(2);
    type Wtc = { sliceId: string; branch: string; path: string; status: string };
    const byBranch = new Map<string, Wtc>(
      wtcEvents.map((e) => {
        const w = e as unknown as Wtc;
        return [w.branch, w];
      })
    );
    const a = byBranch.get("wave/WAVE-WTC/SLICE-A")!;
    expect(a.sliceId).toBe("SLICE-A");
    expect(a.path).toBe("/wt/SLICE-A");
    expect(a.status).toBe("ok");
    const b = byBranch.get("wave/WAVE-WTC/SLICE-B")!;
    expect(b.status).toBe("ok");
  });

  test("emits worktree_cleaned status=skipped for failed/conflicted branches", async () => {
    const plan = {
      waveId: "WAVE-WTC2",
      size: 2,
      items: [
        {
          sliceId: "SLICE-X",
          featureId: "F1",
          worktreeBranch: "wave/WAVE-WTC2/SLICE-X",
          sliceCommand: "/crew:o"
        },
        {
          sliceId: "SLICE-Y",
          featureId: "F2",
          worktreeBranch: "wave/WAVE-WTC2/SLICE-Y",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-X",
        branch: "wave/WAVE-WTC2/SLICE-X",
        worktreePath: "/wt/SLICE-X",
        status: "FAIL",
        marker: { status: "FAIL" },
        artifacts: []
      },
      {
        sliceId: "SLICE-Y",
        branch: "wave/WAVE-WTC2/SLICE-Y",
        worktreePath: "/wt/SLICE-Y",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      }
    ];
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-wtc2", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "r2",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: "p"
        }))
      }),
      dispatchFn: async () => wts,
      finalizeFn: async () => ({
        merged: ["wave/WAVE-WTC2/SLICE-Y"],
        conflicts: ["wave/WAVE-WTC2/SLICE-X"],
        failed: []
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    const wtcEvents = events.filter((e) => e.type === "worktree_cleaned");
    expect(wtcEvents).toHaveLength(2);
    type Wtc = { sliceId: string; branch: string; path: string; status: string };
    const byBranch = new Map<string, Wtc>(
      wtcEvents.map((e) => {
        const w = e as unknown as Wtc;
        return [w.branch, w];
      })
    );
    expect(byBranch.get("wave/WAVE-WTC2/SLICE-Y")!.status).toBe("ok");
    expect(byBranch.get("wave/WAVE-WTC2/SLICE-X")!.status).toBe("skipped");
  });
});
