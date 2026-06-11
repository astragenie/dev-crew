import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildPostBuilderFanout } from "../scripts/lib/post-builder-fanout.mjs";

async function makeRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "fanout-"));
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(sliceDir, { recursive: true });
  await fs.writeFile(
    path.join(sliceDir, "SLICE_99_test.md"),
    "---\nid: SLICE-99\nfeature: FEAT-001\n---\n# SLICE-99\n## Files\n- src/a.mts\n"
  );
  return repo;
}

test("emits N+1 tasks (reviewer-A, reviewer-B, validator)", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.equal(out.tasks.length, 3);
    const roles = out.tasks.map((t) => t.role).sort();
    assert.deepEqual(roles, ["reviewer-A", "reviewer-B", "validator"]);
    const subagents = out.tasks.map((t) => t.subagent_type);
    assert.ok(subagents.includes("crew:validator"));
    assert.equal(subagents.filter((s) => s === "crew:reviewer").length, 2);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("validator prompt independent of reviewers (no reviewer artifact refs)", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    const validator = out.tasks.find((t) => t.role === "validator")!;
    assert.ok(!/reviewer-[AB]/i.test(validator.prompt));
    assert.ok(!/reviews\//.test(validator.prompt));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("instructions reuse PARALLEL_DISPATCH_CONTRACT v1", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.ok(out.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));
    assert.ok(out.instructions.includes("N=3"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("aggregation rules match contract", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.deepEqual(out.aggregation, { halt_on_any_FAIL: true, wait_for_all: true });
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("throws on slice file missing frontmatter header", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "fanout-no-fm-"));
  try {
    const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
    await fs.mkdir(sliceDir, { recursive: true });
    await fs.writeFile(path.join(sliceDir, "SLICE_98_test.md"), "# SLICE-98 without frontmatter\n");
    await assert.rejects(
      () => buildPostBuilderFanout(repo, "SLICE-98"),
      /missing frontmatter header/
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("validator prompt does not embed the inert --slice flag", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    const validator = out.tasks.find((t) => t.role === "validator")!;
    assert.ok(!/--slice\s/i.test(validator.prompt));
    assert.ok(validator.prompt.includes("SLICE-99")); // sliced id still mentioned for humans
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
