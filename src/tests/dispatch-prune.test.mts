// @ts-nocheck
// FEAT-205 SLICE-138 — dispatch-prune.mts unit tests.
//
// Uses isolated temp directories with fixture dispatch/ layouts.
// No live git worktrees are created in most tests (uses synthetic worktrees.jsonl).

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  listStaleRunIds,
  pruneRunId,
  pruneStale,
} from "../scripts/lib/dispatch-prune.mjs";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "loop-prune-test-"));
}

/** Build a minimal runId directory with optional summary.md and trace.jsonl. */
function makeRunDir(
  dispDir: string,
  runId: string,
  opts: { hasSummary?: boolean; traceAgeMs?: number } = {},
): string {
  const runDir = path.join(dispDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  if (opts.hasSummary !== false) {
    fs.writeFileSync(path.join(runDir, "summary.md"), "# done\n");
  }
  if (opts.traceAgeMs !== undefined) {
    const tracePath = path.join(runDir, "trace.jsonl");
    fs.writeFileSync(
      tracePath,
      '{"ts":"t","childId":"A","status":"DONE","durationMs":0,"costUsd":null}\n',
    );
    const targetMtime = new Date(Date.now() - opts.traceAgeMs);
    fs.utimesSync(tracePath, targetMtime, targetMtime);
  }
  return runDir;
}

/** Set directory mtime to simulate aging. */
function setDirMtime(dirPath: string, ageMs: number): void {
  const t = new Date(Date.now() - ageMs);
  fs.utimesSync(dirPath, t, t);
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (a): --dry-run on 3-runId fixture with 1 stale returns 1 entry, no disk mutation
// ─────────────────────────────────────────────────────────────────────────────
test("listStaleRunIds: returns only runIds older than threshold", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // runId with ISO-parseable name (old: 10 days)
  const oldRunId = "2026-06-21T08-00-00-000Z-aaa111";
  makeRunDir(dispDir, oldRunId, { hasSummary: true });

  // Recent runId (ISO name: 1 day old) — should NOT be stale at threshold=7
  const newRunId = `${new Date(Date.now() - MS_PER_DAY).toISOString().slice(0, 10).replace(/-/g, "-")}T08-00-00-000Z-bbb222`;
  makeRunDir(dispDir, newRunId, { hasSummary: true });

  // Another recent runId that relies on dir mtime (no ISO name) — not stale
  const noDateRunId = "abc-no-date";
  const noDateDir = makeRunDir(dispDir, noDateRunId, { hasSummary: true });
  setDirMtime(noDateDir, 2 * MS_PER_DAY); // 2 days old — below threshold

  const stale = await listStaleRunIds(repo, 7);

  // Only the ISO-parseable old runId should appear
  assert.equal(stale.length, 1, "exactly 1 stale runId");
  assert.equal(stale[0].runId, oldRunId);
  assert.ok(stale[0].ageDays > 7, "ageDays > 7");

  // Dry-run: verify pruneStale with dryRun=true returns listed but does not remove
  const result = await pruneStale(repo, { olderThanDays: 7, dryRun: true });
  assert.equal(result.listed, 1);
  assert.equal(result.pruned, 0);
  assert.equal(result.failed, 0);
  assert.ok(
    fs.existsSync(path.join(dispDir, oldRunId)),
    "runId dir still on disk after dry-run",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (b): real prune removes runId dir + reports 1 pruned
// ─────────────────────────────────────────────────────────────────────────────
test("pruneStale: removes stale closed runId dir (no worktrees/branches)", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  const staleRunId = "2026-06-01T08-00-00-000Z-ccc333";
  const runDir = makeRunDir(dispDir, staleRunId, { hasSummary: true });
  assert.ok(fs.existsSync(runDir), "runDir exists before prune");

  const result = await pruneStale(repo, { olderThanDays: 7, dryRun: false });

  assert.equal(result.listed, 1);
  assert.equal(result.pruned, 1, "1 runId pruned");
  assert.equal(result.failed, 0);
  assert.ok(!fs.existsSync(runDir), "runId dir removed");
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (c): pruneRunId partial failure (simulate by pointing at nonexistent worktree path)
//           continues to next, but failure is recorded; pruneStale exits with failed>0
// ─────────────────────────────────────────────────────────────────────────────
test("pruneRunId: failure on git ops recorded in errors, does not throw", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  const staleRunId = "2026-06-01T08-00-00-000Z-ddd444";
  const runDir = path.join(dispDir, staleRunId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "summary.md"), "# done\n");
  // Add a worktrees.jsonl pointing at a path that does NOT exist (git will error)
  fs.writeFileSync(
    path.join(runDir, "worktrees.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      childId: "X",
      branch: "nonexistent-branch-zzz",
      path: path.join(repo, "does-not-exist"),
      depth: 0,
    }) + "\n",
  );

  // Need a git repo for git calls to run (even if they fail gracefully)
  const { execSync } = await import("node:child_process");
  execSync("git init -q -b main", { cwd: repo });
  execSync('git config user.email "t@t.com"', { cwd: repo });
  execSync('git config user.name "T"', { cwd: repo });
  fs.writeFileSync(path.join(repo, "README.md"), "x");
  execSync("git add . && git commit -q -m init", { cwd: repo });

  const result = await pruneRunId(repo, staleRunId);

  // git worktree remove and git branch -D will fail; errors captured
  assert.ok(result.errors.length > 0, "errors captured for failed git ops");
  // The rm should still succeed
  assert.ok(result.dirRemoved, "runId dir was removed despite git errors");
  assert.ok(!fs.existsSync(runDir), "runId dir gone");
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (d): pruneStale with no .claude/artifacts/loop/dispatch/ dir returns empty
// ─────────────────────────────────────────────────────────────────────────────
test("pruneStale: missing dispatch dir returns empty result", async () => {
  const repo = tmpDir();
  // No dispatch dir created

  const result = await pruneStale(repo, { olderThanDays: 7, dryRun: false });

  assert.equal(result.listed, 0);
  assert.equal(result.pruned, 0);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.errors, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (e): in-flight guard skips runId whose trace.jsonl was modified <5min ago
// ─────────────────────────────────────────────────────────────────────────────
test("listStaleRunIds: skips in-flight runId (trace.jsonl modified <5min ago)", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  // Old runId but trace.jsonl touched just now — should be skipped
  const oldRunId = "2026-06-01T08-00-00-000Z-eee555";
  const runDir = makeRunDir(dispDir, oldRunId, {
    hasSummary: false, // missing summary = open
    traceAgeMs: 30 * 1000, // 30 seconds ago = in-flight
  });
  assert.ok(fs.existsSync(runDir), "runDir exists");

  const stale = await listStaleRunIds(repo, 7);
  assert.equal(stale.length, 0, "in-flight runId not included in stale list");
});
