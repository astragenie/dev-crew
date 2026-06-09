// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import {
  createChildWorktree,
  removeChildWorktree,
  preflightGitClean,
} from "../scripts/lib/dispatch-worktree.mjs";

test("createChildWorktree: creates worktree off parentBranch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-1", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-1",
    childId: "FE",
    depth: 0,
    runId: "test-run",
  });
  assert.ok(fs.existsSync(result.worktreePath), "worktree path exists");
  assert.match(result.branch, /slice\/SLICE-1-FE/);
  const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: result.worktreePath,
  })
    .toString()
    .trim();
  assert.equal(branchName, result.branch);
});

test("createChildWorktree: writes worktrees.jsonl entry", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-2", { cwd: repo });
  createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-2",
    childId: "BE",
    depth: 0,
    runId: "test-run-2",
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/test-run-2/worktrees.jsonl"),
    "utf8",
  );
  const entry = JSON.parse(log.trim());
  assert.equal(entry.childId, "BE");
  assert.equal(entry.depth, 0);
});

test("removeChildWorktree: prunes worktree + deletes branch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-3", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-3",
    childId: "RM",
    depth: 0,
    runId: "test-run-3",
  });
  removeChildWorktree(repo, result.worktreePath, result.branch);
  assert.ok(!fs.existsSync(result.worktreePath), "worktree gone");
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(!branches.includes(result.branch));
});

test("preflightGitClean: dirty tree throws DispatchWorktreeError", () => {
  const repo = initRepo();
  fs.writeFileSync(path.join(repo, "dirty.txt"), "x");
  assert.throws(
    () => preflightGitClean(repo, "main"),
    (e) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message),
  );
});

test("preflightGitClean: missing branch throws DispatchWorktreeError", () => {
  const repo = initRepo();
  assert.throws(
    () => preflightGitClean(repo, "ghost-branch"),
    (e) => e.name === "DispatchWorktreeError",
  );
});

test("preflightGitClean: clean tree on existing branch passes", () => {
  const repo = initRepo();
  assert.doesNotThrow(() => preflightGitClean(repo, "main"));
});
