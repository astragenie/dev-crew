import { execFileSync } from "node:child_process";
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import {
  removeChildWorktree,
  inventoryWorkerBranch,
  appendInventoryLog,
  writeWorkerPreservedArtifact
} from "./dispatch-worktree.mjs";

export function mergeChildren(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  plans: DispatchPlan[],
  runId?: string
): DispatchResult[] {
  const priorityById = new Map(plans.map((p) => [p.id, p.priority]));
  execFileSync("git", ["checkout", parentBranch], { cwd: repoRoot });
  const order = results
    .filter((r) => r.status === "DONE")
    .map((r) => ({ r, p: priorityById.get(r.id) ?? 0 }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.r);
  const updated = new Map<string, DispatchResult>();
  for (const child of order) {
    // FEAT-202 SLICE-A: inventory BEFORE any destructive op. Read-only.
    const inventory = inventoryWorkerBranch(
      repoRoot,
      child.worktreePath,
      child.branch,
      parentBranch
    );
    if (runId) {
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: "PRE_MERGE"
      });
    }
    try {
      execFileSync(
        "git",
        ["merge", "--no-ff", child.branch, "-m", `merge ${child.id} (FEAT-020 dispatch)`],
        { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
      );
      removeChildWorktree(repoRoot, child.worktreePath, child.branch);
      updated.set(child.id, { ...child, status: "DONE" });
    } catch {
      try {
        execFileSync("git", ["merge", "--abort"], { cwd: repoRoot });
      } catch {
        // abort may fail if no merge in progress; ignore
      }
      // FEAT-202 SLICE-A: CONFLICTED preserved — emit operator audit hint.
      if (runId) {
        writeWorkerPreservedArtifact(
          repoRoot,
          runId,
          child.id,
          "CONFLICTED",
          inventory,
          `Merge against \`${parentBranch}\` conflicted. Worktree + branch left in place for inspection. Resolve conflicts manually OR rerun the slice via \`/crew:fix\`. Once resolved, run \`git worktree remove ${child.worktreePath}\` + \`git branch -D ${child.branch}\`.`
        );
      }
      updated.set(child.id, {
        ...child,
        status: "CONFLICTED",
        error: `merge conflict against ${parentBranch}`
      });
    }
  }
  // FEAT-202 SLICE-A: also emit audit hints for FAIL / BLOCKED children that
  // never reach the merge loop (filter at line 14 strips them). Without this,
  // FAIL workers orphan their worktrees silently with no operator trail.
  if (runId) {
    const nonDoneIds = new Set(
      results.filter((r) => r.status !== "DONE").map((r) => r.id)
    );
    for (const child of results) {
      if (!nonDoneIds.has(child.id)) continue;
      const inventory = inventoryWorkerBranch(
        repoRoot,
        child.worktreePath,
        child.branch,
        parentBranch
      );
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: child.status
      });
      writeWorkerPreservedArtifact(
        repoRoot,
        runId,
        child.id,
        child.status,
        inventory,
        `Worker exited with status \`${child.status}\`. Worktree + branch preserved. Inspect, cherry-pick anything worth keeping, then clean up manually OR rerun via \`/crew:fix\`.`
      );
    }
  }
  return results.map((r) => updated.get(r.id) ?? r);
}
