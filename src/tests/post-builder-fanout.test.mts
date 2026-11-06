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
    assert.equal(subagents.filter((s) => s === "devcrew:reviewer").length, 2);
    assert.ok(!subagents.includes("devcrew:verifier" as never));
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
    assert.equal(out.tasks[0].subagent_type, "devcrew:reviewer");
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

test("no config produces no validator / devcrew:verifier task", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    assert.ok(out.tasks.every((t) => t.role !== ("validator" as never)));
    assert.ok(out.tasks.every((t) => t.subagent_type === "devcrew:reviewer"));
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

// FEAT-180 (issue #247): regression coverage for the restored "## Not
// checked" required-section block (originally shipped in
// commands/slice-review-ladder.md at 42d044c7, dropped by the FEAT-277
// consolidation at ee5cea95). Asserts the block appears, with role-specific
// wording, in both Reviewer A and Reviewer B prompts.
test("both reviewer prompts include the '## Not checked' required section with the --not-checked flag instruction", async () => {
  const repo = await makeRepo();
  try {
    const out = await buildPostBuilderFanout(repo, "SLICE-99");
    const [reviewerA, reviewerB] = out.tasks;

    for (const task of [reviewerA, reviewerB]) {
      assert.ok(task, "expected both reviewer tasks to be present");
      assert.ok(task!.prompt.includes("## Not checked (required, ≥2 items)"));
      assert.ok(task!.prompt.includes("List at least 2 things you deliberately did NOT cover"));
      assert.ok(
        task!.prompt.includes('crew write-review-result --not-checked "<item-a>,<item-b>"')
      );
    }

    // Role-specific hint text differs between A and B (mirrors the original
    // per-role examples recovered from 42d044c7).
    assert.ok(reviewerA!.prompt.includes("performance characteristics"));
    assert.ok(reviewerB!.prompt.includes("owned by Reviewer A"));

    // The section sits between **Focus** and the write-review-result
    // instruction line, not after it.
    const idxFocus = reviewerA!.prompt.indexOf("**Focus**:");
    const idxNotChecked = reviewerA!.prompt.indexOf("## Not checked");
    const idxHandoff = reviewerA!.prompt.indexOf("Read the builder handoff");
    assert.ok(idxFocus < idxNotChecked && idxNotChecked < idxHandoff);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// T3 (wave plan 20260716T133000Z, plan-extraction-quality-templates-validity
// v2): reviewer prompts must split required output into a durable-findings
// section (transferable lessons, capped, "none" legal) and a run-evidence
// section (gate outputs/timings/mechanics — everything ephemeral). Pins
// presence + a negative/positive example pairing for both Reviewer A and
// Reviewer B, across the default two-reviewer ladder and each single-entry
// ladder.
test("reviewer prompts include '## Durable findings' and '## Run evidence (ephemeral)' sections for both roles and both ladder configs", async () => {
  const repo = await makeRepo();
  try {
    const ladderConfigs: Array<Record<string, any> | undefined> = [
      undefined,
      { config: { reviewers: { ladder: ["A"] } } },
      { config: { reviewers: { ladder: ["B"] } } }
    ];

    for (const opts of ladderConfigs) {
      const out = opts
        ? await buildPostBuilderFanout(repo, "SLICE-99", opts)
        : await buildPostBuilderFanout(repo, "SLICE-99");

      assert.ok(out.tasks.length > 0, "expected at least one reviewer task");
      for (const task of out.tasks) {
        assert.ok(task.prompt.includes('## Durable findings (max 3, "none" is legal)'));
        assert.ok(task.prompt.includes('Bad: "tsc was clean."'));
        assert.ok(task.prompt.includes("## Run evidence (ephemeral)"));
        assert.ok(task.prompt.includes("Gate outputs, timings, file lists, verdict mechanics"));

        // Ordering: Not checked -> Durable findings -> Run evidence -> handoff.
        const idxNotChecked = task.prompt.indexOf("## Not checked");
        const idxDurable = task.prompt.indexOf("## Durable findings");
        const idxRunEvidence = task.prompt.indexOf("## Run evidence");
        const idxHandoff = task.prompt.indexOf("Read the builder handoff");
        assert.ok(
          idxNotChecked < idxDurable && idxDurable < idxRunEvidence && idxRunEvidence < idxHandoff
        );
      }
    }
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
      "## Not checked (required, ≥2 items)",
      "List at least 2 things you deliberately did NOT cover in this review pass.",
      "e.g. performance characteristics, cross-platform behavior beyond the CI environment, interaction with concurrent slice changes on other branches — anything outside correctness/regressions/AC coverage.",
      'Pass them via `crew write-review-result --not-checked "<item-a>,<item-b>"`.',
      "",
      '## Durable findings (max 3, "none" is legal)',
      "Transferable lessons only — a bug CLASS to watch for next time, a contract truth discovered, or decision rationale. Never run-state.",
      'Bad: "tsc was clean." Good: "Provider adapters here swallow timeout errors on bare catch — check for that shape in any new provider.mts."',
      "",
      "## Run evidence (ephemeral)",
      "Gate outputs, timings, file lists, verdict mechanics — everything else about this run.",
      "",
      "Read the builder handoff (latest in .claude/artifacts/crew/handoffs/ for this slice).",
      "Write your verdict via `crew write-review-result --reviewer A --decision <approved|approved_with_notes|rejected>`. The `--reviewer A` key is what the aggregated review gate counts; omitting it collapses both ladder reviewers onto one key. Do NOT pause without writing the artifact."
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
