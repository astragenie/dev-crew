// auto-merge.mts — SLICE-64 / FEAT-062
//
// Drives the auto-merge stage at the end of `loop slice complete` when a
// worktree is active. Validates the crew validation gate, rebases the slice
// branch onto origin/main, squash-merges with a synthesized commit message,
// optionally pushes, and cleans up the worktree + branch.
//
// On any failure, sets the `merge_failed` halt-badge and preserves the worktree
// so the operator can resume via /crew:fix.

import { execFile as execFileCb } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";

const execFile = promisify(execFileCb);

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface AutoMergeOptions {
  /** Main repo root (NOT the worktree path). Where `git -C` runs. */
  repoPath: string;
  /** Absolute worktree path from workflow-state.currentRun.worktreePath. */
  worktreePath: string;
  /** Branch name to rebase + merge. Created by FEAT-060 as `slice/<SLICE-NN>-<FEAT-NN>`. */
  branchName: string;
  /** Slice id (e.g. "SLICE-64"). Drives commit-message title + branch lookup. */
  sliceId: string;
  /** Slice title from frontmatter (e.g. "Auto-merge slice branch on validation pass"). */
  sliceTitle: string;
  /** Feature id (e.g. "FEAT-062") — included in commit body. Null for orphan slices. */
  featureId: string | null;
  /** Average grade score across the 7 dimensions, rounded 2dp. Null when grade missing. */
  gradeAvg: number | null;
  /**
   * Decision ids captured during the slice (e.g. ["DEC-023", "DEC-024"]).
   * Sourced from grade frontmatter — pass through verbatim.
   */
  decisionIds: string[];
  /** Resolved loop config from `resolveConfig(repoPath)`. Required (no fallback). */
  config: Record<string, any>;
  /** When true, print plan to stdout and return DryRunPlan — no git, no state writes. */
  dryRun?: boolean;
}

export interface MergeResult {
  status: "merged";
  /** Sha of the squash-merge commit on main. */
  mergeCommitSha: string;
  /** Fully rendered commit message body that was passed to `git commit -m`. */
  commitMessage: string;
  /** True when `git push origin main` ran AND exited zero. */
  pushed: boolean;
  /** Reason push was skipped — only set when `pushed === false`. */
  pushSkippedReason: "config-disabled" | "no-merge-flag" | null;
  /** Per-step cleanup outcomes. Each entry is best-effort and isolated. */
  cleanup: {
    branchDeleted: boolean;
    branchDeleteError: string | null;
    worktreeRemoved: boolean;
    worktreeRemoveError: string | null;
    workflowStateCleared: boolean;
    workflowStateClearError: string | null;
  };
}

export interface DryRunPlan {
  status: "dry-run";
  /** What rebase target would be used. Resolved at plan time. */
  rebaseOnto: "origin/main";
  /** The full commit message that would be authored. Final, with footer. */
  commitMessage: string;
  /** Whether autoPushOnMerge would trigger a push. */
  wouldPush: boolean;
  /** Per-step plan, in execution order. Each is a string description. */
  plannedSteps: string[];
  /** True when validation gate is currently satisfied. */
  validationGateSatisfied: boolean;
  /** Echoed inputs for the operator to sanity-check. */
  inputs: {
    sliceId: string;
    featureId: string | null;
    branchName: string;
    worktreePath: string;
    gradeAvg: number | null;
    decisionIds: string[];
    autoPushOnMerge: boolean;
  };
}

export interface MergeFailedBadge {
  status: "failed";
  /** Stable code copied from MergeError.code. */
  code: MergeError["code"];
  /** Slice id at time of failure (for cross-slice debug). */
  slice: string;
  /** Feature id at time of failure. Null when orphan slice. */
  feature: string | null;
  /** Branch the merge attempted to land. */
  attemptedBranch: string;
  /** Worktree the slice ran in. */
  attemptedWorktree: string;
  /** Step at which the failure was detected. */
  failedStep: MergeError["failedStep"];
  /** Short note for the operator (1 sentence). Avoid raw stderr here. */
  note: string;
  /** ISO-8601 timestamp at the time the badge was written. */
  markedAt: string;
}

export class MergeError extends Error {
  code:
    | "VALIDATION_REQUIRED"
    | "VALIDATION_FAILED"
    | "FETCH_FAILED"
    | "REBASE_CONFLICT"
    | "MERGE_FAILED"
    | "PUSH_FAILED"
    | "BRANCH_MISSING"
    | "DIRTY_MAIN"
    | "WORKTREE_MISSING";

  failedStep: "validation-gate" | "fetch" | "rebase" | "merge" | "push" | "preflight";

  gitStderr: string;
  fixHint: string;
  attemptedBranch: string;
  attemptedWorktree: string;

  constructor(opts: {
    code: MergeError["code"];
    message: string;
    failedStep: MergeError["failedStep"];
    gitStderr?: string;
    fixHint?: string;
    attemptedBranch: string;
    attemptedWorktree: string;
  }) {
    super(opts.message);
    this.name = "MergeError";
    this.code = opts.code;
    this.failedStep = opts.failedStep;
    this.gitStderr = opts.gitStderr ?? "";
    this.fixHint =
      opts.fixHint ?? `Run \`/crew:fix\` against worktree \`${opts.attemptedWorktree}\` to resume.`;
    this.attemptedBranch = opts.attemptedBranch;
    this.attemptedWorktree = opts.attemptedWorktree;
  }
}

// ---------------------------------------------------------------------------
// Commit-message template
// ---------------------------------------------------------------------------

/** Module constant: the template used to render squash-merge commit messages. */
export const AUTO_MERGE_COMMIT_TEMPLATE = `<sliceTitle> (<sliceId>)

<closesLine><gradeAvg>. <decisionList>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`;

/**
 * Render the squash-merge commit message from AutoMergeOptions.
 * Throws when sliceTitle or sliceId are empty (REQUIRED fields).
 */
export function renderCommitMessage(
  opts: Pick<AutoMergeOptions, "sliceTitle" | "sliceId" | "featureId" | "gradeAvg" | "decisionIds">
): string {
  const { sliceTitle, sliceId, featureId, gradeAvg, decisionIds } = opts;
  if (!sliceTitle || !sliceTitle.trim()) {
    throw new MergeError({
      code: "MERGE_FAILED",
      message: "renderCommitMessage: sliceTitle is required but empty.",
      failedStep: "preflight",
      attemptedBranch: "",
      attemptedWorktree: ""
    });
  }
  if (!sliceId || !sliceId.trim()) {
    throw new MergeError({
      code: "MERGE_FAILED",
      message: "renderCommitMessage: sliceId is required but empty.",
      failedStep: "preflight",
      attemptedBranch: "",
      attemptedWorktree: ""
    });
  }

  const closesLine = featureId ? `Closes ${featureId}. ` : "";
  const gradeStr = gradeAvg !== null ? `Grade avg: ${gradeAvg.toFixed(2)}` : "Grade avg: n/a";
  const decStr =
    decisionIds && decisionIds.length > 0
      ? `Decisions: ${decisionIds.join(", ")}`
      : "Decisions: none";

  const body = [
    `${sliceTitle.trim()} (${sliceId})`,
    "",
    `${closesLine}${gradeStr}. ${decStr}.`,
    "",
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ].join("\n");

  return body;
}

// ---------------------------------------------------------------------------
// Internal git helper
// ---------------------------------------------------------------------------

async function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFile("git", ["-C", repoPath, ...args]);
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}

// ---------------------------------------------------------------------------
// Validation gate reader
// ---------------------------------------------------------------------------

/**
 * Read the validation gate status from workflow-state.
 * Returns "passed", "skipped", "failed", or null (not found).
 */
function readValidationGateStatus(workflowState: any): "passed" | "skipped" | "failed" | null {
  const gate = workflowState?.currentRun?.gates?.validation;
  if (!gate || typeof gate !== "object") return null;
  const s = gate.status;
  if (s === "passed" || s === "skipped" || s === "failed") return s;
  return null;
}

/**
 * Determine whether the validation gate is satisfied for auto-merge.
 * Returns { satisfied, status } where status is the raw gate value.
 */
export function isValidationGateSatisfied(workflowState: any): {
  satisfied: boolean;
  status: string | null;
} {
  const status = readValidationGateStatus(workflowState);
  if (status === "passed" || status === "skipped") return { satisfied: true, status };
  return { satisfied: false, status };
}

// ---------------------------------------------------------------------------
// Preflight checks
// ---------------------------------------------------------------------------

async function preflightChecks(
  repoPath: string,
  worktreePath: string,
  branchName: string
): Promise<void> {
  // 1. Check worktree exists on disk
  try {
    await fs.access(worktreePath);
  } catch {
    throw new MergeError({
      code: "WORKTREE_MISSING",
      message: `Worktree path ${worktreePath} does not exist on disk.`,
      failedStep: "preflight",
      attemptedBranch: branchName,
      attemptedWorktree: worktreePath
    });
  }

  // 2. Dirty-check main working tree (tracked files only, -uno)
  let statusOut = "";
  try {
    const { stdout } = await git(repoPath, ["status", "--porcelain", "-uno"]);
    statusOut = stdout.trim();
  } catch {
    // fail-open: if we cannot run git status, let later steps surface the issue
  }
  if (statusOut.length > 0) {
    throw new MergeError({
      code: "DIRTY_MAIN",
      message: `Main working tree at ${repoPath} has uncommitted tracked changes. Commit or stash before merging.`,
      failedStep: "preflight",
      gitStderr: statusOut,
      attemptedBranch: branchName,
      attemptedWorktree: worktreePath
    });
  }

  // 3. Confirm slice branch exists
  try {
    await git(repoPath, ["rev-parse", "--verify", branchName]);
  } catch (err: any) {
    throw new MergeError({
      code: "BRANCH_MISSING",
      message: `Branch ${branchName} not found in repo ${repoPath}.`,
      failedStep: "preflight",
      gitStderr: (err?.stderr ?? "").trim(),
      attemptedBranch: branchName,
      attemptedWorktree: worktreePath
    });
  }
}

// ---------------------------------------------------------------------------
// Badge / state helpers
// ---------------------------------------------------------------------------

const STATE_PATH_PARTS = [".claude", "state", "crew", "workflow-state.json"];

async function writeMergeFailedBadge(repoPath: string, badge: MergeFailedBadge): Promise<void> {
  // Write to workflow-state directly (crew mark-badge pattern; fallback to direct write)
  try {
    const statePath = path.join(repoPath, ...STATE_PATH_PARTS);
    let state: any = { version: "1.0", currentRun: { gates: {} } };
    try {
      const raw = await fs.readFile(statePath, "utf8");
      state = JSON.parse(raw);
    } catch {
      // start fresh
    }
    if (!state.currentRun) state.currentRun = {};
    if (!state.currentRun.gates) state.currentRun.gates = {};
    state.currentRun.gates.mergeFailed = badge;
    state.updatedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // best-effort — badge write failure must never mask the original MergeError
  }
}

async function clearMergeFailedBadge(repoPath: string): Promise<void> {
  try {
    const statePath = path.join(repoPath, ...STATE_PATH_PARTS);
    const raw = await fs.readFile(statePath, "utf8");
    const state = JSON.parse(raw);
    if (state?.currentRun?.gates) {
      state.currentRun.gates.mergeFailed = null;
    }
    state.updatedAt = new Date().toISOString();
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // best-effort
  }
}

export async function clearWorktreePathInState(repoPath: string): Promise<void> {
  const statePath = path.join(repoPath, ...STATE_PATH_PARTS);
  const raw = await fs.readFile(statePath, "utf8");
  const state = JSON.parse(raw);
  if (state?.currentRun) {
    state.currentRun.worktreePath = null;
  }
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

async function writeAuditEntry(repoPath: string, entry: object): Promise<void> {
  try {
    const { appendAuditLog } = await import("./auto-dispatch.mjs");
    await appendAuditLog(repoPath, entry);
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

async function runCleanup(
  repoPath: string,
  worktreePath: string,
  branchName: string
): Promise<MergeResult["cleanup"]> {
  const cleanup: MergeResult["cleanup"] = {
    branchDeleted: false,
    branchDeleteError: null,
    worktreeRemoved: false,
    worktreeRemoveError: null,
    workflowStateCleared: false,
    workflowStateClearError: null
  };

  // 1. Remove worktree FIRST. `git branch -D` refuses to delete a branch
  // that is checked out in a worktree, so the worktree must go first.
  try {
    await git(repoPath, ["worktree", "remove", worktreePath]);
    cleanup.worktreeRemoved = true;
  } catch (err: any) {
    cleanup.worktreeRemoveError = (err?.stderr ?? err?.message ?? "unknown").trim();
  }

  // 2. Delete slice branch. Squash-merge does NOT mark the source branch as
  // "merged" from git's perspective (the squashed commit on main has a
  // different sha + tree than the branch tip). So `branch -d` would refuse
  // with "not fully merged" even though the content is on main. Use `-D`
  // safely here because the caller has already verified that the squash
  // commit landed on main before calling runCleanup.
  try {
    await git(repoPath, ["branch", "-D", branchName]);
    cleanup.branchDeleted = true;
  } catch (err: any) {
    cleanup.branchDeleteError = (err?.stderr ?? err?.message ?? "unknown").trim();
  }

  // 3. Clear workflow-state.currentRun.worktreePath
  try {
    await clearWorktreePathInState(repoPath);
    cleanup.workflowStateCleared = true;
  } catch (err: any) {
    cleanup.workflowStateClearError = (err?.message ?? "unknown").trim();
  }

  return cleanup;
}

// ---------------------------------------------------------------------------
// Helpers extracted from runAutoMerge to keep cyclomatic complexity ≤ 15
// ---------------------------------------------------------------------------

/** Context shared across the live-path helpers. */
interface MergeContext {
  repoPath: string;
  worktreePath: string;
  branchName: string;
  sliceId: string;
  featureId: string | null;
  startTime: number;
}

/** Build the DryRunPlan object (no git, no state writes). */
async function buildDryRunPlan(
  opts: AutoMergeOptions,
  commitMessage: string,
  autoPushOnMerge: boolean
): Promise<DryRunPlan> {
  const { repoPath, worktreePath, branchName, sliceId, featureId, gradeAvg, decisionIds } = opts;
  const workflowState = await readCrewWorkflowState(repoPath);
  const { satisfied } = isValidationGateSatisfied(workflowState);

  const plannedSteps: string[] = [
    `1. Preflight: check main dirty-tree and branch ${branchName} existence`,
    `2. git -C ${repoPath} fetch origin`,
    `3. git -C ${worktreePath} rebase origin/main`,
    `4. git -C ${repoPath} checkout main`,
    `5. git -C ${repoPath} merge --squash ${branchName}`,
    `6. git -C ${repoPath} commit -m "<commit message>"`,
    autoPushOnMerge
      ? `7. git -C ${repoPath} push origin main (autoPushOnMerge=true)`
      : `7. Push skipped (autoPushOnMerge=false)`,
    `8. Cleanup: git branch -d ${branchName}, git worktree remove ${worktreePath}, clear workflow-state.worktreePath`
  ];

  return {
    status: "dry-run",
    rebaseOnto: "origin/main",
    commitMessage,
    wouldPush: autoPushOnMerge,
    plannedSteps,
    validationGateSatisfied: satisfied,
    inputs: {
      sliceId,
      featureId,
      branchName,
      worktreePath,
      gradeAvg,
      decisionIds,
      autoPushOnMerge
    }
  };
}

/** Check validation gate; throws MergeError (+ badge + audit) if not satisfied. */
async function checkValidationGate(ctx: MergeContext): Promise<void> {
  const workflowState = await readCrewWorkflowState(ctx.repoPath);
  const { satisfied, status: gateStatus } = isValidationGateSatisfied(workflowState);
  if (satisfied) return;

  const code = gateStatus === "failed" ? "VALIDATION_FAILED" : "VALIDATION_REQUIRED";
  const mergeErr = new MergeError({
    code,
    message:
      code === "VALIDATION_FAILED"
        ? `Validation gate explicitly failed for ${ctx.sliceId}. Cannot auto-merge.`
        : `Validation gate not satisfied for ${ctx.sliceId}. Run /crew:validate or pass --skip-validation-check.`,
    failedStep: "validation-gate",
    fixHint: `Open the validation artifact to see what failed, then re-run /loop:slice complete.`,
    attemptedBranch: ctx.branchName,
    attemptedWorktree: ctx.worktreePath
  });
  await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
  throw mergeErr;
}

/** Run git fetch origin. Throws MergeError on failure. */
async function fetchOrigin(ctx: MergeContext): Promise<void> {
  try {
    await git(ctx.repoPath, ["fetch", "origin"]);
  } catch (err: any) {
    const mergeErr = new MergeError({
      code: "FETCH_FAILED",
      message: `git fetch origin failed: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "fetch",
      gitStderr: (err?.stderr ?? "").trim(),
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
    throw mergeErr;
  }
}

/** Rebase the slice branch worktree onto origin/main. Throws MergeError on conflict. */
async function rebaseBranchOntoMain(ctx: MergeContext): Promise<void> {
  try {
    await git(ctx.worktreePath, ["rebase", "origin/main"]);
  } catch (err: any) {
    try {
      await git(ctx.worktreePath, ["rebase", "--abort"]);
    } catch {
      /* ignore */
    }
    const mergeErr = new MergeError({
      code: "REBASE_CONFLICT",
      message: `git rebase origin/main failed for branch ${ctx.branchName}: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "rebase",
      gitStderr: (err?.stderr ?? "").trim(),
      fixHint: `Run \`/crew:fix\` against worktree \`${ctx.worktreePath}\` to resolve rebase conflict.`,
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
    throw mergeErr;
  }
}

/** Fetch + rebase orchestrator (calls the two single-step helpers). */
async function fetchAndRebase(ctx: MergeContext): Promise<void> {
  await fetchOrigin(ctx);
  await rebaseBranchOntoMain(ctx);
}

/** Checkout main and squash-merge the slice branch. Throws MergeError on failure. */
async function checkoutAndSquash(ctx: MergeContext): Promise<void> {
  try {
    await git(ctx.repoPath, ["checkout", "main"]);
  } catch (err: any) {
    const mergeErr = new MergeError({
      code: "MERGE_FAILED",
      message: `git checkout main failed: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "merge",
      gitStderr: (err?.stderr ?? "").trim(),
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
    throw mergeErr;
  }

  try {
    await git(ctx.repoPath, ["merge", "--squash", ctx.branchName]);
  } catch (err: any) {
    const mergeErr = new MergeError({
      code: "MERGE_FAILED",
      message: `git merge --squash ${ctx.branchName} failed: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "merge",
      gitStderr: (err?.stderr ?? "").trim(),
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
    throw mergeErr;
  }
}

/** Commit the squash merge and capture the resulting SHA. Throws MergeError on failure. */
async function commitSquash(ctx: MergeContext, commitMessage: string): Promise<string> {
  try {
    await git(ctx.repoPath, ["commit", "-m", commitMessage]);
  } catch (err: any) {
    try {
      await git(ctx.repoPath, ["reset", "--hard", "HEAD"]);
    } catch {
      /* ignore */
    }
    const mergeErr = new MergeError({
      code: "MERGE_FAILED",
      message: `git commit failed: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "merge",
      gitStderr: (err?.stderr ?? "").trim(),
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(ctx.repoPath, mergeErr, ctx.sliceId, ctx.featureId, ctx.startTime);
    throw mergeErr;
  }

  let mergeCommitSha = "";
  try {
    const { stdout } = await git(ctx.repoPath, ["rev-parse", "HEAD"]);
    mergeCommitSha = stdout.trim();
  } catch {
    /* best-effort */
  }
  return mergeCommitSha;
}

/** Squash, commit, and return SHA — thin orchestrator over the two single-step helpers. */
async function squashAndCommit(ctx: MergeContext, commitMessage: string): Promise<string> {
  await checkoutAndSquash(ctx);
  return commitSquash(ctx, commitMessage);
}

/** Push to origin/main when autoPushOnMerge is true. Returns push result. */
async function pushIfEnabled(
  ctx: MergeContext,
  autoPushOnMerge: boolean,
  mergeCommitSha: string
): Promise<{ pushed: boolean; pushSkippedReason: MergeResult["pushSkippedReason"] }> {
  if (!autoPushOnMerge) {
    return { pushed: false, pushSkippedReason: "config-disabled" };
  }
  try {
    await git(ctx.repoPath, ["push", "origin", "main"]);
    return { pushed: true, pushSkippedReason: null };
  } catch (err: any) {
    const mergeErr = new MergeError({
      code: "PUSH_FAILED",
      message: `git push origin main failed: ${(err?.stderr ?? err?.message ?? "").trim()}`,
      failedStep: "push",
      gitStderr: (err?.stderr ?? "").trim(),
      fixHint: `Run 'git push origin main' manually — the commit is on local main.`,
      attemptedBranch: ctx.branchName,
      attemptedWorktree: ctx.worktreePath
    });
    await handleMergeError(
      ctx.repoPath,
      mergeErr,
      ctx.sliceId,
      ctx.featureId,
      ctx.startTime,
      mergeCommitSha
    );
    throw mergeErr;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Drive validation-gate read → rebase → squash-merge → push? → cleanup.
 *
 * Returns MergeResult on success, DryRunPlan on dry-run, throws MergeError
 * on any failure path. NEVER swallows git errors silently. NEVER mutates
 * the slice branch destructively (no -D, no --force, no --force-with-lease).
 */
export async function runAutoMerge(opts: AutoMergeOptions): Promise<MergeResult | DryRunPlan> {
  const {
    repoPath,
    worktreePath,
    branchName,
    sliceId,
    sliceTitle,
    featureId,
    gradeAvg,
    decisionIds,
    config,
    dryRun = false
  } = opts;

  const autoPushOnMerge = config?.loop?.autoPushOnMerge === true;
  const startTime = Date.now();
  const ctx: MergeContext = { repoPath, worktreePath, branchName, sliceId, featureId, startTime };

  // Render commit message (throws MergeError on empty sliceTitle/sliceId)
  const commitMessage = renderCommitMessage({
    sliceTitle,
    sliceId,
    featureId,
    gradeAvg,
    decisionIds
  });

  // --dry-run: pure derivation — no git mutations, no state writes, no audit
  if (dryRun) {
    return buildDryRunPlan(opts, commitMessage, autoPushOnMerge);
  }

  // 1. Validation gate check (throws on fail)
  await checkValidationGate(ctx);

  // Clear any previous merge_failed badge on entry
  await clearMergeFailedBadge(repoPath);

  // 2. Preflight checks
  try {
    await preflightChecks(repoPath, worktreePath, branchName);
  } catch (err: any) {
    await handleMergeError(repoPath, err, sliceId, featureId, startTime);
    throw err;
  }

  // 3+4. Fetch + rebase (throws on failure)
  await fetchAndRebase(ctx);

  // 5+6+7. Squash + commit (throws on failure)
  const mergeCommitSha = await squashAndCommit(ctx, commitMessage);

  // 8. Optional push
  const { pushed, pushSkippedReason } = await pushIfEnabled(ctx, autoPushOnMerge, mergeCommitSha);

  // 9. Cleanup (best-effort, individually isolated)
  const cleanup = await runCleanup(repoPath, worktreePath, branchName);

  // Write audit log on success
  await writeAuditEntry(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:auto-merge",
    parentCommand: "slice-complete",
    ok: true,
    skipped: false,
    skipReason: null,
    durationMs: Date.now() - startTime,
    merge: {
      branch: branchName,
      worktree: worktreePath,
      mergeCommitSha,
      pushed,
      failedStep: null,
      code: null
    }
  });

  return {
    status: "merged",
    mergeCommitSha,
    commitMessage,
    pushed,
    pushSkippedReason,
    cleanup
  };
}

// ---------------------------------------------------------------------------
// Error handler (badge write + audit log)
// ---------------------------------------------------------------------------

async function handleMergeError(
  repoPath: string,
  err: MergeError,
  sliceId: string,
  featureId: string | null,
  startTime: number,
  mergeCommitSha: string = ""
): Promise<void> {
  const badge: MergeFailedBadge = {
    status: "failed",
    code: err.code,
    slice: sliceId,
    feature: featureId,
    attemptedBranch: err.attemptedBranch,
    attemptedWorktree: err.attemptedWorktree,
    failedStep: err.failedStep,
    note: err.message.slice(0, 200),
    markedAt: new Date().toISOString()
  };
  await writeMergeFailedBadge(repoPath, badge);
  await writeAuditEntry(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:auto-merge",
    parentCommand: "slice-complete",
    ok: false,
    skipped: false,
    skipReason: null,
    durationMs: Date.now() - startTime,
    merge: {
      branch: err.attemptedBranch,
      worktree: err.attemptedWorktree,
      mergeCommitSha: mergeCommitSha || null,
      pushed: false,
      failedStep: err.failedStep,
      code: err.code
    }
  });
}
