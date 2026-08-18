// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { createChildWorktree } from "../scripts/lib/dispatch-worktree.mjs";
import { recoverRun } from "../scripts/lib/dispatch-recover.mjs";
import { DispatchWorktreeError } from "../scripts/lib/dispatch-types.mjs";

const RUN_ID = "rec-run";

// Build an INTERRUPTED run: 3 children spawned into worktrees (worktrees.jsonl
// written), 2 with a commit + DONE result marker, 1 with a commit but NO marker
// (the wave died before it wrote its result). Mirrors the 2026-07-19 incident.
function interruptedRun(parentBranch: string) {
  const repo = initRepo();
  execSync(`git checkout -qb ${parentBranch}`, { cwd: repo });
  const runDir = path.join(repo, ".claude/artifacts/loop/dispatch", RUN_ID);

  const spawn = (childId: string, withMarker: boolean) => {
    const { worktreePath, branch } = createChildWorktree({
      repoRoot: repo,
      parentBranch,
      childId,
      depth: 0,
      runId: RUN_ID
    });
    // Every child commits real work on its branch.
    fs.writeFileSync(path.join(worktreePath, `${childId}.txt`), `${childId}\n`);
    execSync(`git add . && git commit -qm "child ${childId}"`, { cwd: worktreePath });
    if (withMarker) {
      fs.mkdirSync(runDir, { recursive: true });
      fs.writeFileSync(
        path.join(runDir, `${childId}.result.json`),
        JSON.stringify({ id: childId, status: "DONE", branch, worktreePath })
      );
    }
    return { worktreePath, branch };
  };

  const a = spawn("A", true);
  const b = spawn("B", true);
  const c = spawn("C", false); // interrupted: work present, no marker
  return { repo, runDir, a, b, c };
}

test("recoverRun (AC-3): dry-run classifies 2 DONE children as merge + 1 no-marker as preserve, no git side effect", () => {
  const parent = "slice/REC1";
  const { repo } = interruptedRun(parent);

  const out = recoverRun(repo, RUN_ID, parent); // dry-run default
  assert.equal(out.executed, false);

  const byId = Object.fromEntries(out.children.map((c) => [c.id, c]));
  assert.equal(byId.A.action, "merge");
  assert.equal(byId.B.action, "merge");
  assert.equal(byId.C.action, "preserve");
  assert.equal(byId.C.status, "CONFLICTED"); // reclassified from FAILED "no marker"

  // Dry run touched no branch: parent has neither A.txt nor B.txt merged in.
  execSync(`git checkout -q ${parent}`, { cwd: repo });
  assert.ok(!fs.existsSync(path.join(repo, "A.txt")), "dry run must not merge A");
  assert.ok(!fs.existsSync(path.join(repo, "B.txt")), "dry run must not merge B");
});

test("recoverRun (AC-3 execute): merges the 2 DONE children into the parent branch", () => {
  const parent = "slice/REC2";
  const { repo } = interruptedRun(parent);

  const out = recoverRun(repo, RUN_ID, parent, { execute: true });
  assert.equal(out.executed, true);

  execSync(`git checkout -q ${parent}`, { cwd: repo });
  assert.ok(fs.existsSync(path.join(repo, "A.txt")), "A merged");
  assert.ok(fs.existsSync(path.join(repo, "B.txt")), "B merged");
});

test("recoverRun (AC-4): a no-marker child with work is preserved, never merged or discarded", () => {
  const parent = "slice/REC3";
  const { repo, c } = interruptedRun(parent);

  const out = recoverRun(repo, RUN_ID, parent, { execute: true });
  const child = out.children.find((x) => x.id === "C");
  assert.equal(child.action, "preserve");

  // C's work is NOT on the parent branch.
  execSync(`git checkout -q ${parent}`, { cwd: repo });
  assert.ok(!fs.existsSync(path.join(repo, "C.txt")), "interrupted child must not be merged");
  // C's worktree + branch survive for manual review.
  assert.ok(fs.existsSync(c.worktreePath), "worktree preserved");
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(branches.includes(`${parent}-C`), "branch preserved");
  // A worker-preserved artifact was emitted (needs_manual_review record).
  const runDir = path.join(repo, ".claude/artifacts/loop/dispatch", RUN_ID);
  const files = fs.readdirSync(runDir);
  assert.ok(
    files.some((f) => f.includes("preserved") && f.includes("C")),
    `expected a worker-preserved artifact for C, saw: ${files.join(", ")}`
  );
});

test("recoverRun (AC-4, uncommitted-WIP half): a no-marker child with ONLY uncommitted WIP is preserved", () => {
  const parent = "slice/RECW";
  const repo = initRepo();
  execSync(`git checkout -qb ${parent}`, { cwd: repo });
  const { worktreePath } = createChildWorktree({
    repoRoot: repo,
    parentBranch: parent,
    childId: "W",
    depth: 0,
    runId: RUN_ID
  });
  // No commit, no marker — just uncommitted WIP in the worktree.
  fs.writeFileSync(path.join(worktreePath, "wip.txt"), "in progress\n");

  const out = recoverRun(repo, RUN_ID, parent, { execute: true });
  const child = out.children.find((c) => c.id === "W");
  assert.equal(child.status, "CONFLICTED");
  assert.equal(child.action, "preserve");
  assert.ok(fs.existsSync(worktreePath), "worktree with WIP preserved");
});

test("recoverRun (negative): a no-marker child with NO work is skipped, not preserved", () => {
  const parent = "slice/RECN";
  const repo = initRepo();
  execSync(`git checkout -qb ${parent}`, { cwd: repo });
  createChildWorktree({
    repoRoot: repo,
    parentBranch: parent,
    childId: "N",
    depth: 0,
    runId: RUN_ID
  });
  // No commit, no WIP, no marker — genuinely nothing to recover.
  const out = recoverRun(repo, RUN_ID, parent, { execute: true });
  const child = out.children.find((c) => c.id === "N");
  assert.equal(child.status, "FAILED");
  assert.equal(child.action, "skip");
});

test("recoverRun (merge-safety): a --parent-branch that mismatches the recorded run throws before any git action", () => {
  const parent = "slice/RECM";
  const { repo } = interruptedRun(parent);
  assert.throws(
    () => recoverRun(repo, RUN_ID, "slice/WRONG", { execute: true }),
    (e) => e instanceof DispatchWorktreeError && /parent-branch mismatch/.test(e.message)
  );
  // No merge happened: the wrong branch doesn't even exist / has no child files.
  assert.ok(!fs.existsSync(path.join(repo, "A.txt")), "no merge on mismatch");
});

test("recoverRun (AC-5): missing worktrees.jsonl throws and performs no side effect", () => {
  const repo = initRepo();
  assert.throws(
    () => recoverRun(repo, "no-such-run", "main"),
    (e) => e instanceof DispatchWorktreeError && /worktrees\.jsonl/.test(e.message)
  );
  // No dispatch dir / summary created for the bogus run.
  assert.ok(
    !fs.existsSync(path.join(repo, ".claude/artifacts/loop/dispatch", "no-such-run")),
    "must not create any artifact for a missing run"
  );
});

test("recoverRun (AC-6): writes a structured per-child summary in both modes", () => {
  const parent = "slice/REC4";
  const { repo } = interruptedRun(parent);

  const dry = recoverRun(repo, RUN_ID, parent);
  assert.ok(fs.existsSync(dry.summaryPath), "dry-run summary written");
  const dryText = fs.readFileSync(dry.summaryPath, "utf8");
  assert.match(dryText, /DRY RUN/);
  assert.match(dryText, /\| A \| DONE \| merge \|/);
  assert.match(dryText, /\| C \| CONFLICTED \| preserve \|/);

  const exec = recoverRun(repo, RUN_ID, parent, { execute: true });
  assert.ok(fs.existsSync(exec.summaryPath), "execute summary written");
  assert.match(fs.readFileSync(exec.summaryPath, "utf8"), /EXECUTED/);
});
