// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import {
  createChildWorktree,
  removeChildWorktree,
  preflightGitClean,
  inventoryWorkerBranch,
  appendInventoryLog,
  writeWorkerPreservedArtifact
} from "../scripts/lib/dispatch-worktree.mjs";

test("createChildWorktree: creates worktree off parentBranch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-1", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-1",
    childId: "FE",
    depth: 0,
    runId: "test-run"
  });
  assert.ok(fs.existsSync(result.worktreePath), "worktree path exists");
  assert.match(result.branch, /slice\/SLICE-1-FE/);
  const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: result.worktreePath
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
    runId: "test-run-2"
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/test-run-2/worktrees.jsonl"),
    "utf8"
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
    runId: "test-run-3"
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
    (e) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message)
  );
});

test("preflightGitClean: missing branch throws DispatchWorktreeError", () => {
  const repo = initRepo();
  assert.throws(
    () => preflightGitClean(repo, "ghost-branch"),
    (e) => e.name === "DispatchWorktreeError"
  );
});

test("preflightGitClean: clean tree on existing branch passes", () => {
  const repo = initRepo();
  assert.doesNotThrow(() => preflightGitClean(repo, "main"));
});

// ──────────────────────────────────────────────────────────────────────────
// FEAT-202 SLICE-A — inventoryWorkerBranch + helpers
// ──────────────────────────────────────────────────────────────────────────

test("inventoryWorkerBranch: clean branch with no changes returns empty arrays", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV1",
    depth: 0,
    runId: "test-inv-1"
  });
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.filesOnBranchNotOnMain.length, 0, "no commits on branch yet");
  assert.equal(inv.uncommittedWip.length, 0, "no WIP in worktree");
  assert.equal(inv.branch, result.branch);
});

test("inventoryWorkerBranch: branch with a committed handoff shows it as on-branch-not-on-main", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV2",
    depth: 0,
    runId: "test-inv-2"
  });
  fs.mkdirSync(path.join(result.worktreePath, ".claude/artifacts/crew/handoffs"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(result.worktreePath, ".claude/artifacts/crew/handoffs/SLICE-X-handoff.md"),
    "# handoff\n"
  );
  execSync('git add . && git commit -qm "handoff"', { cwd: result.worktreePath });
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.filesOnBranchNotOnMain.length, 1);
  assert.ok(inv.filesOnBranchNotOnMain[0].includes("SLICE-X-handoff.md"));
});

test("inventoryWorkerBranch: uncommitted WIP in worktree appears in uncommittedWip", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV3",
    depth: 0,
    runId: "test-inv-3"
  });
  fs.writeFileSync(path.join(result.worktreePath, "untracked.txt"), "WIP\n");
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.uncommittedWip.length, 1);
  assert.equal(inv.uncommittedWip[0].path, "untracked.txt");
  assert.equal(inv.uncommittedWip[0].status, "??");
});

test("inventoryWorkerBranch: missing worktree returns empty WIP (no throw)", () => {
  const repo = initRepo();
  // Reference a worktree path that doesn't exist; should not throw.
  const inv = inventoryWorkerBranch(repo, path.join(repo, "ghost-worktree"), "ghost-branch", "main");
  assert.equal(inv.uncommittedWip.length, 0);
  assert.equal(inv.filesOnBranchNotOnMain.length, 0);
});

test("appendInventoryLog: writes one JSONL row per call under runId dir", () => {
  const repo = initRepo();
  appendInventoryLog(repo, "test-log-1", {
    branch: "slice/SLICE-LOG",
    worktreePath: "/tmp/wt",
    filesOnBranchNotOnMain: ["a.md"],
    uncommittedWip: [{ path: "b.txt", status: "??" }],
    childId: "LOG1",
    status: "PRE_MERGE"
  });
  appendInventoryLog(repo, "test-log-1", {
    branch: "slice/SLICE-LOG",
    worktreePath: "/tmp/wt",
    filesOnBranchNotOnMain: [],
    uncommittedWip: [],
    childId: "LOG2",
    status: "FAIL"
  });
  const logPath = path.join(repo, ".claude/artifacts/loop/dispatch/test-log-1/inventory.jsonl");
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  const row1 = JSON.parse(lines[0]);
  assert.equal(row1.childId, "LOG1");
  assert.equal(row1.status, "PRE_MERGE");
  assert.equal(row1.filesOnBranchNotOnMain[0], "a.md");
  assert.ok(row1.ts, "timestamp present");
});

test("writeWorkerPreservedArtifact: emits Markdown summary with file + WIP previews", () => {
  const repo = initRepo();
  writeWorkerPreservedArtifact(
    repo,
    "test-art-1",
    "ART1",
    "CONFLICTED",
    {
      branch: "slice/SLICE-A1",
      worktreePath: "/tmp/wt-a1",
      filesOnBranchNotOnMain: ["x.md", "y.md"],
      uncommittedWip: [{ path: "z.txt", status: " M" }]
    },
    "Resolve conflicts manually."
  );
  const artPath = path.join(
    repo,
    ".claude/artifacts/loop/dispatch/test-art-1/worker-preserved-ART1.md"
  );
  const body = fs.readFileSync(artPath, "utf8");
  assert.ok(body.includes("# Worker preserved — ART1"));
  assert.ok(body.includes("**status:** CONFLICTED"));
  assert.ok(body.includes("`slice/SLICE-A1`"));
  assert.ok(body.includes("`x.md`"));
  assert.ok(body.includes("`y.md`"));
  assert.ok(body.includes("`z.txt`"));
  assert.ok(body.includes("Resolve conflicts manually."));
});
