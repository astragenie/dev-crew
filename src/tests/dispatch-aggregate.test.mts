// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { aggregateResults } from "../scripts/lib/dispatch-aggregate.mjs";

test("aggregateResults: present markers used as canonical", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-agg-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run1");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "FE.result.json"),
    JSON.stringify({
      id: "FE",
      status: "DONE",
      branch: "slice/X-FE",
      worktreePath: "/p/fe"
    })
  );
  const plans: any[] = [
    { id: "FE", priority: 0, agentType: "x", prompt: "" },
    { id: "BE", priority: 1, agentType: "x", prompt: "" }
  ];
  const branchById = { FE: "slice/X-FE", BE: "slice/X-BE" };
  const cwdById = { FE: "/p/fe", BE: "/p/be" };
  const results = aggregateResults(repo, "run1", plans, branchById, cwdById);
  assert.equal(results[0].status, "DONE");
  assert.equal(results[1].status, "FAILED");
  assert.match(results[1].error ?? "", /no marker/);
  assert.equal(results[1].branch, "slice/X-BE");
});

test("aggregateResults: preserves input plan order", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-agg-"));
  const plans: any[] = [
    { id: "B", priority: 1, agentType: "x", prompt: "" },
    { id: "A", priority: 0, agentType: "x", prompt: "" }
  ];
  const results = aggregateResults(
    repo,
    "run-empty",
    plans,
    { A: "ba", B: "bb" },
    { A: "/a", B: "/b" }
  );
  assert.equal(results[0].id, "B");
  assert.equal(results[1].id, "A");
});
