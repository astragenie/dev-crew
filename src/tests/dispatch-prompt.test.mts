// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import { augmentPrompt } from "../scripts/lib/dispatch-prompt.mjs";

test("augmentPrompt: includes LOOP_DISPATCH_DEPTH with depth+1", () => {
  const out = augmentPrompt("base prompt", {
    runId: "r1",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "slice/X-FE",
    childId: "FE"
  });
  assert.match(out, /LOOP_DISPATCH_DEPTH=1/);
});

test("augmentPrompt: includes runId for trace correlation", () => {
  const out = augmentPrompt("base", {
    runId: "run-abc",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c"
  });
  assert.match(out, /LOOP_DISPATCH_RUN_ID=run-abc/);
});

test("augmentPrompt: includes marker-write contract path", () => {
  const out = augmentPrompt("base", {
    runId: "r2",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "FE"
  });
  assert.match(out, /\.claude\/artifacts\/loop\/dispatch\/r2\/FE\.result\.json/);
});

test("augmentPrompt: instructs grandchild forwarding via env or --depth flag", () => {
  const out = augmentPrompt("base", {
    runId: "r3",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c"
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
    childId: "c"
  });
  assert.match(out, /ORIGINAL_BODY_HERE/);
});
