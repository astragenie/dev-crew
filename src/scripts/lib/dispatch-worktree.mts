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

export function preflightGitClean(repoRoot: string, parentBranch: string): void {
  try {
    execFileSync("git", ["rev-parse", "--verify", parentBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new DispatchWorktreeError(`parentBranch not found: ${parentBranch}`);
  }
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot
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
  const worktreePath = path.join(path.dirname(repoRoot), `${baseName}-${childId}-${depth}`);
  try {
    execFileSync("git", ["worktree", "add", worktreePath, parentBranch, "-b", childBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    throw new DispatchWorktreeError(
      `worktree add failed for ${childId}: ${(err as Error).message}`
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
      depth
    }) + "\n"
  );
  return { worktreePath, branch: childBranch };
}

export function removeChildWorktree(repoRoot: string, worktreePath: string, branch: string): void {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: repoRoot
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

// ──────────────────────────────────────────────────────────────────────────
// FEAT-202 SLICE-A — read-only inventory of a worker branch before teardown
// ──────────────────────────────────────────────────────────────────────────

export interface WorkerUncommittedEntry {
  path: string;
  /** Two-char git porcelain status code, e.g. "??" (untracked), " M" (modified). */
  status: string;
}

export interface WorkerInventory {
  branch: string;
  worktreePath: string;
  filesOnBranchNotOnMain: string[];
  uncommittedWip: WorkerUncommittedEntry[];
}

/**
 * Inventory a worker branch BEFORE destructive teardown. Pure read-only.
 *
 * Returns:
 *  - `filesOnBranchNotOnMain`: from `git diff parentBranch...branch --name-only`
 *    (three-dot syntax: changes on branch since divergence from parentBranch).
 *    Includes added + modified files. Renames/deletions are NOT included here —
 *    we care about content that would be LOST on squash-merge or branch delete.
 *  - `uncommittedWip`: from `git -C worktreePath status --porcelain`. Each
 *    entry is `{ path, status }` with the raw 2-char porcelain code.
 *
 * Never throws on missing branch / missing worktree / git errors —
 * returns empty arrays so callers can proceed with teardown decisions on best-
 * effort evidence. Caller logs the inventory regardless of completeness.
 */
export function inventoryWorkerBranch(
  repoRoot: string,
  worktreePath: string,
  branch: string,
  parentBranch: string
): WorkerInventory {
  const filesOnBranchNotOnMain = listFilesOnBranchNotOnMain(repoRoot, branch, parentBranch);
  const uncommittedWip = listUncommittedWip(worktreePath);
  return { branch, worktreePath, filesOnBranchNotOnMain, uncommittedWip };
}

function listFilesOnBranchNotOnMain(
  repoRoot: string,
  branch: string,
  parentBranch: string
): string[] {
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=AM", `${parentBranch}...${branch}`],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
    ).toString();
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function listUncommittedWip(worktreePath: string): WorkerUncommittedEntry[] {
  if (!fs.existsSync(worktreePath)) return [];
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: worktreePath,
      stdio: ["ignore", "pipe", "pipe"]
    }).toString();
    return out
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        // Porcelain format: first 2 chars status, then space, then path.
        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim();
        return { path: filePath, status };
      });
  } catch {
    return [];
  }
}

/**
 * Append a `WorkerInventory` to the JSONL log under the runId's dispatch dir.
 * Best-effort; failures swallowed so callers don't block on logging.
 */
export function appendInventoryLog(
  repoRoot: string,
  runId: string,
  entry: WorkerInventory & { childId: string; status: string }
): void {
  try {
    const logDir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs.mkdirSync(logDir, { recursive: true });
    const row = { ts: new Date().toISOString(), ...entry };
    fs.appendFileSync(path.join(logDir, "inventory.jsonl"), `${JSON.stringify(row)}\n`);
  } catch {
    // best-effort
  }
}

/**
 * Write a Markdown `worker-preserved-<childId>.md` summary when a child was
 * NOT removed (CONFLICTED / FAIL / BLOCKED). Gives the operator a single
 * artifact to triage instead of greping the JSONL.
 */
export function writeWorkerPreservedArtifact(
  repoRoot: string,
  runId: string,
  childId: string,
  status: string,
  inventory: WorkerInventory,
  suggestedAction: string
): void {
  try {
    const dir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs.mkdirSync(dir, { recursive: true });
    const filesPreview = inventory.filesOnBranchNotOnMain.slice(0, 10);
    const wipPreview = inventory.uncommittedWip.slice(0, 10);
    const body = [
      `# Worker preserved — ${childId}`,
      "",
      `**status:** ${status}`,
      `**branch:** \`${inventory.branch}\``,
      `**worktree:** \`${inventory.worktreePath}\``,
      `**runId:** \`${runId}\``,
      "",
      `## Files on branch not on main (${inventory.filesOnBranchNotOnMain.length})`,
      "",
      filesPreview.length > 0 ? filesPreview.map((p) => `- \`${p}\``).join("\n") : "_(none)_",
      inventory.filesOnBranchNotOnMain.length > filesPreview.length
        ? `\n… ${inventory.filesOnBranchNotOnMain.length - filesPreview.length} more`
        : "",
      "",
      `## Uncommitted WIP in worktree (${inventory.uncommittedWip.length})`,
      "",
      wipPreview.length > 0
        ? wipPreview.map((w) => `- \`${w.status}\` \`${w.path}\``).join("\n")
        : "_(none)_",
      inventory.uncommittedWip.length > wipPreview.length
        ? `\n… ${inventory.uncommittedWip.length - wipPreview.length} more`
        : "",
      "",
      `## Suggested next action`,
      "",
      suggestedAction,
      ""
    ].join("\n");
    fs.writeFileSync(path.join(dir, `worker-preserved-${childId}.md`), body);
  } catch {
    // best-effort
  }
}
