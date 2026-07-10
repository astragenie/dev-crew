// Worktree manager — SLICE-56 / FEAT-060.
//
// Provides `ensureSliceWorktree`: a gated helper that creates (or reuses)
// a per-slice git worktree when `loop.worktreeMode === true`.
//
// When the gate is off (the dominant production path) the function is a
// strict zero-op — no child process, no mkdir, no file write. Only the
// cheap config read happens.
//
// Also provides `isBranchInProgress` (WS-4): git-native collision detection
// for "another build/fix/slice is already in progress on this branch",
// deliberately with no lock file — each worktree owns its own
// .claude/state/crew/workflow-state.json, so detection means enumerating
// `git worktree list` and reading a candidate worktree's own state file.
//
// Public surface: WorktreeResult, WorktreeError, ensureSliceWorktree,
// BranchInProgressResult, isBranchInProgress. All other helpers are
// module-private.

import fs from "node:fs/promises";
import path from "node:path";
import { gitTextOrThrow } from "./run-git.mjs";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Returned when worktreeMode is on and the slice has (or gets) a worktree. */
export interface WorktreeResult {
  /** Absolute, normalized path to the worktree root. */
  worktreePath: string;
  /** Branch checked out inside the worktree. */
  branchName: string;
  /** True when this call performed `git worktree add`. */
  created: boolean;
  /** True when an existing worktree was reused (idempotent re-entry). */
  reused: boolean;
}

/** Error codes for WorktreeError. */
export type WorktreeErrorCode =
  | "DIRTY_TREE"
  | "WORKTREE_ADD_FAILED"
  | "BRANCH_EXISTS"
  | "PATH_COLLISION"
  | "ROOT_NOT_WRITABLE"
  | "GIT_NOT_AVAILABLE";

/** Thrown when the gate is on and a git operation fails. */
export class WorktreeError extends Error {
  code: WorktreeErrorCode;
  attemptedPath: string;
  attemptedBranch: string;
  gitStderr: string;

  constructor(opts: {
    code: WorktreeErrorCode;
    message: string;
    attemptedPath: string;
    attemptedBranch: string;
    gitStderr?: string;
  }) {
    super(opts.message);
    this.name = "WorktreeError";
    this.code = opts.code;
    this.attemptedPath = opts.attemptedPath;
    this.attemptedBranch = opts.attemptedBranch;
    this.gitStderr = opts.gitStderr ?? "";
  }
}

// ---------------------------------------------------------------------------
// Internal config resolution
// ---------------------------------------------------------------------------

interface ResolvedWorktreeConfig {
  mode: boolean;
  root: string;
  rootSource: "config" | "default-sibling";
}

function resolveWorktreeConfig(
  repoPath: string,
  config: Record<string, any> | null
): ResolvedWorktreeConfig {
  const loop = config?.loop ?? {};
  const mode = loop.worktreeMode === true;

  const rawRoot = loop.worktreeRoot;
  if (typeof rawRoot === "string" && rawRoot.trim().length > 0) {
    return {
      mode,
      root: path.resolve(repoPath, rawRoot.trim()),
      rootSource: "config"
    };
  }

  // Default: sibling dir named <basename(repoPath)>-worktrees
  const sibling = path.join(path.dirname(repoPath), `${path.basename(repoPath)}-worktrees`);
  return { mode, root: sibling, rootSource: "default-sibling" };
}

// ---------------------------------------------------------------------------
// Internal git helpers
// ---------------------------------------------------------------------------

/** Run git with given args under repoPath. Returns stdout. Throws on non-zero exit. */
async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await gitTextOrThrow(["-C", repoPath, ...args]);
  return stdout;
}

/**
 * Returns true when the working tree has staged or unstaged changes to TRACKED
 * files. Untracked files are ignored (`-uno`) — loop/crew state files in
 * `.claude/state/` are legitimately untracked during slice ceremonies and must
 * not block worktree creation. Git's own `worktree add` does not require a
 * clean tree either; this is a loop-side guard against accidental cross-slice
 * pollution.
 */
async function isWorktreeDirty(repoPath: string): Promise<boolean> {
  try {
    const out = await git(repoPath, ["status", "--porcelain", "-uno"]);
    return out.trim().length > 0;
  } catch {
    return false; // fail-open: if we cannot run git, let the later check surface the issue
  }
}

/** Verify git is available and the path is a repo. Throws WorktreeError on failure. */
async function assertGitAvailable(
  repoPath: string,
  attemptedPath: string,
  attemptedBranch: string
): Promise<void> {
  try {
    await git(repoPath, ["rev-parse", "--show-toplevel"]);
  } catch {
    throw new WorktreeError({
      code: "GIT_NOT_AVAILABLE",
      message: `git is not available or ${repoPath} is not a git repository.`,
      attemptedPath,
      attemptedBranch
    });
  }
}

/**
 * Parse `git worktree list --porcelain` output.
 * Returns array of { worktreePath, branch } objects.
 */
function parseWorktreeList(raw: string): Array<{ worktreePath: string; branch: string }> {
  const worktrees: Array<{ worktreePath: string; branch: string }> = [];
  const blocks = raw.split(/\n\n+/).filter((b) => b.trim().length > 0);
  for (const block of blocks) {
    const lines = block.split(/\n/);
    let wPath = "";
    let branch = "";
    for (const line of lines) {
      if (line.startsWith("worktree ")) wPath = line.slice("worktree ".length).trim();
      if (line.startsWith("branch ")) branch = line.slice("branch ".length).trim();
    }
    if (wPath) worktrees.push({ worktreePath: wPath, branch });
  }
  return worktrees;
}

/**
 * Resolve a path to its canonical form for cross-platform comparison.
 * Falls back to path.normalize when realpath fails (e.g. path doesn't exist yet).
 *
 * Windows nuance: tmp dirs in CI surface as 8.3 short names
 * (`C:\Users\RUNNER~1\AppData\Local\Temp\...`) while `git worktree list`
 * emits the long form with forward slashes. realpath resolves both shapes
 * to a single canonical comparable string. Without this, the second
 * ensureSliceWorktree call on Windows fails to detect the registered
 * worktree and throws PATH_COLLISION (FEAT-281).
 */
async function canonicalizePath(p: string): Promise<string> {
  try {
    return path.normalize(await fs.realpath(p));
  } catch {
    return path.normalize(p);
  }
}

/**
 * Check if a worktree already exists at targetPath.
 * Returns the matching entry or null.
 */
async function findExistingWorktree(
  repoPath: string,
  targetPath: string
): Promise<{ worktreePath: string; branch: string } | null> {
  const raw = await git(repoPath, ["worktree", "list", "--porcelain"]);
  const list = parseWorktreeList(raw);
  const canonicalTarget = await canonicalizePath(targetPath);
  for (const entry of list) {
    if ((await canonicalizePath(entry.worktreePath)) === canonicalTarget) {
      return entry;
    }
  }
  return null;
}

/** Check if a branch name already exists in the repo. */
async function branchExists(repoPath: string, branchName: string): Promise<boolean> {
  try {
    const out = await git(repoPath, ["branch", "--list", branchName]);
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------

/**
 * Ensure a per-slice git worktree exists.
 *
 * Returns null when worktreeMode is off (gate-off zero-op).
 * Returns WorktreeResult on success (created or reused).
 * Throws WorktreeError on hard git failure — no partial state is written.
 */
async function checkPathCollision(worktreePath: string, branchName: string): Promise<void> {
  try {
    await fs.access(worktreePath);
  } catch {
    return; // ENOENT — directory does not exist, OK to proceed
  }
  throw new WorktreeError({
    code: "PATH_COLLISION",
    message:
      `Directory ${worktreePath} already exists but is not a registered git worktree. ` +
      "Remove or rename it before starting the slice.",
    attemptedPath: worktreePath,
    attemptedBranch: branchName
  });
}

async function executeWorktreeAdd(
  repoPath: string,
  worktreePath: string,
  branchName: string
): Promise<void> {
  try {
    await git(repoPath, ["worktree", "add", "-b", branchName, worktreePath, "main"]);
  } catch (err: any) {
    const stderr = (err?.stderr ?? "").trim();
    throw new WorktreeError({
      code: "WORKTREE_ADD_FAILED",
      message: `git worktree add failed for ${worktreePath}: ${stderr || err?.message || "unknown error"}`,
      attemptedPath: worktreePath,
      attemptedBranch: branchName,
      gitStderr: stderr
    });
  }
}

async function ensureWorktreeRoot(root: string, attempted: { path: string; branch: string }) {
  try {
    await fs.mkdir(root, { recursive: true });
  } catch {
    throw new WorktreeError({
      code: "ROOT_NOT_WRITABLE",
      message: `Could not create worktree root directory: ${root}`,
      attemptedPath: attempted.path,
      attemptedBranch: attempted.branch
    });
  }
}

function throwDirtyTree(worktreePath: string, branchName: string, repoPath: string): never {
  throw new WorktreeError({
    code: "DIRTY_TREE",
    message:
      `Working tree in ${repoPath} has uncommitted changes. ` +
      "Commit or stash before starting a new slice worktree.",
    attemptedPath: worktreePath,
    attemptedBranch: branchName
  });
}

function throwBranchExists(branchName: string, worktreePath: string): never {
  throw new WorktreeError({
    code: "BRANCH_EXISTS",
    message:
      `Branch ${branchName} already exists. ` +
      "Delete the branch manually before re-creating the worktree.",
    attemptedPath: worktreePath,
    attemptedBranch: branchName
  });
}

export async function ensureSliceWorktree(
  repoPath: string,
  sliceId: string,
  opts: {
    config?: Record<string, any> | null;
    featureId?: string | null;
  } = {}
): Promise<WorktreeResult | null> {
  const { config = null, featureId = null } = opts;

  const resolved = resolveWorktreeConfig(repoPath, config);
  if (!resolved.mode) return null;

  const worktreePath = path.join(resolved.root, sliceId);
  const branchName = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;

  await ensureWorktreeRoot(resolved.root, { path: worktreePath, branch: branchName });
  await assertGitAvailable(repoPath, worktreePath, branchName);

  if (await isWorktreeDirty(repoPath)) throwDirtyTree(worktreePath, branchName, repoPath);

  // findExistingWorktree canonicalizes internally so Windows 8.3 short-name
  // paths (e.g. RUNNER~1) match the long form git emits (FEAT-281).
  const existing = await findExistingWorktree(repoPath, worktreePath);
  if (existing) {
    return {
      // Return the caller-shaped path (path.normalize of the input) so a
      // second call's return value matches the first call's exactly — even
      // when realpath would resolve them to different string forms on
      // Windows. The canonicalization only affects the comparison inside
      // findExistingWorktree, not the WorktreeResult.worktreePath shape.
      worktreePath: path.normalize(worktreePath),
      branchName: existing.branch.replace(/^refs\/heads\//, ""),
      created: false,
      reused: true
    };
  }

  await checkPathCollision(worktreePath, branchName);
  if (await branchExists(repoPath, branchName)) throwBranchExists(branchName, worktreePath);

  await executeWorktreeAdd(repoPath, worktreePath, branchName);

  return {
    worktreePath: path.normalize(worktreePath),
    branchName,
    created: true,
    reused: false
  };
}

// ---------------------------------------------------------------------------
// isBranchInProgress — WS-4 collision-triggered worktree isolation
// ---------------------------------------------------------------------------

/**
 * Return the branch currently checked out at `repoPath` (e.g. "main" or
 * "feat/foo"). Returns null on failure — detached HEAD, not a repo, or any
 * other git error — fail-open, since callers only use this to feed
 * isBranchInProgress and a null branch name simply means "skip the check."
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const out = (await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
    if (!out || out === "HEAD") return null; // detached HEAD
    return out;
  } catch {
    return null;
  }
}

/** Result of a positive isBranchInProgress hit. */
export interface BranchInProgressResult {
  /** The sliceId found active in the matching worktree's own state. */
  sliceId: string;
  /** The worktree path (as reported by `git worktree list`) that is active. */
  worktreePath: string;
}

/**
 * Detect whether another build/fix/slice is already in progress on
 * `branchName`, by scanning `git worktree list --porcelain` and reading each
 * matching worktree's OWN `.claude/state/crew/workflow-state.json`.
 *
 * Design (git-native, no lock file): every worktree of a repo has its own
 * `.claude/state` directory, so the only way to observe a sibling's active
 * run is to read its state file directly — there is no shared lock to poll.
 * This also covers the (worktreeMode: off) dominant path, where `repoPath`
 * itself is the sole worktree entry: if it already has an unfinished
 * `currentRun.sliceId`, that counts as a collision too, since a second slice
 * starting there would share the same working directory.
 *
 * Fail-open by design: this is a collision *trigger*, not a hard gate — a
 * missing/corrupt state file, or an inability to enumerate worktrees at all,
 * is treated as "no active run observed" rather than thrown. A false
 * negative here just means the caller proceeds without isolation (today's
 * default behavior); a thrown error would block slice start on an unrelated
 * read failure, which is worse.
 */
export async function isBranchInProgress(
  repoPath: string,
  branchName: string
): Promise<BranchInProgressResult | null> {
  let entries: Array<{ worktreePath: string; branch: string }>;
  try {
    const raw = await git(repoPath, ["worktree", "list", "--porcelain"]);
    entries = parseWorktreeList(raw);
  } catch {
    return null; // fail-open: cannot enumerate worktrees
  }

  for (const entry of entries) {
    const entryBranch = entry.branch.replace(/^refs\/heads\//, "");
    if (entryBranch !== branchName) continue;

    try {
      const statePath = path.join(
        entry.worktreePath,
        ".claude",
        "state",
        "crew",
        "workflow-state.json"
      );
      const raw = await fs.readFile(statePath, "utf8");
      const state = JSON.parse(raw);
      const sliceId = state?.currentRun?.sliceId;
      if (typeof sliceId === "string" && sliceId.length > 0) {
        return { sliceId, worktreePath: entry.worktreePath };
      }
    } catch {
      // fail-open: unreadable/missing/corrupt state for this entry means
      // "no active run observed there" — keep scanning other entries.
      continue;
    }
  }

  return null;
}
