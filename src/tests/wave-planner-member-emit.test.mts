import { describe, expect, test } from "bun:test";
import { runWave } from "../scripts/lib/wave/runner.mjs";
import type { WaveConfig } from "../scripts/lib/wave/types.mjs";
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

describe("runWave — wave_member_slice emission", () => {
  test("emits one wave_member_slice per packed slice with 0-based position", async () => {
    const plan = {
      waveId: "WAVE-MEMBER",
      size: 3,
      items: [
        {
          sliceId: "SLICE-A",
          featureId: "FEAT-1",
          worktreeBranch: "wave/WAVE-MEMBER/SLICE-A",
          sliceCommand: "/crew:o"
        },
        {
          sliceId: "SLICE-B",
          featureId: "FEAT-2",
          worktreeBranch: "wave/WAVE-MEMBER/SLICE-B",
          sliceCommand: "/crew:o"
        },
        {
          sliceId: "SLICE-C",
          featureId: "FEAT-3",
          worktreeBranch: "wave/WAVE-MEMBER/SLICE-C",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" }
    };
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-member-emit", {
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
      dispatchFn: async () =>
        plan.items.map((i) => ({
          sliceId: i.sliceId,
          branch: i.worktreeBranch,
          worktreePath: `/wt/${i.sliceId}`,
          status: "PASS" as const,
          marker: { status: "PASS" },
          artifacts: []
        })),
      finalizeFn: async () => ({
        merged: plan.items.map((i) => i.worktreeBranch),
        conflicts: [],
        failed: []
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    const memberEvents = events.filter((e) => e.type === "wave_member_slice");
    expect(memberEvents).toHaveLength(3);
    expect(memberEvents.map((e) => (e as { sliceId: string }).sliceId)).toEqual([
      "SLICE-A",
      "SLICE-B",
      "SLICE-C"
    ]);
    expect(memberEvents.map((e) => (e as { position: number }).position)).toEqual([0, 1, 2]);
    // Should land between plan_built and wave_dispatched.
    const planBuiltIdx = events.findIndex((e) => e.type === "plan_built");
    const dispatchedIdx = events.findIndex((e) => e.type === "wave_dispatched");
    expect(planBuiltIdx).toBeGreaterThanOrEqual(0);
    expect(dispatchedIdx).toBeGreaterThanOrEqual(0);
    for (const m of memberEvents) {
      const i = events.indexOf(m);
      expect(i).toBeGreaterThan(planBuiltIdx);
      expect(i).toBeLessThan(dispatchedIdx);
    }
  });

  test("emits no wave_member_slice when wave is empty (backlog_exhausted)", async () => {
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-empty", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => ({
        waveId: "EMPTY",
        size: 0,
        items: [],
        rejected: [],
        config: { waveSize: 3, sliceCommand: "/crew:o" }
      }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg,
      recordEventFn: (e) => events.push(e)
    });
    expect(events.filter((e) => e.type === "wave_member_slice")).toHaveLength(0);
  });
});
