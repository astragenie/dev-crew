// FEAT-267 SLICE-2 — crash recovery for an interrupted hierarchical/wave
// dispatch run. Reads a run's worktrees.jsonl + result markers and re-drives
// the finalize/merge step that never ran because the wave was interrupted
// after children committed but before merge-back.
//
// Safety posture (PM scored this autonomous_safe=false — a bad merge from
// stale interrupted state can corrupt the parent branch):
//   - DRY-RUN by default. `recoverRun` only classifies + writes an auditable
//     summary; it performs NO git checkout/merge unless `execute: true`.
//   - A child with real work but no DONE marker is NEVER merged or discarded —
//     it is reclassified to CONFLICTED so the existing mergeChildren path emits
//     a worker-preserved artifact and leaves its worktree/branch intact
//     (needs_manual_review). (AC-4)
//   - A missing worktrees.jsonl throws before any side effect. (AC-5)

import fs from "node:fs";
import path from "node:path";
import { aggregateResults } from "./dispatch-aggregate.mjs";
import { mergeChildren } from "./dispatch-merge.mjs";
import { inventoryWorkerBranch } from "./dispatch-worktree.mjs";
import { DispatchWorktreeError } from "./dispatch-types.mjs";
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";

export type RecoverAction = "merge" | "preserve" | "skip";

export interface RecoverChild {
  id: string;
  status: DispatchResult["status"];
  branch: string;
  worktreePath: string;
  action: RecoverAction;
  reason: string;
}

export interface RecoverOutcome {
  runId: string;
  parentBranch: string;
  executed: boolean;
  children: RecoverChild[];
  summaryPath: string;
}

function dispatchRunDir(repoRoot: string, runId: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
}

// Mirror of dispatch.mts::loadWorktreeLog. Kept local so recover has no
// dependency on the CLI entry point.
function loadWorktreeLog(
  repoRoot: string,
  runId: string
): { branchById: Record<string, string>; cwdById: Record<string, string> } {
  const wtLog = path.join(dispatchRunDir(repoRoot, runId), "worktrees.jsonl");
  const branchById: Record<string, string> = {};
  const cwdById: Record<string, string> = {};
  for (const line of fs.readFileSync(wtLog, "utf8").trim().split("\n")) {
    if (line.trim().length === 0) continue;
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
  return { branchById, cwdById };
}

// A no-marker child is FAILED by aggregateResults. If it actually has work
// (commits on its branch OR uncommitted WIP), it was interrupted, not failed —
// reclassify to CONFLICTED so it is preserved for manual review, never dropped.
function reclassifyInterrupted(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[]
): DispatchResult[] {
  return results.map((r) => {
    if (r.status !== "FAILED" || r.error !== "no marker" || !r.worktreePath) return r;
    let hasWork = false;
    try {
      const inv = inventoryWorkerBranch(repoRoot, r.worktreePath, r.branch, parentBranch);
      hasWork = inv.filesOnBranchNotOnMain.length > 0 || inv.uncommittedWip.length > 0;
    } catch {
      // Worktree gone / branch unreadable — treat as no recoverable work.
      hasWork = false;
    }
    if (!hasWork) return r;
    return {
      ...r,
      status: "CONFLICTED",
      error: "interrupted: work present, no DONE marker — needs manual review"
    };
  });
}

function classifyAction(r: DispatchResult): { action: RecoverAction; reason: string } {
  if (r.status === "DONE") return { action: "merge", reason: "DONE marker present" };
  if (r.status === "FAILED") {
    return { action: "skip", reason: "no marker and no recoverable work" };
  }
  return { action: "preserve", reason: r.error ?? "needs manual review" };
}

function writeRecoverSummary(
  repoRoot: string,
  runId: string,
  parentBranch: string,
  executed: boolean,
  children: RecoverChild[]
): string {
  const lines = [
    `# Dispatch recover — run ${runId}`,
    "",
    `- parent branch: \`${parentBranch}\``,
    `- mode: ${executed ? "EXECUTED (merges applied)" : "DRY RUN (no git side effects)"}`,
    `- children: ${children.length}`,
    "",
    "| id | status | action | branch | reason |",
    "|----|--------|--------|--------|--------|",
    ...children.map(
      (c) => `| ${c.id} | ${c.status} | ${c.action} | \`${c.branch}\` | ${c.reason} |`
    ),
    ""
  ];
  const summaryPath = path.join(
    dispatchRunDir(repoRoot, runId),
    executed ? "recover-summary.md" : "recover-summary.dry-run.md"
  );
  fs.writeFileSync(summaryPath, lines.join("\n"));
  return summaryPath;
}

export function recoverRun(
  repoRoot: string,
  runId: string,
  parentBranch: string,
  opts: { execute?: boolean } = {}
): RecoverOutcome {
  const executed = opts.execute === true;
  const wtLog = path.join(dispatchRunDir(repoRoot, runId), "worktrees.jsonl");
  // AC-5: missing run log → throw before any side effect.
  if (!fs.existsSync(wtLog)) {
    throw new DispatchWorktreeError(
      `no worktrees.jsonl for run "${runId}" (looked in ${wtLog}) — nothing to recover`
    );
  }

  const { branchById, cwdById } = loadWorktreeLog(repoRoot, runId);

  // Guard the "bad merge corrupts the parent branch" risk (the reason this
  // tool is autonomous_safe=false): createChildWorktree records each child on
  // `${parentBranch}-${childId}`. If the operator-supplied --parent-branch
  // doesn't match what the run was dispatched from, mergeChildren would
  // checkout + merge into the WRONG branch. Fail loud BEFORE any git action —
  // this runs in dry-run too, so the mismatch surfaces in the preview.
  for (const [childId, recordedBranch] of Object.entries(branchById)) {
    const expected = `${parentBranch}-${childId}`;
    if (recordedBranch !== expected) {
      throw new DispatchWorktreeError(
        `parent-branch mismatch: run "${runId}" recorded child "${childId}" on branch ` +
          `"${recordedBranch}", but --parent-branch "${parentBranch}" implies "${expected}". ` +
          "Pass the parent branch this run was actually dispatched from."
      );
    }
  }

  const plans: DispatchPlan[] = Object.keys(branchById).map((id) => ({
    id,
    priority: 0,
    agentType: "",
    prompt: ""
  }));

  let results = aggregateResults(repoRoot, runId, plans, branchById, cwdById);
  results = reclassifyInterrupted(repoRoot, parentBranch, results);

  const children: RecoverChild[] = results.map((r) => {
    const { action, reason } = classifyAction(r);
    return {
      id: r.id,
      status: r.status,
      branch: r.branch,
      worktreePath: r.worktreePath,
      action,
      reason
    };
  });

  // Only the execute path touches git: merge DONE children in priority order
  // and emit worker-preserved artifacts for CONFLICTED/BLOCKED children.
  if (executed) {
    mergeChildren(repoRoot, parentBranch, results, plans, runId);
  }

  const summaryPath = writeRecoverSummary(repoRoot, runId, parentBranch, executed, children);
  return { runId, parentBranch, executed, children, summaryPath };
}
