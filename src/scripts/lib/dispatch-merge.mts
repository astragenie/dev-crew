import { execFileSync } from "node:child_process";
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import {
  removeChildWorktree,
  inventoryWorkerBranch,
  appendInventoryLog,
  writeWorkerPreservedArtifact,
  writeWorkerFailedArtifact,
  cherryPickHandoffsFromBranch,
  type WorkerInventory,
  type CherryPickResult
} from "./dispatch-worktree.mjs";

type InventoryMap = Map<string, WorkerInventory>;
type CherryPickMap = Map<string, CherryPickResult>;

function collectInventories(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  runId: string | undefined
): InventoryMap {
  const map: InventoryMap = new Map();
  for (const child of results) {
    const inventory = inventoryWorkerBranch(
      repoRoot,
      child.worktreePath,
      child.branch,
      parentBranch
    );
    map.set(child.id, inventory);
    if (runId) {
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: child.status
      });
    }
  }
  return map;
}

/**
 * Cherry-pick handoff commits from every CONFLICTED and FAIL child branch
 * onto parentBranch. Returns a map from childId → CherryPickResult.
 * Precondition: parentBranch is checked out at repoRoot (guaranteed by
 * `mergeChildren` running `git checkout parentBranch` before calling this).
 */
function cherryPickNonDoneHandoffs(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  runId: string | undefined,
  inventoryMap: InventoryMap
): CherryPickMap {
  const map: CherryPickMap = new Map();
  for (const child of results) {
    if (child.status === "DONE") continue;
    const cpResult = cherryPickHandoffsFromBranch(repoRoot, child.branch, parentBranch);
    map.set(child.id, cpResult);
    if (runId) {
      const inventory = inventoryMap.get(child.id)!;
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: `${child.status}:cherry-pick`,
        cherryPickResult: cpResult
      });
    }
  }
  return map;
}

function emitPreservedArtifacts(
  repoRoot: string,
  runId: string,
  results: DispatchResult[],
  inventoryMap: InventoryMap
): void {
  for (const child of results) {
    if (child.status === "DONE") continue;
    if (child.status === "FAILED") continue;
    const inventory = inventoryMap.get(child.id)!;
    writeWorkerPreservedArtifact(
      repoRoot,
      runId,
      child.id,
      child.status,
      inventory,
      `Worker exited with status \`${child.status}\`. Worktree + branch preserved. Inspect, cherry-pick anything worth keeping, then clean up manually OR rerun via \`/devcrew:fix\`.`
    );
  }
}

function emitFailedArtifacts(
  repoRoot: string,
  runId: string,
  results: DispatchResult[],
  inventoryMap: InventoryMap,
  cherryPickMap: CherryPickMap
): void {
  for (const child of results) {
    if (child.status !== "FAILED") continue;
    const inventory = inventoryMap.get(child.id)!;
    const cpResult = cherryPickMap.get(child.id) ?? {
      cherryPicked: [],
      skippedConflict: [],
      aborted: false
    };
    writeWorkerFailedArtifact(repoRoot, runId, child.id, inventory, cpResult);
  }
}

function mergeOne(
  repoRoot: string,
  parentBranch: string,
  runId: string | undefined,
  child: DispatchResult,
  inventory: WorkerInventory,
  updated: Map<string, DispatchResult>
): void {
  try {
    execFileSync(
      "git",
      ["merge", "--no-ff", child.branch, "-m", `merge ${child.id} (FEAT-020 dispatch)`],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
    );
    removeChildWorktree(repoRoot, child.worktreePath, child.branch);
    updated.set(child.id, { ...child, status: "DONE" });
  } catch {
    abortMerge(repoRoot);
    if (runId) {
      writeWorkerPreservedArtifact(
        repoRoot,
        runId,
        child.id,
        "CONFLICTED",
        inventory,
        `Merge against \`${parentBranch}\` conflicted. Worktree + branch left in place for inspection. Resolve conflicts manually OR rerun the slice via \`/devcrew:fix\`. Once resolved, run \`git worktree remove ${child.worktreePath}\` + \`git branch -D ${child.branch}\`.`
      );
    }
    updated.set(child.id, {
      ...child,
      status: "CONFLICTED",
      error: `merge conflict against ${parentBranch}`
    });
  }
}

function abortMerge(repoRoot: string): void {
  try {
    execFileSync("git", ["merge", "--abort"], { cwd: repoRoot });
  } catch {
    // abort may fail if no merge in progress; ignore
  }
}

export function mergeChildren(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  plans: DispatchPlan[],
  runId?: string
): DispatchResult[] {
  const priorityById = new Map(plans.map((p) => [p.id, p.priority]));
  execFileSync("git", ["checkout", parentBranch], { cwd: repoRoot });

  // FEAT-202 SLICE-A: inventory ALL children (DONE, CONFLICTED, FAIL) BEFORE
  // any removeChildWorktree call so no on-branch work is lost silently.
  const inventoryMap = collectInventories(repoRoot, parentBranch, results, runId);

  // FEAT-202 SLICE-B: cherry-pick handoff commits from CONFLICTED/FAIL branches
  // onto parentBranch before emitting triage artifacts. parentBranch is checked
  // out above, satisfying the precondition of cherryPickHandoffsFromBranch.
  const cherryPickMap = cherryPickNonDoneHandoffs(
    repoRoot,
    parentBranch,
    results,
    runId,
    inventoryMap
  );

  // Emit worker-preserved artifacts for CONFLICTED (non-DONE, non-FAIL) children.
  if (runId) emitPreservedArtifacts(repoRoot, runId, results, inventoryMap);

  // Emit worker-failed artifacts for FAIL children with cherry-pick summary.
  if (runId) emitFailedArtifacts(repoRoot, runId, results, inventoryMap, cherryPickMap);

  // Process DONE children in priority order: merge then remove worktree.
  const order = results
    .filter((r) => r.status === "DONE")
    .map((r) => ({ r, p: priorityById.get(r.id) ?? 0 }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.r);
  const updated = new Map<string, DispatchResult>();
  for (const child of order) {
    mergeOne(repoRoot, parentBranch, runId, child, inventoryMap.get(child.id)!, updated);
  }
  return results.map((r) => updated.get(r.id) ?? r);
}
