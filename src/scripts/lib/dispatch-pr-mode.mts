// FEAT-173 SLICE-127 — Auto-PR mode for parallel worktree dispatch.
// For each DONE child after dispatch finalize: push branch to origin,
// infer title/body from git log, create PR via gh CLI.

import { spawnSync as nodeSpawnSync } from "node:child_process";

export interface PrChild {
  branch: string;
  worktreePath: string;
  status: "DONE" | "FAILED" | "SKIPPED";
}

export interface PrResult {
  branch: string;
  prUrl: string | null;
  error?: string;
}

// Exported internals for test injection
export const _internals = {
  execGit: (args: string[], cwd: string): string => {
    const result = nodeSpawnSync("git", args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32"
    });
    if (result.status !== 0) {
      const msg = (result.stderr as string | null) ?? "";
      throw new Error(`git ${args.join(" ")} failed: ${msg.trim()}`);
    }
    return ((result.stdout as string | null) ?? "").trim();
  },
  execGh: (args: string[], cwd: string): string => {
    const result = nodeSpawnSync("gh", args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32"
    });
    if (result.status !== 0) {
      const msg = (result.stderr as string | null) ?? "";
      throw new Error(`gh ${args.join(" ")} failed: ${msg.trim()}`);
    }
    return ((result.stdout as string | null) ?? "").trim();
  }
};

/**
 * For each DONE child: push branch to origin, infer title/body from git log,
 * create a PR via `gh pr create`. Returns a PrResult per DONE child.
 * FAILED and SKIPPED children are skipped (no PR created).
 */
export async function dispatchFinalizePr(
  children: PrChild[],
  _repoPath: string
): Promise<PrResult[]> {
  const results: PrResult[] = [];

  for (const child of children) {
    if (child.status !== "DONE") {
      continue;
    }

    const { branch, worktreePath } = child;
    let prUrl: string | null = null;
    let error: string | undefined;

    try {
      // Step 1: push branch to origin
      _internals.execGit(["push", "origin", branch], worktreePath);

      // Step 2: infer title from the last commit subject on the child branch
      const title = _internals.execGit(["log", "-1", "--format=%s"], worktreePath);

      // Step 3: infer body — commits on child branch not reachable from main
      const logLines = _internals.execGit(["log", "main..HEAD", "--oneline"], worktreePath);
      const bullets = logLines
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((l) => `- ${l}`)
        .join("\n");
      const body = bullets.length > 0 ? bullets : "No commits beyond main.";

      // Step 4: create PR via gh CLI
      const ghOut = _internals.execGh(
        [
          "pr",
          "create",
          "--title",
          title || branch,
          "--body",
          body,
          "--head",
          branch,
          "--base",
          "main"
        ],
        worktreePath
      );

      // Step 5: parse PR URL — first non-empty line of stdout
      const firstLine = ghOut.split("\n").find((l) => l.trim().length > 0) ?? null;
      prUrl = firstLine;
    } catch (err) {
      error = (err as Error).message;
    }

    results.push({ branch, prUrl, ...(error !== undefined ? { error } : {}) });
  }

  return results;
}
