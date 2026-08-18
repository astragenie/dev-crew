// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { dispatchHierarchical, type DispatchPlan } from "../scripts/lib/hierarchical-dispatch.mjs";

function makeStubAgent(repo, perChild) {
  return async (batch, ctx) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      const branch = ctx.branchById[id];
      const action = perChild(id, cwd);
      if (action.commit) {
        fs.writeFileSync(path.join(cwd, action.commit), `${id}\n`);
        execSync(`git add . && git commit -qm "child ${id}"`, { cwd });
      }
      const marker = {
        id,
        status: action.status,
        branch,
        worktreePath: cwd,
        ...(action.status !== "DONE" ? { error: "stub failure" } : {})
      };
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify(marker));
    }
  };
}

test("integration: happy path — 2 children both DONE, both merge clean", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/HP", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "A", priority: 0, agentType: "crew:fullstack-dev", prompt: "do A" },
    { id: "B", priority: 1, agentType: "crew:fullstack-dev", prompt: "do B" }
  ];
  const stub = makeStubAgent(repo, (id) => ({
    status: "DONE",
    commit: `${id}.txt`
  }));
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/HP", repoRoot: repo, depth: 0 },
    stub
  );
  assert.equal(results.length, 2);
  assert.equal(results[0].status, "DONE");
  assert.equal(results[1].status, "DONE");
  assert.ok(fs.existsSync(path.join(repo, "A.txt")));
  assert.ok(fs.existsSync(path.join(repo, "B.txt")));
});

test("integration: one child FAILED — sibling still merges", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/MIX", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "OK", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "BAD", priority: 1, agentType: "crew:fullstack-dev", prompt: "" }
  ];
  const stub = makeStubAgent(repo, (id) =>
    id === "OK" ? { status: "DONE", commit: "ok.txt" } : { status: "FAILED" }
  );
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/MIX", repoRoot: repo, depth: 0 },
    stub
  );
  assert.equal(results.find((r) => r.id === "OK")?.status, "DONE");
  assert.equal(results.find((r) => r.id === "BAD")?.status, "FAILED");
  assert.ok(fs.existsSync(path.join(repo, "ok.txt")));
});

test("integration: merge conflict surfaces CONFLICTED, both worktrees preserved", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/CONF", { cwd: repo });
  fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
  execSync("git add . && git commit -qm base", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "X", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "Y", priority: 1, agentType: "crew:fullstack-dev", prompt: "" }
  ];
  const stub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      const branch = ctx.branchById[id];
      fs.writeFileSync(path.join(cwd, "shared.txt"), `${id}-version\n`);
      execSync(`git add . && git commit -qm "${id}"`, { cwd });
      fs.writeFileSync(
        path.join(dir, `${id}.result.json`),
        JSON.stringify({
          id,
          status: "DONE",
          branch,
          worktreePath: cwd
        })
      );
    }
  };
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/CONF", repoRoot: repo, depth: 0 },
    stub
  );
  const x = results.find((r) => r.id === "X");
  const y = results.find((r) => r.id === "Y");
  assert.equal(x?.status, "DONE");
  assert.equal(y?.status, "CONFLICTED");
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(branches.includes("slice/CONF-Y"));
});

test("integration: depth cap at recursion boundary throws inside child", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/DC", { cwd: repo });
  fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      dispatchLimits: { maxDepth: 1, maxChildrenPerBatch: 8 }
    })
  );
  execSync("git add .claude/loop.json && git commit -qm config", { cwd: repo });
  const childStub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      let error = "";
      try {
        await dispatchHierarchical(
          [{ id: "GC", priority: 0, agentType: "x", prompt: "" }],
          {
            parentBranch: ctx.branchById[id],
            repoRoot: cwd,
            depth: 1,
            configPath: path.join(repo, ".claude/loop.json")
          },
          async () => {}
        );
      } catch (e) {
        error = (e as Error).name;
      }
      fs.writeFileSync(
        path.join(dir, `${id}.result.json`),
        JSON.stringify({
          id,
          status: "FAILED",
          branch: ctx.branchById[id],
          worktreePath: cwd,
          error
        })
      );
    }
  };
  const plans = [{ id: "C", priority: 0, agentType: "x", prompt: "" }];
  const results = await dispatchHierarchical(
    plans,
    {
      parentBranch: "slice/DC",
      repoRoot: repo,
      depth: 0,
      configPath: path.join(repo, ".claude/loop.json")
    },
    childStub
  );
  assert.equal(results[0].status, "FAILED");
  assert.match(results[0].error ?? "", /DispatchDepthExceeded/);
});

test("integration: dirty parent branch refused", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/DIRTY", { cwd: repo });
  fs.writeFileSync(path.join(repo, "uncommitted.txt"), "x");
  await assert.rejects(
    dispatchHierarchical(
      [{ id: "C", priority: 0, agentType: "x", prompt: "" }],
      { parentBranch: "slice/DIRTY", repoRoot: repo, depth: 0 },
      async () => {}
    ),
    (e: Error) => e.name === "DispatchWorktreeError"
  );
});

test("integration: loop dispatch --help routes via spawnSync child", () => {
  const out = execFileSync("bun", ["src/scripts/loop.mts", "dispatch", "--help"], {
    shell: process.platform === "win32"
  }).toString();
  assert.match(out, /bun src\/scripts\/dispatch\.mts prepare/);
});
