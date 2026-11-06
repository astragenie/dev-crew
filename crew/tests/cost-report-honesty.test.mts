// FEAT-025 (SLICE-50): telemetry honesty for cost reports.
//
// AC-1: emitCostReport refuses {written:false, reason} when
//       sessionsScanned === 0, or the window is wider than maxWindowHours
//       (default 24, overridable via allowWideWindow), or the same run_id
//       with identical totals would be written twice.
// AC-2: an unpriced model flips the cost-advisor verdict to "unknown" and
//       is rendered into the cost-report frontmatter.

import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { writeArtifact } from "../scripts/lib/artifacts/write.mjs";
import { decideCostVerdict } from "../scripts/lib/cost-hygiene/decide.mjs";
import type { CostBreakdown } from "../scripts/lib/artifacts/types.mjs";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "hero-crew-cost-honesty-test-"));
}

async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

async function writeWorkflowState(
  tmpDir: string,
  currentRun: Record<string, unknown>
): Promise<void> {
  const stateDir = path.join(tmpDir, ".claude", "state", "crew");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(
    path.join(stateDir, "workflow-state.json"),
    JSON.stringify(
      { version: "1.0", updatedAt: new Date().toISOString(), currentRun, recentRuns: [] },
      null,
      2
    )
  );
}

async function withIsolatedProjectsRoot<T>(
  tmpDir: string,
  fn: (projectsRoot: string) => Promise<T>
): Promise<T> {
  const original = process.env["CREW_PROJECTS_ROOT"];
  try {
    const emptyProjectsRoot = path.join(tmpDir, "isolated-projects-root");
    await fs.mkdir(emptyProjectsRoot, { recursive: true });
    process.env["CREW_PROJECTS_ROOT"] = emptyProjectsRoot;
    return await fn(emptyProjectsRoot);
  } finally {
    if (original === undefined) delete process.env["CREW_PROJECTS_ROOT"];
    else process.env["CREW_PROJECTS_ROOT"] = original;
  }
}

async function seedFixtureSession(
  projectsRoot: string,
  repoPath: string,
  timestampIso: string,
  model = "claude-sonnet-5"
): Promise<void> {
  const { slugifyRepoPath } = await import("../scripts/lib/session-cost.mjs");
  const projectDir = path.join(projectsRoot, slugifyRepoPath(repoPath));
  await fs.mkdir(projectDir, { recursive: true });
  const line = JSON.stringify({
    type: "assistant",
    timestamp: timestampIso,
    message: { model, usage: { input_tokens: 100, output_tokens: 50 }, content: [] }
  });
  await fs.writeFile(path.join(projectDir, "session-1.jsonl"), line + "\n", "utf8");
}

async function listCostDir(dir: string): Promise<string[]> {
  const costDir = path.join(dir, ".claude", "artifacts", "crew", "cost");
  try {
    return (await fs.readdir(costDir)).filter((e) => e.endsWith(".md"));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// AC-1
// ---------------------------------------------------------------------------

test("AC-1: emitCostReport refuses {written:false, reason} when sessionsScanned === 0", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async () => {
      const now = new Date().toISOString();
      await writeWorkflowState(tmpDir, { title: "zero-sessions", startedAt: now, updatedAt: now });
      const { maybeEmitCostReport } = await import(
        "../scripts/lib/cost-hygiene/emit-cost-report.mjs"
      );
      const result = (await maybeEmitCostReport(tmpDir, { runTitle: "zero-sessions" })) as Record<
        string,
        unknown
      >;
      expect(result.written).toBe(false);
      expect(result.reason).toBe("sessions_scanned_zero");
      expect(await listCostDir(tmpDir)).toEqual([]);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1: emitCostReport refuses a window wider than maxWindowHours (default 24) even with sessions present", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await writeWorkflowState(tmpDir, {
        title: "wide-window",
        startedAt: eightDaysAgo,
        updatedAt: eightDaysAgo
      });
      // A real session exists, but it's still outside the honesty gate.
      await seedFixtureSession(projectsRoot, tmpDir, eightDaysAgo);
      const { maybeEmitCostReport } = await import(
        "../scripts/lib/cost-hygiene/emit-cost-report.mjs"
      );
      const result = (await maybeEmitCostReport(tmpDir, { runTitle: "wide-window" })) as Record<
        string,
        unknown
      >;
      expect(result.written).toBe(false);
      expect(result.reason).toBe("window_too_wide");
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1: --allow-wide-window (allowWideWindow option) lifts the window refusal", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await writeWorkflowState(tmpDir, {
        title: "wide-window-allowed",
        startedAt: eightDaysAgo,
        updatedAt: eightDaysAgo
      });
      await seedFixtureSession(projectsRoot, tmpDir, eightDaysAgo);
      const { maybeEmitCostReport } = await import(
        "../scripts/lib/cost-hygiene/emit-cost-report.mjs"
      );
      const result = (await maybeEmitCostReport(tmpDir, {
        runTitle: "wide-window-allowed",
        allowWideWindow: true
      })) as Record<string, unknown>;
      expect(result.written).not.toBe(false);
      expect(await listCostDir(tmpDir)).not.toEqual([]);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1: a repeated run_id with identical totals is refused as a duplicate", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      await writeWorkflowState(tmpDir, {
        title: "dup-run-id",
        runId: "fixed-run-id-123",
        startedAt: fiveMinAgo,
        updatedAt: fiveMinAgo
      });
      await seedFixtureSession(projectsRoot, tmpDir, now.toISOString());
      const { maybeEmitCostReport } = await import(
        "../scripts/lib/cost-hygiene/emit-cost-report.mjs"
      );
      const first = (await maybeEmitCostReport(tmpDir, { runTitle: "dup-run-id" })) as Record<
        string,
        unknown
      >;
      expect(first.written).not.toBe(false);
      const filesAfterFirst = await listCostDir(tmpDir);
      expect(filesAfterFirst.length).toBeGreaterThan(0);

      // Same run_id, same window/totals -> the second call must be refused.
      const second = (await maybeEmitCostReport(tmpDir, { runTitle: "dup-run-id" })) as Record<
        string,
        unknown
      >;
      expect(second.written).toBe(false);
      expect(second.reason).toBe("duplicate run_id");
      const filesAfterSecond = await listCostDir(tmpDir);
      expect(filesAfterSecond.length).toBe(filesAfterFirst.length);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// AC-1, loop path: costSliceHandler (src/scripts/lib/slice-linker/
// crew-bridge.mts -> costSliceHandler) is the autonomous loop's actual
// slice-close route and historically had none of the AC-1 guards (SLICE-50
// review B blocker). These cases drive costSliceHandler directly to prove
// the shared guard (cost-report-guard.mjs) now applies there too.
// ---------------------------------------------------------------------------

test("AC-1 loop path: costSliceHandler refuses when sessionsScanned === 0", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async () => {
      const { costSliceHandler } = await import(
        "../scripts/lib/cost-hygiene/cost-slice-handler.mjs"
      );
      const now = new Date().toISOString();
      const result = (await costSliceHandler({
        repoPath: tmpDir,
        flags: { startedAt: now, completedAt: now, runTitle: "loop-zero-sessions" }
      })) as Record<string, unknown>;
      expect(result.written).toBe(false);
      expect(result.reason).toBe("sessions_scanned_zero");
      expect(await listCostDir(tmpDir)).toEqual([]);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1 loop path: costSliceHandler refuses a window wider than maxWindowHours without --allow-wide-window", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const { costSliceHandler } = await import(
        "../scripts/lib/cost-hygiene/cost-slice-handler.mjs"
      );
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      await seedFixtureSession(projectsRoot, tmpDir, eightDaysAgo);
      const result = (await costSliceHandler({
        repoPath: tmpDir,
        flags: { startedAt: eightDaysAgo, completedAt: now, runTitle: "loop-wide-window" }
      })) as Record<string, unknown>;
      expect(result.written).toBe(false);
      expect(result.reason).toBe("window_too_wide");
      expect(await listCostDir(tmpDir)).toEqual([]);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1 loop path: costSliceHandler stamps run_id into the written frontmatter on a normal emit", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const { costSliceHandler } = await import(
        "../scripts/lib/cost-hygiene/cost-slice-handler.mjs"
      );
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      await seedFixtureSession(projectsRoot, tmpDir, now);
      const result = (await costSliceHandler({
        repoPath: tmpDir,
        flags: { startedAt: fiveMinAgo, completedAt: now, runTitle: "loop-normal-emit" }
      })) as Record<string, unknown>;
      expect(result.written).not.toBe(false);
      const files = await listCostDir(tmpDir);
      expect(files.length).toBe(1);
      const content = await fs.readFile(
        path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
        "utf8"
      );
      expect(content).toContain("run_id:");
    });
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-1 loop path: costSliceHandler refuses a repeated run_id with identical totals as a duplicate", async () => {
  const tmpDir = await makeTempDir();
  try {
    await withIsolatedProjectsRoot(tmpDir, async (projectsRoot) => {
      const { costSliceHandler } = await import(
        "../scripts/lib/cost-hygiene/cost-slice-handler.mjs"
      );
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await writeWorkflowState(tmpDir, {
        title: "loop-dup-run-id",
        runId: "fixed-loop-run-id-456",
        startedAt: fiveMinAgo,
        updatedAt: fiveMinAgo
      });
      await seedFixtureSession(projectsRoot, tmpDir, new Date().toISOString());

      // No explicit startedAt/completedAt flags — falls back to
      // currentRun.startedAt, same as the real crew-bridge call shape.
      const first = (await costSliceHandler({
        repoPath: tmpDir,
        flags: { runTitle: "loop-dup-run-id" }
      })) as Record<string, unknown>;
      expect(first.written).not.toBe(false);
      const filesAfterFirst = await listCostDir(tmpDir);
      expect(filesAfterFirst.length).toBeGreaterThan(0);

      const second = (await costSliceHandler({
        repoPath: tmpDir,
        flags: { runTitle: "loop-dup-run-id" }
      })) as Record<string, unknown>;
      expect(second.written).toBe(false);
      expect(second.reason).toBe("duplicate run_id");
      const filesAfterSecond = await listCostDir(tmpDir);
      expect(filesAfterSecond.length).toBe(filesAfterFirst.length);
    });
  } finally {
    await cleanup(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// AC-2: cost-advisor verdict
// ---------------------------------------------------------------------------

test("AC-2: decideCostVerdict is unknown when unpriced_models is non-empty", () => {
  expect(decideCostVerdict(["claude-opus-9"])).toBe("unknown");
});

test("AC-2: decideCostVerdict is pass when unpriced_models is empty or absent", () => {
  expect(decideCostVerdict([])).toBe("pass");
  expect(decideCostVerdict(undefined)).toBe("pass");
  expect(decideCostVerdict(null)).toBe("pass");
});

test("AC-2: a cost-report-slice artifact with unpriced_models renders both unpriced_models and verdict: unknown in frontmatter", async () => {
  const tmpDir = await makeTempDir();
  try {
    const cost: CostBreakdown = {
      usd: 1.23,
      aggregateAll: false,
      sourceProject: "test-project",
      autoDetected: false,
      sources: [],
      window: { start: "2026-01-01T00:00:00Z", end: "2026-01-01T01:00:00Z", durationMs: 3600000 },
      sessionsScanned: 1,
      messagesCounted: 1,
      totals: { input: 100, output: 50, cache_create_5m: 0, cache_create_1h: 0, cache_read: 0 },
      byModel: {
        "claude-opus-9": { messages: 1, usd: 0, tokens: { input: 100, output: 50 }, pricedAs: null }
      },
      modelMix: [],
      unpriced_models: ["claude-opus-9"]
    };
    const result = await writeArtifact(tmpDir, "cost-report-slice", {
      title: "unpriced-model-slice",
      runTitle: "unpriced-model-slice",
      cost,
      outcome: null
    });
    expect(result.ok).toBe(true);
    const files = await listCostDir(tmpDir);
    expect(files.length).toBe(1);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
      "utf8"
    );
    expect(content).toContain("unpriced_models:");
    expect(content).toContain("claude-opus-9");
    expect(content).toContain("verdict: unknown");
    expect(content).toContain("priced as unknown");
  } finally {
    await cleanup(tmpDir);
  }
});

test("AC-2: a fully-priced cost-report-slice artifact renders neither unpriced_models nor a verdict line", async () => {
  const tmpDir = await makeTempDir();
  try {
    const cost: CostBreakdown = {
      usd: 1.23,
      aggregateAll: false,
      sourceProject: "test-project",
      autoDetected: false,
      sources: [],
      window: { start: "2026-01-01T00:00:00Z", end: "2026-01-01T01:00:00Z", durationMs: 3600000 },
      sessionsScanned: 1,
      messagesCounted: 1,
      totals: { input: 100, output: 50, cache_create_5m: 0, cache_create_1h: 0, cache_read: 0 },
      byModel: {
        "claude-sonnet-5": {
          messages: 1,
          usd: 0.01,
          tokens: { input: 100, output: 50 },
          pricedAs: "claude-sonnet-5"
        }
      },
      modelMix: [],
      unpriced_models: []
    };
    const result = await writeArtifact(tmpDir, "cost-report-slice", {
      title: "fully-priced-slice",
      runTitle: "fully-priced-slice",
      cost,
      outcome: null
    });
    expect(result.ok).toBe(true);
    const files = await listCostDir(tmpDir);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
      "utf8"
    );
    expect(content).not.toContain("unpriced_models:");
    expect(content).not.toContain("verdict:");
  } finally {
    await cleanup(tmpDir);
  }
});
