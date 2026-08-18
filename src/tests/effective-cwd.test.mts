// @ts-nocheck
// Tests for SLICE-63: effective-cwd helper (FEAT-061).
// TDD order: tests written before implementation.
//
// Covers:
//   AC-7a: state isolation — writes land in worktree, not main repo
//   AC-7b: explicit --worktree override beats currentRun.worktreePath
//   AC-7c: missing worktreePath falls back to repoPath gracefully

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { resolveEffectiveCwd } from "../scripts/lib/effective-cwd.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** Write .claude/state/crew/workflow-state.json with given currentRun fields. */
async function writeWorkflowState(
  repoPath: string,
  currentRun: Record<string, any>
): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun }, null, 2)
  );
}

// ---------------------------------------------------------------------------
// AC-7c: missing worktreePath → falls back to repoPath
// ---------------------------------------------------------------------------

test("resolveEffectiveCwd: no workflow-state file → source=repo, cwd=repoPath", async () => {
  const repo = await tmpDir("ecwd-no-state-");
  const result = await resolveEffectiveCwd({ repoPath: repo });
  assert.equal(result.cwd, repo, "should fall back to repoPath when no state file");
  assert.equal(result.source, "repo");
});

test("resolveEffectiveCwd: workflow-state exists but no worktreePath → source=repo", async () => {
  const repo = await tmpDir("ecwd-no-wt-");
  await writeWorkflowState(repo, { title: "some run" });
  const result = await resolveEffectiveCwd({ repoPath: repo });
  assert.equal(result.cwd, repo);
  assert.equal(result.source, "repo");
});

test("resolveEffectiveCwd: workflow-state currentRun.worktreePath set → source=worktreeState", async () => {
  const repo = await tmpDir("ecwd-wt-state-");
  const worktree = await tmpDir("ecwd-wt-target-");
  await writeWorkflowState(repo, { worktreePath: worktree });

  const result = await resolveEffectiveCwd({ repoPath: repo });
  assert.equal(result.cwd, worktree);
  assert.equal(result.source, "worktreeState");
});

test("resolveEffectiveCwd: worktreePath in state is empty string → falls back to repo", async () => {
  const repo = await tmpDir("ecwd-empty-wt-");
  await writeWorkflowState(repo, { worktreePath: "" });
  const result = await resolveEffectiveCwd({ repoPath: repo });
  assert.equal(result.cwd, repo);
  assert.equal(result.source, "repo");
});

// ---------------------------------------------------------------------------
// AC-7b: explicit --worktree override beats currentRun.worktreePath
// ---------------------------------------------------------------------------

test("resolveEffectiveCwd: worktreeOverride beats state worktreePath → source=override", async () => {
  const repo = await tmpDir("ecwd-override-");
  const worktreeFromState = await tmpDir("ecwd-state-target-");
  const explicitOverride = await tmpDir("ecwd-explicit-target-");
  await writeWorkflowState(repo, { worktreePath: worktreeFromState });

  const result = await resolveEffectiveCwd({ repoPath: repo, worktreeOverride: explicitOverride });
  assert.equal(result.cwd, explicitOverride);
  assert.equal(result.source, "override");
});

test("resolveEffectiveCwd: worktreeOverride with no state file → source=override", async () => {
  const repo = await tmpDir("ecwd-override-nostate-");
  const explicitOverride = await tmpDir("ecwd-override-nostate-tgt-");

  const result = await resolveEffectiveCwd({ repoPath: repo, worktreeOverride: explicitOverride });
  assert.equal(result.cwd, explicitOverride);
  assert.equal(result.source, "override");
});

// ---------------------------------------------------------------------------
// AC-7a: state isolation — verify writes land in worktree's .claude/state
// ---------------------------------------------------------------------------

test("state isolation: worktreePath in state routes cwd to worktree", async () => {
  const repo = await tmpDir("ecwd-isolation-repo-");
  const worktree = await tmpDir("ecwd-isolation-wt-");

  // Populate workflow-state in the MAIN repo pointing to the worktree
  await writeWorkflowState(repo, { worktreePath: worktree });

  const result = await resolveEffectiveCwd({ repoPath: repo });
  // The effective cwd should be the worktree, not the main repo
  assert.equal(result.cwd, worktree, "effective cwd must be worktree, not main repo");
  assert.notEqual(result.cwd, repo, "effective cwd must differ from main repo path");

  // Simulate a write to .claude/state/crew/ under the effective cwd
  const stateDir = path.join(result.cwd, ".claude", "state", "crew");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(
    path.join(stateDir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun: { test: true } })
  );

  // Verify write landed in worktree, NOT in main repo
  const mainStateFile = path.join(repo, ".claude", "state", "crew", "workflow-state.json");
  const worktreeStateFile = path.join(worktree, ".claude", "state", "crew", "workflow-state.json");

  const mainExists = await fs
    .access(mainStateFile)
    .then(() => true)
    .catch(() => false);
  const wtExists = await fs
    .access(worktreeStateFile)
    .then(() => true)
    .catch(() => false);

  // Main repo already has a state file from writeWorkflowState setup — that's fine.
  // But the write we just did should be in the WORKTREE, not leaking extra data to main.
  assert.equal(wtExists, true, "write should land in worktree state dir");
  // The main repo state file should not have test:true (the write went to worktree)
  if (mainExists) {
    const mainState = JSON.parse(await fs.readFile(mainStateFile, "utf8"));
    assert.ok(
      !mainState?.currentRun?.test,
      "the worktree-targeted write must not land in main repo"
    );
  }
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("resolveEffectiveCwd: null worktreeOverride treated as absent", async () => {
  const repo = await tmpDir("ecwd-null-override-");
  const worktree = await tmpDir("ecwd-null-override-wt-");
  await writeWorkflowState(repo, { worktreePath: worktree });

  const result = await resolveEffectiveCwd({ repoPath: repo, worktreeOverride: null });
  assert.equal(result.cwd, worktree);
  assert.equal(result.source, "worktreeState");
});

test("resolveEffectiveCwd: malformed workflow-state JSON → falls back to repo", async () => {
  const repo = await tmpDir("ecwd-malformed-");
  const stateDir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(path.join(stateDir, "workflow-state.json"), "not-valid-json{{{{");

  const result = await resolveEffectiveCwd({ repoPath: repo });
  assert.equal(result.cwd, repo);
  assert.equal(result.source, "repo");
});
