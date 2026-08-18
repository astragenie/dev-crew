// effective-cwd.mts — SLICE-63 / FEAT-061
//
// Resolves the "effective cwd" for loop subcommands: when a slice worktree
// is active (workflow-state.currentRun.worktreePath is set), commands should
// operate inside that worktree so all state writes are isolated to the slice
// branch until merge.
//
// Resolution precedence (highest to lowest):
//   1. worktreeOverride — explicit --worktree <path> flag from the CLI caller
//   2. worktreeState   — workflow-state.currentRun.worktreePath read from the
//                        main repo's state file
//   3. repo            — original --repo path (fallback / default)
//
// The source tag is returned alongside the resolved cwd so callers can log /
// assert the exact resolution path in tests.

import fs from "node:fs/promises";
import path from "node:path";

const STATE_PARTS = [".claude", "state", "crew", "workflow-state.json"];

/** Result of an effective-cwd resolution. */
export interface EffectiveCwdResult {
  /** Absolute path that should be used as the working directory. */
  cwd: string;
  /** How the cwd was resolved. */
  source: "override" | "worktreeState" | "repo";
}

/**
 * Read workflow-state.json from the MAIN repo and return currentRun.worktreePath
 * when it is a non-empty string. Returns null on any read/parse failure.
 */
async function readWorktreePathFromState(repoPath: string): Promise<string | null> {
  const statePath = path.join(repoPath, ...STATE_PARTS);
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const state = JSON.parse(raw);
    const wt = state?.currentRun?.worktreePath;
    if (typeof wt === "string" && wt.trim().length > 0) return wt;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the effective working directory for a loop subcommand.
 *
 * @param opts.repoPath       - The original --repo path (always required).
 * @param opts.worktreeOverride - Explicit --worktree path from the CLI flag.
 *                               Null / undefined means "not provided".
 */
export async function resolveEffectiveCwd(opts: {
  repoPath: string;
  worktreeOverride?: string | null;
}): Promise<EffectiveCwdResult> {
  const { repoPath, worktreeOverride } = opts;

  // 1. Explicit --worktree flag always wins.
  if (typeof worktreeOverride === "string" && worktreeOverride.trim().length > 0) {
    return { cwd: worktreeOverride, source: "override" };
  }

  // 2. Read worktreePath from workflow-state in the main repo.
  const worktreeFromState = await readWorktreePathFromState(repoPath);
  if (worktreeFromState) {
    return { cwd: worktreeFromState, source: "worktreeState" };
  }

  // 3. Fall back to the original repo path.
  return { cwd: repoPath, source: "repo" };
}
