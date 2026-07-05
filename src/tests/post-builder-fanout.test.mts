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

test("default ladder emits two reviewers, no validator (N=2)", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.equal(out.tasks.length, 2);
    assert.deepEqual(
      out.tasks.map((t) => t.role),
      ["reviewer-A", "reviewer-B"]
    );
    const subagents = out.tasks.map((t) => t.subagent_type);
    assert.equal(subagents.filter((s) => s === "crew:inspector").length, 2);
    assert.ok(!subagents.includes("crew:verifier" as never));
    assert.ok(out.instructions.includes("N=2"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("single-entry ladder ['A'] dispatches ONE reviewer, no validator (N=1)", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { reviewers: { ladder: ["A"] } }
    });
    assert.equal(out.tasks.length, 1);
    assert.deepEqual(
      out.tasks.map((t) => t.role),
      ["reviewer-A"]
    );
    assert.equal(out.tasks[0].subagent_type, "crew:inspector");
    assert.ok(out.instructions.includes("N=1"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("single-entry ladder ['B'] dispatches only Reviewer B", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { reviewers: { ladder: ["B"] } }
    });
    assert.deepEqual(
      out.tasks.map((t) => t.role),
      ["reviewer-B"]
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("empty / invalid ladder falls back to the two-reviewer default", async () => {
  const repo = await makeRepo();
  try {
    const empty = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { reviewers: { ladder: [] } }
    });
    assert.equal(empty.tasks.length, 2);
    const bogus = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { reviewers: { ladder: ["Z", 7, null] } }
    });
    assert.equal(bogus.tasks.length, 2);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("ladder is deduped and order-preserving", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { reviewers: { ladder: ["B", "A", "b"] } }
    });
    assert.deepEqual(
      out.tasks.map((t) => t.role),
      ["reviewer-B", "reviewer-A"]
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("no config produces no validator / crew:verifier task", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.ok(out.tasks.every((t) => t.role !== ("validator" as never)));
    assert.ok(out.tasks.every((t) => t.subagent_type === "crew:inspector"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("instructions reuse PARALLEL_DISPATCH_CONTRACT v1", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.ok(out.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));
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
