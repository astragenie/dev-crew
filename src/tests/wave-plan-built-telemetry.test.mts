import { describe, expect, test } from "bun:test";
import { runWave } from "../scripts/lib/wave/runner.mjs";
import type { WaveConfig } from "../scripts/lib/wave/types.mjs";
import type { WaveEvent } from "../scripts/lib/wave/events.mjs";

// SLICE-182 (FEAT-276 AC-5): the plan_built event must carry the requested
// waveSize and a categorized rejection breakdown alongside the pre-existing
// size/rejectedCount fields, so downstream event consumers (not just the
// index.json / loop-snapshot sinks) can tell a solo-packed wave apart from
// a genuinely width-1 wave.

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

describe("runWave — plan_built telemetry (AC-5)", () => {
  test("plan_built carries waveSize + categorized rejection counts distinct from raw size/rejectedCount", async () => {
    const plan = {
      waveId: "WAVE-PLAN-BUILT",
      size: 1,
      items: [
        {
          sliceId: "SLICE-A",
          featureId: "FEAT-1",
          worktreeBranch: "wave/WAVE-PLAN-BUILT/SLICE-A",
          sliceCommand: "/crew:o"
        }
      ],
      rejected: [
        { sliceId: "SLICE-B", reason: "conflict_with_src/shared.mts" },
        { sliceId: "SLICE-C", reason: "missing_touches_files_solo_only" },
        { sliceId: "SLICE-D", reason: "missing_touches_files_solo_only" }
      ],
      // Requested 4, only packed 1 -- distinguishing this from a genuinely
      // width-1 wave is the entire point of AC-5.
      config: { waveSize: 4, sliceCommand: "/crew:o" }
    };
    const events: WaveEvent[] = [];
    await runWave("/tmp/fake-plan-built", {
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

    const planBuilt = events.find((e) => e.type === "plan_built") as
      | (WaveEvent & {
          size: number;
          rejectedCount: number;
          waveSize?: number;
          rejectedConflict?: number;
          rejectedMissingConfidence?: number;
          rejectedOther?: number;
        })
      | undefined;
    expect(planBuilt).toBeDefined();
    expect(planBuilt!.size).toBe(1);
    expect(planBuilt!.rejectedCount).toBe(3);
    expect(planBuilt!.waveSize).toBe(4);
    expect(planBuilt!.rejectedConflict).toBe(1);
    expect(planBuilt!.rejectedMissingConfidence).toBe(2);
    expect(planBuilt!.rejectedOther).toBe(0);
  });
});
