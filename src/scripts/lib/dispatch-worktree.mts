import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DispatchWorktreeError } from "./dispatch-types.mjs";
import { validateBranchName } from "./dispatch-gates.mjs";

type SpawnArgs = {
  repoRoot: string;
  parentBranch: string;
  childId: string;
  depth: number;
  runId: string;
};

export function preflightGitClean(
  repoRoot: string,
  parentBranch: string,
): void {
  try {
    execFileSync("git", ["rev-parse", "--verify", parentBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new DispatchWorktreeError(`parentBranch not found: ${parentBranch}`);
  }
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
  }).toString();
  if (status.trim().length > 0) {
    throw new DispatchWorktreeError(`working tree dirty on ${parentBranch}`);
  }
  execFileSync("git", ["worktree", "prune"], { cwd: repoRoot });
}

export function createChildWorktree(args: SpawnArgs): {
  worktreePath: string;
  branch: string;
} {
  const { repoRoot, parentBranch, childId, depth, runId } = args;
  const childBranch = `${parentBranch}-${childId}`;
  validateBranchName(childBranch);
  const baseName = path.basename(repoRoot);
  const worktreePath = path.join(
    path.dirname(repoRoot),
    `${baseName}-${childId}-${depth}`,
  );
  try {
    execFileSync(
      "git",
      ["worktree", "add", worktreePath, parentBranch, "-b", childBranch],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    throw new DispatchWorktreeError(
      `worktree add failed for ${childId}: ${(err as Error).message}`,
    );
  }
  const logDir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    path.join(logDir, "worktrees.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      childId,
      branch: childBranch,
      path: worktreePath,
      depth,
    }) + "\n",
  );
  return { worktreePath, branch: childBranch };
}

export function removeChildWorktree(
  repoRoot: string,
  worktreePath: string,
  branch: string,
): void {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: repoRoot,
    });
  } catch {
    // worktree may already be gone; continue
  }
  try {
    execFileSync("git", ["branch", "-D", branch], { cwd: repoRoot });
  } catch {
    // branch may already be gone; continue
  }
}
