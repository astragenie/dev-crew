// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import { augmentPrompt } from "../scripts/lib/dispatch-prompt.mjs";

// Shared repoRoot — must be supplied after FEAT-197 / SLICE-131.
const repoRoot = "/main/repo";

test("augmentPrompt: includes LOOP_DISPATCH_DEPTH with depth+1", () => {
  const out = augmentPrompt("base prompt", {
    runId: "r1",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "slice/X-FE",
    childId: "FE",
    repoRoot
  });
  assert.match(out, /LOOP_DISPATCH_DEPTH=1/);
});

test("augmentPrompt: includes runId for trace correlation", () => {
  const out = augmentPrompt("base", {
    runId: "run-abc",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c",
    repoRoot
  });
  assert.match(out, /LOOP_DISPATCH_RUN_ID=run-abc/);
});

test("augmentPrompt: includes marker-write contract path (absolute)", () => {
  const out = augmentPrompt("base", {
    runId: "r2",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "FE",
    repoRoot
  });
  // After FEAT-197 the path is absolute — check for the childId and runId segments.
  assert.match(out, /r2/);
  assert.match(out, /FE\.result\.json/);
  // Must not use the old bare relative-path form as the marker instruction.
  assert.doesNotMatch(out, /ABSOLUTE path:.*?`\.claude\//);
});

test("augmentPrompt: instructs grandchild forwarding via env or --depth flag", () => {
  const out = augmentPrompt("base", {
    runId: "r3",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c",
    repoRoot
  });
  assert.match(out, /LOOP_DISPATCH_DEPTH=/);
  assert.match(out, /--depth/);
});

test("augmentPrompt: preserves original prompt body", () => {
  const out = augmentPrompt("ORIGINAL_BODY_HERE", {
    runId: "r",
    depth: 0,
    childCwd: "/x",
    childBranch: "b",
    childId: "c",
    repoRoot
  });
  assert.match(out, /ORIGINAL_BODY_HERE/);
});
