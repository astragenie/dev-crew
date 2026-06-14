import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import { readMarker } from "./dispatch-trace.mjs";

export function aggregateResults(
  repoRoot: string,
  runId: string,
  plans: DispatchPlan[],
  branchById: Record<string, string>,
  cwdById: Record<string, string>
): DispatchResult[] {
  return plans.map((plan) => {
    // AC-4: main repo is checked first; if found, it wins unconditionally.
    const marker = readMarker(repoRoot, runId, plan.id);
    if (marker) return marker;

    // AC-3: fallback — child wrote the marker to its own worktree CWD
    // instead of the main repo (e.g. relative path resolved inside the worktree).
    const worktreePath = cwdById[plan.id];
    if (worktreePath) {
      const wtMarker = readMarker(worktreePath, runId, plan.id);
      if (wtMarker) return wtMarker;
    }

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
