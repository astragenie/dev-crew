// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";

import { runParallelGroups } from "../scripts/lib/phase-gate/parallel-runner.mjs";

test("runParallelGroups runs all groups concurrently and tags output", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "console.log('lint-ok'); process.exit(0)"] }],
    typecheck: [{ cmd: "node", args: ["-e", "console.log('tc-ok'); process.exit(0)"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok'); process.exit(0)"] }]
  };
  const t0 = Date.now();
  const result = await runParallelGroups(groups);
  const elapsed = Date.now() - t0;
  assert.equal(result.exitCode, 0);
  assert.ok(result.combinedLog.includes("[lint] lint-ok"));
  assert.ok(result.combinedLog.includes("[typecheck] tc-ok"));
  assert.ok(result.combinedLog.includes("[test] test-ok"));
  assert.ok(elapsed < 5000, `expected <5s, got ${elapsed}ms`);
});

test("runParallelGroups fails-fast with first non-zero exit code", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "process.exit(7)"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok')"] }]
  };
  const result = await runParallelGroups(groups);
  assert.equal(result.exitCode, 7);
  assert.equal(result.failedGroup, "lint");
});

test("runParallelGroups --only filters to a single group", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "console.log('lint-ok')"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok')"] }]
  };
  const result = await runParallelGroups(groups, { only: "test" });
  assert.ok(!result.combinedLog.includes("lint-ok"));
  assert.ok(result.combinedLog.includes("[test] test-ok"));
});
