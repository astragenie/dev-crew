// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { mergeChildren } from "../scripts/lib/dispatch-merge.mjs";
import { createChildWorktree } from "../scripts/lib/dispatch-worktree.mjs";
test("mergeChildren: DONE children merged + cleaned up in priority order", () => {
    const repo = initRepo();
    execSync("git checkout -q -b slice/SLICE-MERGE", { cwd: repo });
    const a = createChildWorktree({
        repoRoot: repo,
        parentBranch: "slice/SLICE-MERGE",
        childId: "A",
        depth: 0,
        runId: "merge-1"
    });
    fs.writeFileSync(path.join(a.worktreePath, "a.txt"), "A\n");
    execSync("git add . && git commit -q -m a", { cwd: a.worktreePath });
    const b = createChildWorktree({
        repoRoot: repo,
        parentBranch: "slice/SLICE-MERGE",
        childId: "B",
        depth: 0,
        runId: "merge-1"
    });
    fs.writeFileSync(path.join(b.worktreePath, "b.txt"), "B\n");
    execSync("git add . && git commit -q -m b", { cwd: b.worktreePath });
    const results = [
        { id: "A", status: "DONE", branch: a.branch, worktreePath: a.worktreePath },
        { id: "B", status: "DONE", branch: b.branch, worktreePath: b.worktreePath }
    ];
    const plans = [
        { id: "A", priority: 0, agentType: "x", prompt: "" },
        { id: "B", priority: 1, agentType: "x", prompt: "" }
    ];
    const final = mergeChildren(repo, "slice/SLICE-MERGE", results, plans);
    assert.equal(final[0].status, "DONE");
    assert.equal(final[1].status, "DONE");
    assert.ok(fs.existsSync(path.join(repo, "a.txt")));
    assert.ok(fs.existsSync(path.join(repo, "b.txt")));
    const branches = execSync("git branch", { cwd: repo }).toString();
    assert.ok(!branches.includes("SLICE-MERGE-A"));
    assert.ok(!branches.includes("SLICE-MERGE-B"));
});
test("mergeChildren: merge conflict surfaces CONFLICTED, preserves branch", () => {
    const repo = initRepo();
    execSync("git checkout -q -b slice/SLICE-CONF", { cwd: repo });
    fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
    execSync("git add . && git commit -q -m base", { cwd: repo });
    const x = createChildWorktree({
        repoRoot: repo,
        parentBranch: "slice/SLICE-CONF",
        childId: "X",
        depth: 0,
        runId: "conf-1"
    });
    fs.writeFileSync(path.join(x.worktreePath, "shared.txt"), "X-version\n");
    execSync("git add . && git commit -q -m x", { cwd: x.worktreePath });
    const y = createChildWorktree({
        repoRoot: repo,
        parentBranch: "slice/SLICE-CONF",
        childId: "Y",
        depth: 0,
        runId: "conf-1"
    });
    fs.writeFileSync(path.join(y.worktreePath, "shared.txt"), "Y-version\n");
    execSync("git add . && git commit -q -m y", { cwd: y.worktreePath });
    const results = [
        { id: "X", status: "DONE", branch: x.branch, worktreePath: x.worktreePath },
        { id: "Y", status: "DONE", branch: y.branch, worktreePath: y.worktreePath }
    ];
    const plans = [
        { id: "X", priority: 0, agentType: "x", prompt: "" },
        { id: "Y", priority: 1, agentType: "x", prompt: "" }
    ];
    const final = mergeChildren(repo, "slice/SLICE-CONF", results, plans);
    assert.equal(final[0].status, "DONE");
    assert.equal(final[1].status, "CONFLICTED");
    const branches = execSync("git branch", { cwd: repo }).toString();
    assert.ok(branches.includes("SLICE-CONF-Y"));
});
test("mergeChildren: skips non-DONE children", () => {
    const repo = initRepo();
    execSync("git checkout -q -b slice/SLICE-SKIP", { cwd: repo });
    const results = [
        {
            id: "X",
            status: "FAILED",
            branch: "ghost",
            worktreePath: "/dummy/x",
            error: "boom"
        }
    ];
    const plans = [{ id: "X", priority: 0, agentType: "x", prompt: "" }];
    const final = mergeChildren(repo, "slice/SLICE-SKIP", results, plans);
    assert.equal(final[0].status, "FAILED");
});
