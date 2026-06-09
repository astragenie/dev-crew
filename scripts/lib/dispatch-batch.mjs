import { augmentPrompt } from "./dispatch-prompt.mjs";
export function buildAgentBatch(plans, args) {
    return plans.map((plan) => ({
        description: `dispatch ${plan.id}`,
        subagent_type: plan.agentType,
        prompt: augmentPrompt(plan.prompt, {
            runId: args.runId,
            depth: args.depth,
            childCwd: args.childCwdById[plan.id] ?? "",
            childBranch: args.childBranchById[plan.id] ?? "",
            childId: plan.id
        })
    }));
}
