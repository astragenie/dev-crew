// src/tests/integration/wave-e2e.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runWave } from "../../scripts/lib/wave/runner.mjs";
import { loadCandidates, packWave } from "../../scripts/lib/wave/planner.mjs";
import { rankCandidates } from "../../scripts/lib/wave/ranking.mjs";
import { resolveWaveConfig } from "../../scripts/lib/wave/config.mjs";
import { writeWaveArtifacts } from "../../scripts/lib/wave/artifacts.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-e2e-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
  mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  mkdirSync(join(tmp, "src/scripts/lib"), { recursive: true });

  for (let i = 1; i <= 3; i++) {
    writeFileSync(
      join(tmp, `.claude/artifacts/loop/ai-loop/slices/pending/SLICE-${i}.md`),
      `---
id: SLICE-${i}
feature: FEAT-${i}
priority: P2
touches_files:
  - src/scripts/lib/file-${i}.mts
touches_files_confidence: declared
---
`,
      "utf8"
    );
    writeFileSync(
      join(tmp, `.claude/artifacts/loop/backlog/triaged/FEAT-${i}.md`),
      `---
id: FEAT-${i}
priority: P2
composite_score: 0.${9 - i}
pm_strategic_fit: 0.5
pm_risk_level: 0.1
autonomous_safe: true
---
`,
      "utf8"
    );
    writeFileSync(join(tmp, `src/scripts/lib/file-${i}.mts`), `// file ${i}\n`, "utf8");
  }
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("wave e2e (fully mocked dispatch)", () => {
  test("plans 3 disjoint slices, dispatch mocked PASS, finalize merges all 3, artifacts written", async () => {
    const cfg = resolveWaveConfig({});
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(3);
    const plan = packWave(rankCandidates(cands), {
      waveSize: cfg.size,
      sliceCommand: cfg.sliceCommand,
      waveId: "e2e-wave-1"
    });
    expect(plan.size).toBe(3);

    const outcome = await runWave(tmp, {
      gitStatusFn: async (_root) => ({ clean: true }),
      stopCheckFn: async (_root) => ({ shouldStop: false }),
      planFn: (_root) => plan,
      prepareFn: async (_root, _plan) => ({
        runId: "run-1",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: `e2e mock dispatch for ${i.sliceId}`
        }))
      }),
      dispatchFn: async (_batch, _cfg) =>
        plan.items.map((i) => ({
          sliceId: i.sliceId,
          branch: i.worktreeBranch,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          status: "PASS" as const,
          marker: { status: "PASS" },
          artifacts: []
        })),
      finalizeFn: async (_root, _runId, _plan) => ({
        merged: plan.items.map((i) => i.worktreeBranch),
        conflicts: [],
        failed: []
      }),
      postMergeTestFn: async (_root, _cmd) => ({
        ran: true,
        status: "PASS" as const,
        logPath: "log"
      }),
      cfg
    });

    expect(outcome.haltReason).toBeNull();
    expect(outcome.mergedBranches).toHaveLength(3);
    expect(outcome.failurePivots).toHaveLength(0);

    writeWaveArtifacts(tmp, outcome, cfg.artifactsRoot);
    expect(existsSync(join(tmp, ".claude/artifacts/loop/waves/e2e-wave-1/plan.json"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/artifacts/loop/waves/e2e-wave-1/wave-result.json"))).toBe(
      true
    );
  });

  test("one slice FAIL produces pivot; other two merge", async () => {
    const cfg = resolveWaveConfig({});
    const cands = loadCandidates(tmp);
    const plan = packWave(rankCandidates(cands), {
      waveSize: cfg.size,
      sliceCommand: cfg.sliceCommand,
      waveId: "e2e-wave-2"
    });

    const outcome = await runWave(tmp, {
      gitStatusFn: async (_root) => ({ clean: true }),
      stopCheckFn: async (_root) => ({ shouldStop: false }),
      planFn: (_root) => plan,
      prepareFn: async (_root, _plan) => ({
        runId: "run-2",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: `e2e mock dispatch for ${i.sliceId}`
        }))
      }),
      dispatchFn: async (_batch, _cfg) =>
        plan.items.map((i, idx) => ({
          sliceId: i.sliceId,
          branch: i.worktreeBranch,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          status: idx === 0 ? ("FAIL" as const) : ("PASS" as const),
          marker: {},
          artifacts: idx === 0 ? [`.claude/artifacts/crew/handoffs/${i.sliceId}-fail.md`] : []
        })),
      finalizeFn: async (_root, _runId, _plan) => ({
        merged: plan.items.slice(1).map((i) => i.worktreeBranch),
        conflicts: [],
        failed: [plan.items[0]!.worktreeBranch]
      }),
      postMergeTestFn: async (_root, _cmd) => ({
        ran: true,
        status: "PASS" as const,
        logPath: "log"
      }),
      cfg
    });

    expect(outcome.mergedBranches).toHaveLength(2);
    expect(outcome.failurePivots).toHaveLength(1);
    expect(outcome.failurePivots[0]!.fixDispatchPrompt).toContain("/crew:fix");
  });
});
