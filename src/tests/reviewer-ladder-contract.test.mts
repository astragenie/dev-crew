import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildReviewLadder } from "../scripts/lib/reviewer-ladder.mjs";

test("review-ladder instructions include PARALLEL_DISPATCH_CONTRACT v1 block", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ladder-contract-"));
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(sliceDir, { recursive: true });
  await fs.writeFile(
    path.join(sliceDir, "SLICE_99_test.md"),
    "---\nid: SLICE-99\n---\n# SLICE-99\n## Files\n- src/a.mts\n"
  );
  try {
    const ladder = await buildReviewLadder(repo, "SLICE-99");
    assert.ok(ladder.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));
    assert.ok(
      ladder.instructions.includes(
        "required: emit exactly ONE message containing N=2 Agent tool calls"
      )
    );
    assert.ok(ladder.instructions.includes("forbidden: send any message between dispatches"));
    assert.ok(ladder.instructions.includes("forbidden: wait for one reviewer return"));
    assert.ok(ladder.instructions.includes("violation: serial-reviewer-warning"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("review-ladder emits N=3 contract when reviewers.ladder is multidim preset", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ladder-multidim-"));
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(sliceDir, { recursive: true });
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(sliceDir, "SLICE_99_test.md"),
    "---\nid: SLICE-99\n---\n# SLICE-99\n## Files\n- src/a.mts\n"
  );
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ reviewers: { ladder: { preset: "multidim" } } })
  );
  try {
    const ladder = await buildReviewLadder(repo, "SLICE-99");
    assert.ok(
      ladder.instructions.includes(
        "required: emit exactly ONE message containing N=3 Agent tool calls"
      ),
      `expected N=3, got instructions:\n${ladder.instructions}`
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
