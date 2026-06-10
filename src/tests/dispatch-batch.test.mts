// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import { buildAgentBatch, type AgentBatchCall } from "../scripts/lib/dispatch-batch.mjs";

test("buildAgentBatch: produces one call per plan with augmented prompt", () => {
  const plans: any[] = [
    {
      id: "FE",
      priority: 0,
      agentType: "crew:builder-fe",
      prompt: "build fe"
    },
    {
      id: "BE",
      priority: 1,
      agentType: "crew:builder-be",
      prompt: "build be"
    }
  ];
  const calls: AgentBatchCall[] = buildAgentBatch(plans, {
    runId: "r1",
    depth: 0,
    childCwdById: { FE: "/p/fe", BE: "/p/be" },
    childBranchById: { FE: "slice/X-FE", BE: "slice/X-BE" }
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].subagent_type, "crew:builder-fe");
  assert.match(calls[0].prompt, /build fe/);
  assert.match(calls[0].prompt, /LOOP_DISPATCH_DEPTH=1/);
  assert.equal(calls[0].description, "dispatch FE");
});
