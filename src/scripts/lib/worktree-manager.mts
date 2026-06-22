// Worktree manager — SLICE-56 / FEAT-060.
//
// Provides `ensureSliceWorktree`: a gated helper that creates (or reuses)
// a per-slice git worktree when `loop.worktreeMode === true`.
//
// When the gate is off (the dominant production path) the function is a
// strict zero-op — no child process, no mkdir, no file write. Only the
// cheap config read happens.
//
// Public surface: WorktreeResult, WorktreeError, ensureSliceWorktree.
// All other helpers are module-private.

import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

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
  const { stdout } = await execFile("git", ["-C", repoPath, ...args]);
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
