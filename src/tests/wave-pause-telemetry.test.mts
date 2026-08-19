// FEAT-275 / SLICE-178 — wave-mode dispatch pause telemetry wiring.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";

import { runWave } from "../scripts/lib/wave/runner.mjs";
import type { WaveConfig, WorktreeResult, SliceCandidate } from "../scripts/lib/wave/types.mjs";
import { pauseEventsPath } from "../scripts/lib/pause-telemetry.mjs";

const cfg: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:o",
  sliceCommandFallback: "/crew:b",
  fixCommand: "/crew:f",
  maxParallel: 3,
  dispatchTimeoutMs: 1000,
  postMergeTestCmd: "",
  maxWaveAttempts: 2,
  subagentType: "devcrew:fullstack-dev",
  artifactsRoot: ".claude/artifacts/loop/waves"
};

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readPauseLines(repo: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await fs.readFile(pauseEventsPath(repo), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function makePlan(waveId: string, sliceIds: string[]) {
  return {
    waveId,
    size: sliceIds.length,
    items: sliceIds.map((sliceId) => ({
      sliceId,
      featureId: `F-${sliceId}`,
      worktreeBranch: `wave/${waveId}/${sliceId}`,
      sliceCommand: "/crew:o"
    })),
    rejected: [],
    config: { waveSize: 3, sliceCommand: "/crew:o" }
  };
}

function baseDeps(
  repo: string,
  plan: ReturnType<typeof makePlan>,
  worktreeResults: WorktreeResult[],
  candidateLookupFn?: (sliceId: string) => SliceCandidate | undefined
) {
  return {
    gitStatusFn: async () => ({ clean: true }),
    stopCheckFn: async () => ({ shouldStop: false }),
    planFn: () => plan,
    prepareFn: async () => ({
      runId: "r1",
      agentBatch: plan.items.map((i) => ({
        sliceId: i.sliceId,
        worktreePath: `${repo}/wt/${i.sliceId}`,
        branch: i.worktreeBranch,
        prompt: "p"
      }))
    }),
    dispatchFn: async () => worktreeResults,
    finalizeFn: async () => ({
      merged: worktreeResults.filter((w) => w.status === "PASS").map((w) => w.branch),
      conflicts: [],
      failed: worktreeResults.filter((w) => w.status !== "PASS").map((w) => w.branch)
    }),
    postMergeTestFn: async () => ({ ran: true, status: "PASS" as const }),
    cfg,
    recordEventFn: () => {},
    ...(candidateLookupFn ? { candidateLookupFn } : {})
  };
}

describe("runWave — pause telemetry wiring (FEAT-275)", () => {
  test("records a completed dispatch outcome for a PASS result", async () => {
    const repo = await tmpRepo("wave-pt-pass-");
    const plan = makePlan("WAVE-PT1", ["SLICE-A"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-A",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-A`,
        status: "PASS",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.type).toBe("dispatch_outcome");
    expect(lines[0]!.outcome).toBe("completed");
    expect(lines[0]!.sliceId).toBe("SLICE-A");
    expect(lines[0]!.agentRole).toBe("devcrew:fullstack-dev");
  });

  test("records a completed dispatch outcome for a FAIL result (specialist finished, verdict was bad)", async () => {
    const repo = await tmpRepo("wave-pt-fail-");
    const plan = makePlan("WAVE-PT2", ["SLICE-B"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-B",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-B`,
        status: "FAIL",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.outcome).toBe("completed");
  });

  test("records a paused dispatch outcome + pause event for a timeout", async () => {
    const repo = await tmpRepo("wave-pt-timeout-");
    const plan = makePlan("WAVE-PT3", ["SLICE-C"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-C",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-C`,
        status: "timeout",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.type).toBe("dispatch_outcome");
    expect(lines[0]!.outcome).toBe("paused");
    expect(lines[1]!.type).toBe("pause_event");
    expect(lines[1]!.kind).toBe("pause");
    expect(lines[1]!.detection).toBe("no_artifact");
  });

  test("records a paused dispatch outcome + pause event for an agent_error", async () => {
    const repo = await tmpRepo("wave-pt-agenterr-");
    const plan = makePlan("WAVE-PT4", ["SLICE-D"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-D",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-D`,
        status: "agent_error",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.outcome).toBe("paused");
    expect(lines[1]!.kind).toBe("pause");
  });

  // FEAT-275 review finding #1: a retry-PASS after a prior pending_fix pivot
  // used to also emit a pause_event(kind="resume_success") — unpaired,
  // because the earlier failing attempt was recorded as "completed" (a FAIL)
  // or, on a different wave, its own standalone "pause" (timeout/agent_error)
  // with no guaranteed lineage link. That inflated summarizePauseRate's
  // resumeSuccessRate without bound. Fixed: a retry-PASS is now ALWAYS just
  // its own "completed" dispatch_outcome, with no pause_event at all,
  // regardless of whether the candidate carries pending_fix.
  test("records only a completed dispatch outcome for a PASS on a pending_fix retry — never an unpaired resume_success", async () => {
    const repo = await tmpRepo("wave-pt-resume-");
    const plan = makePlan("WAVE-PT5", ["SLICE-E"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-E",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-E`,
        status: "PASS",
        marker: {},
        artifacts: []
      }
    ];
    const candidate: SliceCandidate = {
      sliceId: "SLICE-E",
      featureId: "F-SLICE-E",
      slicePath: "",
      priority: "P2",
      compositeScore: 0,
      strategicFit: 0,
      touches: { paths: [], confidence: "missing" },
      pmRiskLevel: 0,
      autonomousSafe: true,
      retryCount: 1,
      pendingFix: true,
      dependsOn: [],
      helpRequestOpen: false
    };
    await runWave(
      repo,
      baseDeps(repo, plan, wts, () => candidate)
    );
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.type).toBe("dispatch_outcome");
    expect(lines[0]!.outcome).toBe("completed");
    expect(lines.some((l) => l.type === "pause_event")).toBe(false);
  });

  test("does not record a resume_success for a PASS when no pending_fix candidate is found", async () => {
    const repo = await tmpRepo("wave-pt-noresume-");
    const plan = makePlan("WAVE-PT6", ["SLICE-F"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-F",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-F`,
        status: "PASS",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.outcome).toBe("completed");
  });

  test("records one row per worktree result across a multi-slice wave", async () => {
    const repo = await tmpRepo("wave-pt-multi-");
    const plan = makePlan("WAVE-PT7", ["SLICE-G", "SLICE-H"]);
    const wts: WorktreeResult[] = [
      {
        sliceId: "SLICE-G",
        branch: plan.items[0]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-G`,
        status: "PASS",
        marker: {},
        artifacts: []
      },
      {
        sliceId: "SLICE-H",
        branch: plan.items[1]!.worktreeBranch,
        worktreePath: `${repo}/wt/SLICE-H`,
        status: "timeout",
        marker: {},
        artifacts: []
      }
    ];
    await runWave(repo, baseDeps(repo, plan, wts));
    const lines = await readPauseLines(repo);
    const outcomes = lines.filter((l) => l.type === "dispatch_outcome");
    expect(outcomes).toHaveLength(2);
    const bySlice = new Map(outcomes.map((o) => [o.sliceId, o.outcome]));
    expect(bySlice.get("SLICE-G")).toBe("completed");
    expect(bySlice.get("SLICE-H")).toBe("paused");
  });
});
