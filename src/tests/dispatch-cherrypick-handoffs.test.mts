// @ts-nocheck
// FEAT-202 SLICE-B — dedicated tests for cherryPickHandoffsFromBranch.
// AC-4: (a) handoff-only-on-branch → cherry-picked onto main
//        (b) conflict → abort clean, parent branch tip unchanged
//        (c) no handoff → no-op, empty result
// Tests spin up isolated temp git repos; no dependency on host state.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { cherryPickHandoffsFromBranch } from "../scripts/lib/dispatch-worktree.mjs";

// ──────────────────────────────────────────────────────────────────────────
// AC-4 (a): branch with committed `.claude/artifacts/crew/handoffs/handoff-A.md`
//            not present on main → cherry-picked onto main; result shows it picked.
// ──────────────────────────────────────────────────────────────────────────
test("cherryPickHandoffsFromBranch: handoff on branch not on main is cherry-picked", () => {
  const repo = initRepo();

  // Create and check out worker branch
  execSync("git checkout -q -b worker/A", { cwd: repo });

  // Add a handoff file on the worker branch
  const handoffDir = path.join(repo, ".claude/artifacts/crew/handoffs");
  fs.mkdirSync(handoffDir, { recursive: true });
  fs.writeFileSync(path.join(handoffDir, "handoff-A.md"), "# handoff A\n");
  execSync('git add . && git commit -qm "add handoff-A"', { cwd: repo });

  // Switch back to main (precondition: parentBranch checked out at repoRoot)
  execSync("git checkout -q main", { cwd: repo });
  const tipBefore = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();

  const result = cherryPickHandoffsFromBranch(repo, "worker/A", "main");

  // Should have picked the file
  assert.equal(result.aborted, false, "no conflict expected");
  assert.equal(result.skippedConflict.length, 0, "nothing skipped");
  assert.equal(result.cherryPicked.length, 1, "one handoff picked");
  assert.ok(
    result.cherryPicked[0].includes("handoff-A.md"),
    `expected handoff-A.md in cherryPicked, got: ${result.cherryPicked[0]}`
  );

  // File should now exist on main branch
  assert.ok(
    fs.existsSync(path.join(repo, ".claude/artifacts/crew/handoffs/handoff-A.md")),
    "handoff-A.md exists on main after cherry-pick"
  );

  // main branch tip must have advanced (cherry-pick added a commit)
  const tipAfter = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.notEqual(tipBefore, tipAfter, "main tip advanced after cherry-pick");
});

// ──────────────────────────────────────────────────────────────────────────
// AC-4 (b): conflict → abort cleans up, parent branch tip unchanged.
// ──────────────────────────────────────────────────────────────────────────
test("cherryPickHandoffsFromBranch: conflict aborts cleanly; parent branch tip unchanged", () => {
  const repo = initRepo();

  // Put conflicting content on main
  const handoffDir = path.join(repo, ".claude/artifacts/crew/handoffs");
  fs.mkdirSync(handoffDir, { recursive: true });
  fs.writeFileSync(path.join(handoffDir, "handoff-A.md"), "# main version\n");
  execSync('git add . && git commit -qm "add handoff-A on main"', { cwd: repo });

  const mainTipBefore = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();

  // Create worker branch from the initial commit (before the conflicting file)
  // We need to branch from the first commit so cherry-pick can conflict.
  const firstCommit = execSync("git log --oneline", { cwd: repo })
    .toString()
    .trim()
    .split("\n")
    .at(-1)!
    .split(" ")[0];
  execSync(`git checkout -q -b worker/CONF ${firstCommit}`, { cwd: repo });

  // Add a different version of the same handoff on the worker branch
  fs.mkdirSync(handoffDir, { recursive: true });
  fs.writeFileSync(path.join(handoffDir, "handoff-A.md"), "# worker version\n");
  execSync('git add . && git commit -qm "add conflicting handoff-A"', { cwd: repo });

  // Switch back to main (precondition)
  execSync("git checkout -q main", { cwd: repo });

  const result = cherryPickHandoffsFromBranch(repo, "worker/CONF", "main");

  // Conflict should have been detected and aborted
  assert.equal(result.aborted, true, "aborted flag set");
  assert.equal(result.cherryPicked.length, 0, "nothing picked on conflict");
  assert.equal(result.skippedConflict.length, 1, "one path in skippedConflict");
  assert.ok(
    result.skippedConflict[0].includes("handoff-A.md"),
    `expected handoff-A.md in skippedConflict, got: ${result.skippedConflict[0]}`
  );

  // Parent branch tip MUST be unchanged — abort atomicity
  const mainTipAfter = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.equal(mainTipBefore, mainTipAfter, "parent branch tip unchanged after abort");

  // Working tree must be clean (no leftover conflict markers)
  const porcelain = execSync("git status --porcelain", { cwd: repo }).toString().trim();
  assert.equal(porcelain, "", "working tree clean after abort");
});

// ──────────────────────────────────────────────────────────────────────────
// AC-4 (c): branch with no handoff paths → empty result, no-op.
// ──────────────────────────────────────────────────────────────────────────
test("cherryPickHandoffsFromBranch: no handoff on branch returns empty result", () => {
  const repo = initRepo();

  // Create worker branch with a non-handoff commit
  execSync("git checkout -q -b worker/NOOP", { cwd: repo });
  fs.writeFileSync(path.join(repo, "regular-file.txt"), "not a handoff\n");
  execSync('git add . && git commit -qm "add regular file"', { cwd: repo });

  // Switch back to main (precondition)
  execSync("git checkout -q main", { cwd: repo });
  const tipBefore = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();

  const result = cherryPickHandoffsFromBranch(repo, "worker/NOOP", "main");

  assert.equal(result.aborted, false, "no abort when nothing to pick");
  assert.deepEqual(result.cherryPicked, [], "nothing picked");
  assert.deepEqual(result.skippedConflict, [], "nothing skipped");

  // Main tip must not have changed (no commit added)
  const tipAfter = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.equal(tipBefore, tipAfter, "main tip unchanged when no handoffs");
});

// ──────────────────────────────────────────────────────────────────────────
// Bonus AC-4: branch with *handoff* in name under .claude/artifacts/ (alt path)
// ──────────────────────────────────────────────────────────────────────────
test("cherryPickHandoffsFromBranch: alternate handoff path (*handoff*.md under .claude/artifacts/) is picked", () => {
  const repo = initRepo();

  // Create worker branch with a handoff file at the alternate path
  execSync("git checkout -q -b worker/ALT", { cwd: repo });
  const altDir = path.join(repo, ".claude/artifacts/loop/handoffs");
  fs.mkdirSync(altDir, { recursive: true });
  fs.writeFileSync(path.join(altDir, "SLICE-99-handoff.md"), "# alt handoff\n");
  execSync('git add . && git commit -qm "add alt handoff"', { cwd: repo });

  execSync("git checkout -q main", { cwd: repo });

  const result = cherryPickHandoffsFromBranch(repo, "worker/ALT", "main");

  assert.equal(result.aborted, false);
  assert.equal(result.cherryPicked.length, 1, "alt-path handoff should be picked");
  assert.ok(result.cherryPicked[0].includes("SLICE-99-handoff.md"));
});
