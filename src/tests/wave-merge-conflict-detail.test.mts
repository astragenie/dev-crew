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

describe("runWave — merge_conflict_detail emission", () => {
  test("emits merge_conflict_detail for each conflicted branch", async () => {
    const plan = {
      waveId: "WAVE-MCD",
      size: 2,
      items: [
        {
          sliceId: "SLICE-X",
          featureId: "F1",
          worktreeBranch: "wave/WAVE-MCD/SLICE-X",
          sliceCommand: "/crew:o"
        },
        {
          sliceId: "SLICE-Y",
          featureId: "F2",
          worktreeBranch: "wave/WAVE-MCD/SLICE-Y",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-X",
        branch: "wave/WAVE-MCD/SLICE-X",
        worktreePath: "/wt/SLICE-X",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      },
      {
        sliceId: "SLICE-Y",
        branch: "wave/WAVE-MCD/SLICE-Y",
        worktreePath: "/wt/SLICE-Y",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: []
      }
    ];
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-mcd", {
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
        merged: [],
        conflicts: ["wave/WAVE-MCD/SLICE-X", "wave/WAVE-MCD/SLICE-Y"],
        failed: []
      }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    const mcdEvents = events.filter((e) => e.type === "merge_conflict_detail");
    expect(mcdEvents).toHaveLength(2);
    type Mcd = { sliceId: string; conflictedPaths: string[] };
    const slices = mcdEvents.map((e) => (e as unknown as Mcd).sliceId).sort();
    expect(slices).toEqual(["SLICE-X", "SLICE-Y"]);
    // M2 emits minimal payload — paths/shas surface in a later milestone
    // once auto-merge exposes structured conflict info.
    for (const e of mcdEvents) {
      const m = e as unknown as Mcd;
      expect(m.conflictedPaths).toEqual([]);
    }
  });

  test("emits no merge_conflict_detail when no conflicts", async () => {
    const plan = {
      waveId: "WAVE-CLEAN",
      size: 1,
      items: [
        {
          sliceId: "SLICE-OK",
          featureId: "F1",
          worktreeBranch: "wave/WAVE-CLEAN/SLICE-OK",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-clean", {
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
      dispatchFn: async () => [
        {
          sliceId: "SLICE-OK",
          branch: "wave/WAVE-CLEAN/SLICE-OK",
          worktreePath: "/wt/SLICE-OK",
          status: "PASS" as const,
          marker: { status: "PASS" },
          artifacts: []
        }
      ],
      finalizeFn: async () => ({
        merged: ["wave/WAVE-CLEAN/SLICE-OK"],
        conflicts: [],
        failed: []
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    expect(events.filter((e) => e.type === "merge_conflict_detail")).toHaveLength(0);
  });
});
