// Collision-proof slice-ID allocation (DEC-079 / FEAT-257 SLICE-A).
//
// createSlice's original allocator (pre-DEC-079) was 100% local-filesystem:
// it scanned slicesRoot for the max existing SLICE-NN id and minted max+1,
// with zero awareness of any other worktree/clone. Under wave mode, two
// worktrees forked from the same base commit both see the same local max and
// mint the same id (the real FEAT-244/FEAT-247 SLICE-147 collision this FEAT
// was filed from).
//
// allocateNextSliceId narrows that window by also scanning origin/main via a
// best-effort `git fetch` + `git ls-tree` (no checkout, no worktree
// mutation) and taking max(local, remote) + 1. Any git failure — offline, no
// remote configured, no network, a never-fetched origin/main ref — swallows
// to a remote max of 0 and degrades cleanly to the original local-only
// behavior, with a warning logged (DEC-079 AC-3). It does not close the
// residual race where both sessions number before either pushes; that is
// remediated by the separate SLICE-B renumber CLI, not by this module.

import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "../paths.mjs";
import { gitText } from "../run-git.mjs";

/** Matches a slice filename's leading `SLICE-NN` / `SLICE_NN` id segment. */
export const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

/** Walks `dir` recursively; returns the max numeric slice id among filenames matching {@link SLICE_FILE_RE}. */
export async function maxSliceIdUnder(dir: string): Promise<number> {
  if (!(await pathExists(dir))) return 0;
  let max = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const m = entry.name.match(SLICE_FILE_RE);
      if (m) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
  }
  return max;
}

// Regex-scans a `git ls-tree -r --name-only` listing (one repo-relative path
// per line) for the max SLICE_FILE_RE id among each line's basename.
function maxSliceIdInListing(listing: string): number {
  let max = 0;
  for (const line of listing.split("\n")) {
    const basename = line.trim().split("/").pop() ?? "";
    const m = basename.match(SLICE_FILE_RE);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return max;
}

// Mirrors auto-merge.mts:211-213's `-C <repoPath>`-scoped git() helper, but
// via gitText's swallow-to-null contract (never throws) rather than
// gitTextOrThrow — every call in this module is best-effort.
async function gitInRepo(repoPath: string, args: string[]): Promise<string | null> {
  return gitText(["-C", repoPath, ...args], { timeoutMs: 30_000 });
}

// repoPath-relative POSIX (forward-slash) path — git pathspec requirement,
// even on Windows, where path.relative would otherwise emit backslashes.
function toRepoRelativePosix(repoPath: string, absPath: string): string {
  return path.relative(repoPath, absPath).split(path.sep).join("/");
}

/**
 * Best-effort remote-max scan: fetches origin/main then lists
 * `slicesRootRel`'s tree at that ref, without checking anything out. Any
 * failure (offline, no remote, no network, a never-fetched origin/main ref)
 * degrades to a remote max of 0 with a logged warning — never throws.
 */
async function remoteMaxSliceId(repoPath: string, slicesRootRel: string): Promise<number> {
  const fetchResult = await gitInRepo(repoPath, ["fetch", "origin", "main", "--quiet"]);
  if (fetchResult === null) {
    console.warn(
      `[slice-id-allocator] git fetch origin main failed for ${repoPath} ` +
        "(offline / no remote / no network?) — remote slice-id scan may use a stale " +
        "or missing origin/main ref."
    );
  }
  const listing = await gitInRepo(repoPath, [
    "ls-tree",
    "-r",
    "--name-only",
    "origin/main",
    "--",
    slicesRootRel
  ]);
  if (listing === null) {
    console.warn(
      `[slice-id-allocator] git ls-tree origin/main failed for ${repoPath} — falling back ` +
        "to local-only slice-id scan (remote max treated as 0)."
    );
    return 0;
  }
  return maxSliceIdInListing(listing);
}

/**
 * Allocates the next SLICE id: `max(localMax, remoteMax) + 1`, where
 * localMax is a recursive filesystem scan of `slicesRootDir` and remoteMax
 * is a best-effort scan of `origin/main` (DEC-079). Never throws — a
 * fetch/ls-tree failure degrades to local-only allocation, matching
 * pre-DEC-079 behavior exactly, with a warning logged.
 */
export async function allocateNextSliceId(
  repoPath: string,
  slicesRootDir: string,
  // Accepted for signature parity with createSlice's other repoPath/config
  // call sites and future config-driven behavior (e.g. an opt-out toggle);
  // unused today — the remote scan always runs.
  _config?: Record<string, unknown> | null
): Promise<number> {
  const localMax = await maxSliceIdUnder(slicesRootDir);
  const slicesRootRel = toRepoRelativePosix(repoPath, slicesRootDir);
  const remoteMax = await remoteMaxSliceId(repoPath, slicesRootRel);
  return Math.max(localMax, remoteMax) + 1;
}
