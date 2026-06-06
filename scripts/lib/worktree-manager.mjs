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
/** Thrown when the gate is on and a git operation fails. */
export class WorktreeError extends Error {
    code;
    attemptedPath;
    attemptedBranch;
    gitStderr;
    constructor(opts) {
        super(opts.message);
        this.name = "WorktreeError";
        this.code = opts.code;
        this.attemptedPath = opts.attemptedPath;
        this.attemptedBranch = opts.attemptedBranch;
        this.gitStderr = opts.gitStderr ?? "";
    }
}
function resolveWorktreeConfig(repoPath, config) {
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
async function git(repoPath, args) {
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
async function isWorktreeDirty(repoPath) {
    try {
        const out = await git(repoPath, ["status", "--porcelain", "-uno"]);
        return out.trim().length > 0;
    }
    catch {
        return false; // fail-open: if we cannot run git, let the later check surface the issue
    }
}
/** Verify git is available and the path is a repo. Throws WorktreeError on failure. */
async function assertGitAvailable(repoPath, attemptedPath, attemptedBranch) {
    try {
        await git(repoPath, ["rev-parse", "--show-toplevel"]);
    }
    catch {
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
function parseWorktreeList(raw) {
    const worktrees = [];
    const blocks = raw.split(/\n\n+/).filter((b) => b.trim().length > 0);
    for (const block of blocks) {
        const lines = block.split(/\n/);
        let wPath = "";
        let branch = "";
        for (const line of lines) {
            if (line.startsWith("worktree "))
                wPath = line.slice("worktree ".length).trim();
            if (line.startsWith("branch "))
                branch = line.slice("branch ".length).trim();
        }
        if (wPath)
            worktrees.push({ worktreePath: wPath, branch });
    }
    return worktrees;
}
/**
 * Check if a worktree already exists at targetPath.
 * Returns the matching entry or null.
 */
async function findExistingWorktree(repoPath, targetPath) {
    const raw = await git(repoPath, ["worktree", "list", "--porcelain"]);
    const list = parseWorktreeList(raw);
    const normalizedTarget = path.normalize(targetPath);
    for (const entry of list) {
        if (path.normalize(entry.worktreePath) === normalizedTarget) {
            return entry;
        }
    }
    return null;
}
/** Check if a branch name already exists in the repo. */
async function branchExists(repoPath, branchName) {
    try {
        const out = await git(repoPath, ["branch", "--list", branchName]);
        return out.trim().length > 0;
    }
    catch {
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
async function checkPathCollision(worktreePath, branchName) {
    try {
        await fs.access(worktreePath);
    }
    catch {
        return; // ENOENT — directory does not exist, OK to proceed
    }
    throw new WorktreeError({
        code: "PATH_COLLISION",
        message: `Directory ${worktreePath} already exists but is not a registered git worktree. ` +
            "Remove or rename it before starting the slice.",
        attemptedPath: worktreePath,
        attemptedBranch: branchName
    });
}
async function executeWorktreeAdd(repoPath, worktreePath, branchName) {
    try {
        await git(repoPath, ["worktree", "add", "-b", branchName, worktreePath, "main"]);
    }
    catch (err) {
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
async function ensureWorktreeRoot(root, attempted) {
    try {
        await fs.mkdir(root, { recursive: true });
    }
    catch {
        throw new WorktreeError({
            code: "ROOT_NOT_WRITABLE",
            message: `Could not create worktree root directory: ${root}`,
            attemptedPath: attempted.path,
            attemptedBranch: attempted.branch
        });
    }
}
function throwDirtyTree(worktreePath, branchName, repoPath) {
    throw new WorktreeError({
        code: "DIRTY_TREE",
        message: `Working tree in ${repoPath} has uncommitted changes. ` +
            "Commit or stash before starting a new slice worktree.",
        attemptedPath: worktreePath,
        attemptedBranch: branchName
    });
}
function throwBranchExists(branchName, worktreePath) {
    throw new WorktreeError({
        code: "BRANCH_EXISTS",
        message: `Branch ${branchName} already exists. ` +
            "Delete the branch manually before re-creating the worktree.",
        attemptedPath: worktreePath,
        attemptedBranch: branchName
    });
}
export async function ensureSliceWorktree(repoPath, sliceId, opts = {}) {
    const { config = null, featureId = null } = opts;
    const resolved = resolveWorktreeConfig(repoPath, config);
    if (!resolved.mode)
        return null;
    const worktreePath = path.join(resolved.root, sliceId);
    const branchName = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;
    await ensureWorktreeRoot(resolved.root, { path: worktreePath, branch: branchName });
    await assertGitAvailable(repoPath, worktreePath, branchName);
    if (await isWorktreeDirty(repoPath))
        throwDirtyTree(worktreePath, branchName, repoPath);
    const existing = await findExistingWorktree(repoPath, worktreePath);
    if (existing) {
        return {
            worktreePath: path.normalize(existing.worktreePath),
            branchName: existing.branch.replace(/^refs\/heads\//, ""),
            created: false,
            reused: true
        };
    }
    await checkPathCollision(worktreePath, branchName);
    if (await branchExists(repoPath, branchName))
        throwBranchExists(branchName, worktreePath);
    await executeWorktreeAdd(repoPath, worktreePath, branchName);
    return {
        worktreePath: path.normalize(worktreePath),
        branchName,
        created: true,
        reused: false
    };
}
