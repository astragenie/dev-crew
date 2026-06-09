// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { prepareDispatch, dispatchHierarchical } from "../scripts/lib/hierarchical-dispatch.mjs";

test("prepareDispatch: enforces gates, spawns worktrees, returns batch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-PD", { cwd: repo });
  const plans = [
    { id: "A", priority: 0, agentType: "crew:builder", prompt: "do A" },
    { id: "B", priority: 1, agentType: "crew:builder", prompt: "do B" }
  ];
  const prepared = prepareDispatch(plans, {
    parentBranch: "slice/SLICE-PD",
    repoRoot: repo,
    depth: 0,
    configPath: path.join(repo, ".claude/loop.json")
  });
  assert.equal(prepared.batch.length, 2);
  assert.ok(prepared.runId);
  assert.match(prepared.batch[0].prompt, /do A/);
  assert.ok(fs.existsSync(prepared.cwdById.A));
});

test("dispatchHierarchical: end-to-end with mock runAgentBatch — happy path", async () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-E2E", { cwd: repo });
  const plans = [{ id: "A", priority: 0, agentType: "crew:builder", prompt: "noop" }];
  const runAgentBatch = async (batch, ctx) => {
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
      fs.mkdirSync(dir, { recursive: true });
      const cwd = ctx.cwdById[id];
      fs.writeFileSync(path.join(cwd, `${id}.touch`), "hi\n");
      execSync(`git add . && git commit -q -m "child ${id}"`, { cwd });
      fs.writeFileSync(
        path.join(dir, `${id}.result.json`),
        JSON.stringify({
          id,
          status: "DONE",
          branch: ctx.branchById[id],
          worktreePath: cwd
        })
      );
    }
  };
  const results = await dispatchHierarchical(
    plans,
    {
      parentBranch: "slice/SLICE-E2E",
      repoRoot: repo,
      depth: 0,
      configPath: path.join(repo, ".claude/loop.json")
    },
    runAgentBatch
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "DONE");
  assert.ok(fs.existsSync(path.join(repo, "A.touch")));
});
