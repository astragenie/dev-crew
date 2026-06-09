import type { DispatchPlan } from "./dispatch-types.mjs";
import { augmentPrompt } from "./dispatch-prompt.mjs";

export type AgentBatchCall = {
  description: string;
  subagent_type: string;
  prompt: string;
};

type BatchArgs = {
  runId: string;
  depth: number;
  childCwdById: Record<string, string>;
  childBranchById: Record<string, string>;
};

export function buildAgentBatch(
  plans: DispatchPlan[],
  args: BatchArgs,
): AgentBatchCall[] {
  return plans.map((plan) => ({
    description: `dispatch ${plan.id}`,
    subagent_type: plan.agentType,
    prompt: augmentPrompt(plan.prompt, {
      runId: args.runId,
      depth: args.depth,
      childCwd: args.childCwdById[plan.id] ?? "",
      childBranch: args.childBranchById[plan.id] ?? "",
      childId: plan.id,
    }),
  }));
}
