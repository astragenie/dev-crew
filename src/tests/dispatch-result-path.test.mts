// FEAT-197 / SLICE-131 — Tests for absolute marker path in prompt (AC-2)
// and worktree fallback scan in aggregateResults (AC-3, AC-4, AC-5).

import { test } from "bun:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { augmentPrompt } from "../scripts/lib/dispatch-prompt.mjs";
import { aggregateResults } from "../scripts/lib/dispatch-aggregate.mjs";
import type { DispatchPlan } from "../scripts/lib/dispatch-types.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "feat197-"));
}

async function writeMarker(
  root: string,
  runId: string,
  childId: string,
  status: "DONE" | "FAILED" | "BLOCKED"
): Promise<void> {
  const dir = path.join(root, ".claude/artifacts/loop/dispatch", runId);
  await fs.mkdir(dir, { recursive: true });
  const marker = {
    id: childId,
    status,
    branch: "feat/test",
    worktreePath: root,
    costUsd: null
  };
  await fs.writeFile(path.join(dir, `${childId}.result.json`), JSON.stringify(marker));
}

const PLAN: DispatchPlan = { id: "FEAT-X", priority: 1, agentType: "claude", prompt: "do work" };

// ---------------------------------------------------------------------------
// AC-2: prompt contains absolute repoRoot path, not a relative one
// ---------------------------------------------------------------------------

test("AC-2: augmentPrompt embeds absolute repoRoot in markerPath", () => {
  // Use an OS-native absolute path so path.join resolves correctly on all platforms.
  const repoRoot = path.resolve(os.tmpdir(), "main-repo");
  const result = augmentPrompt("body", {
    runId: "RUN-1",
    depth: 0,
    childCwd: path.resolve(os.tmpdir(), "worktree"),
    childBranch: "feat/x",
    childId: "FEAT-X",
    repoRoot
  });

  // The prompt must contain the repoRoot somewhere in the marker path line.
  assert.ok(result.includes(repoRoot), `Expected output to contain repoRoot "${repoRoot}"`);
  // Must not contain a bare relative path starting with ".claude/" as the marker path.
  // The instruction line should say "ABSOLUTE path:" followed by an absolute path.
  const relativePattern = /ABSOLUTE path:.*?`\.claude\//;
  assert.ok(
    !relativePattern.test(result),
    'Expected markerPath to be absolute, not starting with ".claude/"'
  );
});

// ---------------------------------------------------------------------------
// AC-2 (Windows): drive-letter path is preserved
// ---------------------------------------------------------------------------

test("AC-2 Windows: repoRoot with drive letter is preserved in prompt", () => {
  // On POSIX systems path.join("C:\\main\\repo", ...) treats the whole
  // string as a single path segment, so the drive prefix is still included.
  // On Windows it is a real absolute path. Either way the root segment must
  // appear in the rendered output.
  const repoRoot = "C:\\main\\repo";
  const result = augmentPrompt("body", {
    runId: "RUN-1",
    depth: 0,
    childCwd: "C:\\some\\worktree",
    childBranch: "feat/x",
    childId: "FEAT-X",
    repoRoot
  });

  // path.join may normalize backslashes to forward slashes on POSIX
  const normalized = repoRoot.replace(/\\/g, "/");
  // On Windows path.join keeps backslashes; on POSIX it uses forward slashes
  // but keeps the full segment. Either form must be present.
  const hasOriginal = result.includes(repoRoot);
  const hasNormalized = result.includes(normalized);
  assert.ok(
    hasOriginal || hasNormalized,
    `Expected output to contain "${repoRoot}" or its normalized form "${normalized}"`
  );
});

// ---------------------------------------------------------------------------
// AC-3: fallback to worktree when main repo has no marker
// ---------------------------------------------------------------------------

test("AC-3: aggregateResults falls back to worktree marker when main has none", async () => {
  const mainRepo = await makeTempDir();
  const worktreePath = await makeTempDir();

  // Write marker ONLY in the worktree
  await writeMarker(worktreePath, "RUN-1", "FEAT-X", "DONE");

  const results = aggregateResults(mainRepo, "RUN-1", [PLAN], {}, { "FEAT-X": worktreePath });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "DONE", "Expected worktree marker to be used as fallback");
  assert.notEqual(results[0].error, "no marker");
});

// ---------------------------------------------------------------------------
// AC-4: main repo marker wins when both main and worktree have markers
// ---------------------------------------------------------------------------

test("AC-4: main repo marker wins over worktree marker", async () => {
  const mainRepo = await makeTempDir();
  const worktreePath = await makeTempDir();

  // Write DONE in main, FAILED in worktree
  await writeMarker(mainRepo, "RUN-1", "FEAT-X", "DONE");
  await writeMarker(worktreePath, "RUN-1", "FEAT-X", "FAILED");

  const results = aggregateResults(mainRepo, "RUN-1", [PLAN], {}, { "FEAT-X": worktreePath });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "DONE", "Expected main repo marker to win over worktree marker");
});

// ---------------------------------------------------------------------------
// AC-5: no cwdById entry → still returns FAILED with "no marker"
// ---------------------------------------------------------------------------

test("AC-5: missing cwdById entry returns FAILED with 'no marker'", async () => {
  const mainRepo = await makeTempDir();

  // No marker files anywhere, no cwdById entry
  const results = aggregateResults(mainRepo, "RUN-1", [PLAN], {}, {});

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "FAILED");
  assert.equal(results[0].error, "no marker");
});
