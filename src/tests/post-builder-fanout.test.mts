import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { buildPostBuilderFanout } from "../scripts/lib/post-builder-fanout.mjs";
import { logLearning } from "../scripts/lib/learnings.mjs";

// FEAT-219 AC-8/AC-5: the "memory on" golden test below drives buildMemoryContext
// -> recallSilent (@astragenie/astramem-client, FEAT-231). Neutralize provider
// resolution via the client's own test seam (mirrors memory-context.test.mts)
// so the test is hermetic and deterministic regardless of whether a real
// astramem provider happens to be reachable on the host.
beforeEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

afterEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

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

// FEAT-219 AC-5/AC-8 golden test — mirrors SLICE-2's start-slice AC-5 golden
// test (slice-start.test.mts: "startSlice leaves dispatchInstruction unchanged
// when learningsDigest is empty"). Guards two things at once: (1) memory
// off/absent produces a byte-identical reviewer prompt to the pre-FEAT-219
// template (no accidental header leaking into the default, unconfigured
// path), and (2) when memory IS on, the injected block prepends cleanly
// without garbling the PARALLEL_DISPATCH_CONTRACT v1 wording or the reviewer
// body beneath it (PM pre-mortem follow-up flagged in FEAT-219.md).
test("FEAT-219 golden: memory off/absent is byte-identical; memory on prepends without garbling the contract wording", async () => {
  const repo = await makeRepo();
  try {
    const expectedBody = [
      "You are Reviewer A on the post-builder fanout for slice SLICE-99.",
      "**Slice file**: `.claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_99_test.md`",
      "",
      "**Focus**:",
      "Correctness, regressions, and explicit coverage of each acceptance criterion.",
      "",
      "Read the builder handoff (latest in .claude/artifacts/crew/handoffs/ for this slice).",
      "Write your verdict via `crew write-review-result`. Do NOT pause without writing the artifact."
    ].join("\n");

    // Off/absent (today's default): byte-identical to the pre-FEAT-219 prompt.
    const off = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.equal(off.tasks[0]?.prompt, expectedBody);
    assert.ok(!off.tasks[0]?.prompt.includes("## Recent context"));
    assert.ok(off.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));

    // On: memory-context block prepends, contract wording and reviewer body survive intact.
    await logLearning(repo, {
      key: "flaky-ci",
      insight: "Retry once before failing the gate.",
      agentType: "reviewer"
    });
    const on = await buildPostBuilderFanout(repo, "SLICE-99", {
      config: { memory: { enabled: true } }
    });
    assert.ok(on.tasks[0]?.prompt.startsWith("## Recent context"));
    assert.ok(on.tasks[0]?.prompt.endsWith(expectedBody));
    assert.equal(on.instructions, off.instructions);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
