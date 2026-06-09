import { execFileSync } from "node:child_process";
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import { removeChildWorktree } from "./dispatch-worktree.mjs";

export function mergeChildren(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  plans: DispatchPlan[]
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
      updated.set(child.id, {
        ...child,
        status: "CONFLICTED",
        error: `merge conflict against ${parentBranch}`
      });
    }
  }
  return results.map((r) => updated.get(r.id) ?? r);
}
