// @ts-nocheck
// FEAT-205 SLICE-138 — dispatch-tree-snapshot.mts unit tests.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readDispatchTreeSnapshot } from "../scripts/lib/dispatch-tree-snapshot.mjs";
import { checkDispatchAccretion } from "../scripts/lib/marathon-checkpoint.mjs";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "loop-tree-snap-test-"));
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (dispatch-tree-snapshot a): empty dispatch dir returns zeroes/null
// ─────────────────────────────────────────────────────────────────────────────
test("readDispatchTreeSnapshot: missing dispatch dir returns zeroes/null", async () => {
  const repo = tmpDir();
  // No dispatch dir

  const snap = await readDispatchTreeSnapshot(repo);

  assert.deepEqual(snap.openRunIds, []);
  assert.equal(snap.worktreeCount, 0);
  assert.equal(snap.oldestRunAgeDays, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (dispatch-tree-snapshot b): mixed open/closed runIds populate openRunIds correctly
// ─────────────────────────────────────────────────────────────────────────────
test("readDispatchTreeSnapshot: open runIds (missing summary) appear in openRunIds", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Open runId: no summary.md
  const openId = "2026-06-01T08-00-00-000Z-aaa000";
  const openDir = path.join(dispDir, openId);
  fs.mkdirSync(openDir, { recursive: true });
  // Add a worktrees.jsonl so worktreeCount is > 0
  fs.writeFileSync(
    path.join(openDir, "worktrees.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      childId: "A",
      branch: "main-A",
      path: "/tmp/fake-wt",
      depth: 0
    }) + "\n"
  );

  // Closed runId: has summary.md + old trace
  const closedId = "2026-06-10T08-00-00-000Z-bbb111";
  const closedDir = path.join(dispDir, closedId);
  fs.mkdirSync(closedDir, { recursive: true });
  fs.writeFileSync(path.join(closedDir, "summary.md"), "# done\n");
  const tracePath = path.join(closedDir, "trace.jsonl");
  fs.writeFileSync(
    tracePath,
    '{"ts":"t","childId":"B","status":"DONE","durationMs":0,"costUsd":null}\n'
  );
  // Set trace mtime to 10 minutes ago (outside in-flight window)
  const oldTrace = new Date(Date.now() - 10 * 60 * 1000);
  fs.utimesSync(tracePath, oldTrace, oldTrace);

  const snap = await readDispatchTreeSnapshot(repo);

  assert.deepEqual(snap.openRunIds, [openId], "only openId in openRunIds");
  assert.equal(snap.worktreeCount, 1, "1 worktree from worktrees.jsonl");
  assert.ok(snap.oldestRunAgeDays !== null, "oldestRunAgeDays populated");
  // The oldest runId is openId (2026-06-01), which should be > 20 days from July 2026
  assert.ok(snap.oldestRunAgeDays > 20, "oldest is very old");
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 (dispatch-tree-snapshot c): dispatch-worktree-accretion badge emits at 2x
// ─────────────────────────────────────────────────────────────────────────────
test("checkDispatchAccretion: emits advisory badge when oldestRunAgeDays > 2 * pruneStaleAfterDays", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  // Very old closed runId: 2026-06-01 (30+ days from July 2026)
  const oldId = "2026-06-01T08-00-00-000Z-ccc222";
  const oldDir = path.join(dispDir, oldId);
  fs.mkdirSync(oldDir, { recursive: true });
  fs.writeFileSync(path.join(oldDir, "summary.md"), "# done\n");

  // Config with pruneStaleAfterDays = 7 (threshold = 14)
  const config = { loop: { dispatch: { pruneStaleAfterDays: 7 } } };

  const badge = await checkDispatchAccretion(repo, config);

  assert.ok(badge !== null, "badge emitted");
  assert.equal(badge!.badge, "dispatch-worktree-accretion");
  assert.equal(badge!.level, "advisory");
  assert.ok(badge!.oldestRunAgeDays > 14, "oldestRunAgeDays above threshold");
  assert.equal(badge!.threshold, 14);
});

test("checkDispatchAccretion: no badge when oldestRunAgeDays <= threshold", async () => {
  const repo = tmpDir();
  const dispDir = path.join(repo, ".claude", "artifacts", "loop", "dispatch");
  fs.mkdirSync(dispDir, { recursive: true });

  // Recent runId (1 day old via mtime)
  const recentId = "recent-no-date";
  const recentDir = path.join(dispDir, recentId);
  fs.mkdirSync(recentDir, { recursive: true });
  fs.writeFileSync(path.join(recentDir, "summary.md"), "# done\n");
  // mtime = now (default, so age = 0)

  const config = { loop: { dispatch: { pruneStaleAfterDays: 7 } } };
  const badge = await checkDispatchAccretion(repo, config);

  assert.equal(badge, null, "no badge for recent runId");
});

test("checkDispatchAccretion: returns null when dispatch dir is absent", async () => {
  const repo = tmpDir();

  const badge = await checkDispatchAccretion(repo, null);
  assert.equal(badge, null, "null when no dispatch dir");
});
