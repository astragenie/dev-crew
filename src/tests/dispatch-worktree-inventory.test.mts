// @ts-nocheck
// FEAT-202 SLICE-A — dedicated tests for inventoryWorkerBranch.
// Covers AC-4: (a) clean branch, (b) branch with committed handoff, (c) untracked WIP.
// Spins up isolated temp git repos; no dependency on host state.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { createChildWorktree, inventoryWorkerBranch } from "../scripts/lib/dispatch-worktree.mjs";

// AC-4 (a): clean branch with no commits or WIP — both arrays empty.
test("inventoryWorkerBranch: clean branch returns empty filesOnBranchNotOnMain and uncommittedWip", () => {
  const repo = initRepo();
  const { worktreePath, branch } = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "CLEAN",
    depth: 0,
    runId: "inv-test-clean"
  });

  const inv = inventoryWorkerBranch(repo, worktreePath, branch, "main");

  assert.deepEqual(inv.filesOnBranchNotOnMain, [], "no committed files on branch");
  assert.deepEqual(inv.uncommittedWip, [], "no uncommitted WIP");
  assert.equal(inv.branch, branch);
  assert.equal(inv.worktreePath, worktreePath);
});

// AC-4 (b): branch with a committed .claude/artifacts/crew/handoffs/handoff.md —
// filesOnBranchNotOnMain must contain that path.
test("inventoryWorkerBranch: committed handoff on branch appears in filesOnBranchNotOnMain", () => {
  const repo = initRepo();
  const { worktreePath, branch } = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "HANDOFF",
    depth: 0,
    runId: "inv-test-handoff"
  });

  const handoffDir = path.join(worktreePath, ".claude/artifacts/crew/handoffs");
  fs.mkdirSync(handoffDir, { recursive: true });
  fs.writeFileSync(path.join(handoffDir, "handoff.md"), "# handoff\n");
  execSync("git add . && git commit -qm \"add handoff\"", { cwd: worktreePath });

  const inv = inventoryWorkerBranch(repo, worktreePath, branch, "main");

  assert.equal(inv.filesOnBranchNotOnMain.length, 1, "one file on branch not on main");
  assert.ok(
    inv.filesOnBranchNotOnMain[0].includes("handoff.md"),
    `expected handoff.md in path, got: ${inv.filesOnBranchNotOnMain[0]}`
  );
  assert.deepEqual(inv.uncommittedWip, [], "no uncommitted WIP");
});

// AC-4 (c): untracked file in worktree — uncommittedWip contains { path, status: "??" }.
test("inventoryWorkerBranch: untracked file in worktree appears in uncommittedWip with status ??", () => {
  const repo = initRepo();
  const { worktreePath, branch } = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "WIP",
    depth: 0,
    runId: "inv-test-wip"
  });

  fs.writeFileSync(path.join(worktreePath, "untracked.txt"), "work in progress\n");

  const inv = inventoryWorkerBranch(repo, worktreePath, branch, "main");

  assert.deepEqual(inv.filesOnBranchNotOnMain, [], "untracked file not committed — not on branch");
  assert.equal(inv.uncommittedWip.length, 1, "one WIP entry");
  assert.equal(inv.uncommittedWip[0].path, "untracked.txt");
  assert.equal(inv.uncommittedWip[0].status, "??", "untracked status code");
});
