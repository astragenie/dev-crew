import { readMarker } from "./dispatch-trace.mjs";
export function aggregateResults(repoRoot, runId, plans, branchById, cwdById) {
    return plans.map((plan) => {
        const marker = readMarker(repoRoot, runId, plan.id);
        if (marker)
            return marker;
        return {
            id: plan.id,
            status: "FAILED",
            branch: branchById[plan.id] ?? "",
            worktreePath: cwdById[plan.id] ?? "",
            error: "no marker",
            costUsd: null
        };
    });
}
