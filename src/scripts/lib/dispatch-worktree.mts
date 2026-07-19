import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DispatchWorktreeError } from "./dispatch-types.mjs";
import { validateBranchName } from "./dispatch-gates.mjs";
import { appendJsonlSync } from "./jsonl-append.mjs";

type SpawnArgs = {
  repoRoot: string;
  parentBranch: string;
  childId: string;
  depth: number;
  runId: string;
  /**
   * Explicit base ref override (additive, FEAT-261). When omitted, the child
   * worktree bases on the invoking checkout's current HEAD (resolved fresh
   * via `git rev-parse --verify HEAD`) rather than trusting `parentBranch`
   * as a branch name — a stale local branch ref was the root cause of a
   * 2026-07-10 wave dispatch basing a worktree 21 commits behind.
   */
  baseRef?: string;
};

// FEAT-261 — status dirs a slice/feature file can live under; checked in this
// order when verifying a dispatched id exists at the resolved base tree.
const BACKLOG_STATUS_DIRS = ["pending", "triaged", "in-progress", "done"] as const;
// Only childIds shaped like a real backlog id are gated — hierarchical-dispatch
// role-fanout children (e.g. "FE", "BE") never have a backlog file and must
// not be blocked by this check.
const SLICE_OR_FEAT_ID = /^(FEAT|SLICE)-\d+/i;

/**
 * Resolve the git ref/sha a new child worktree should be based on.
 *
 * Defaults to the invoking checkout's current HEAD — resolved fresh via
 * `git rev-parse --verify HEAD` in `repoRoot` at call time — rather than
 * trusting `parentBranch` (a branch *name*) to already point at the latest
 * commit. An explicit `explicitBase` (e.g. a `--base` CLI flag) is verified
 * and resolved to its sha instead. Throws `DispatchWorktreeError` if the ref
 * cannot be resolved (never proceeds silently on an unresolvable base).
 */
export function resolveDispatchBase(repoRoot: string, explicitBase?: string): string {
  const ref = explicitBase && explicitBase.trim().length > 0 ? explicitBase.trim() : "HEAD";
  try {
    return execFileSync("git", ["rev-parse", "--verify", ref], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    })
      .toString()
      .trim();
  } catch (err) {
    throw new DispatchWorktreeError(
      `could not resolve dispatch base ref "${ref}" in ${repoRoot}: ${(err as Error).message}`
    );
  }
}

/**
 * Fail loudly if `childId` looks like a backlog id (FEAT-NNN / SLICE-NNN) and
 * its file is absent from the resolved base tree in every known status dir.
 * A no-op for non-backlog-shaped ids (role-fanout children like "FE"/"BE").
 *
 * This is the FEAT-261 guard: the 2026-07-10 incident based a wave worktree
 * on a ref 21 commits behind, missing the dispatched slice's own file
 * entirely — the builder then re-authored ACs and minted colliding ids
 * rather than failing fast.
 */
export function assertSliceExistsAtBase(repoRoot: string, baseRef: string, childId: string): void {
  const match = childId.match(SLICE_OR_FEAT_ID);
  if (!match) return;
  const idPrefix = match[0];
  const candidates = BACKLOG_STATUS_DIRS.map(
    (dir) => `.claude/artifacts/loop/backlog/${dir}/${idPrefix}.md`
  );
  for (const candidate of candidates) {
    try {
      execFileSync("git", ["cat-file", "-e", `${baseRef}:${candidate}`], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      });
      return;
    } catch {
      // not at this candidate path — try the next status dir
    }
  }
  throw new DispatchWorktreeError(
    `stale dispatch base: "${idPrefix}" not found at base ${baseRef} in any of ` +
      `${candidates.join(", ")}. The base ref is likely stale (missing recent backlog ` +
      "commits) — refresh it (fetch/pull) or pass an explicit base ref that contains this id."
  );
}

// FEAT-249 — loop-owned artifact paths preflightGitClean must not self-block
// on. `wave run` (src/scripts/lib/wave/runner.mts) appends wave_started /
// plan_built telemetry to `.claude/artifacts/loop/waves/<waveId>/events.jsonl`
// BEFORE calling dispatch prepare (which reaches this check), so the wave's
// own crash-forensics write was tripping its own dirty-tree gate. Scoped to
// `.claude/artifacts/loop/` generally (not just waves/) since other
// loop-owned artifacts (dispatch trace/summary) share the same "write before
// the dirty check can see it" shape.
const LOOP_ARTIFACT_ALLOWLIST_PREFIX = ".claude/artifacts/loop/";

export function preflightGitClean(repoRoot: string, parentBranch: string): void {
  try {
    execFileSync("git", ["rev-parse", "--verify", parentBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new DispatchWorktreeError(`parentBranch not found: ${parentBranch}`);
  }
  // Exclude the loop-artifact allowlist via git's own pathspec magic rather
  // than post-filtering `--porcelain` lines textually: when an entire new
  // directory is untracked, git collapses it to one line for that directory
  // (e.g. `?? .claude/`) instead of listing files inside it, which a
  // line-prefix filter would miss. The `:(exclude)` pathspec makes git itself
  // compute status as if the excluded tree didn't exist, so collapsing can
  // never smuggle a non-allowlisted change past the check.
  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--", ".", `:(exclude)${LOOP_ARTIFACT_ALLOWLIST_PREFIX}**`],
    { cwd: repoRoot }
  ).toString();
  if (status.trim().length > 0) {
    throw new DispatchWorktreeError(`working tree dirty on ${parentBranch}`);
  }
  execFileSync("git", ["worktree", "prune"], { cwd: repoRoot });
}

// Compute the sibling worktree directory for a dispatch child. The repoRoot is
// resolved to an absolute path FIRST (FEAT-267 AC-2): a relative repoRoot of
// "." would otherwise collapse `path.basename(".")`/`path.dirname(".")` to "."
// and yield an in-repo `.-<childId>-<depth>` directory that pollutes git status
// (the exact defect that stranded worktrees in the 2026-07-19 interrupted wave).
export function childWorktreePath(repoRoot: string, childId: string, depth: number): string {
  const absRepoRoot = path.resolve(repoRoot);
  const baseName = path.basename(absRepoRoot);
  return path.join(path.dirname(absRepoRoot), `${baseName}-${childId}-${depth}`);
}

export function createChildWorktree(args: SpawnArgs): {
  worktreePath: string;
  branch: string;
  baseRef: string;
} {
  const { repoRoot, parentBranch, childId, depth, runId, baseRef } = args;
  const childBranch = `${parentBranch}-${childId}`;
  validateBranchName(childBranch);
  const resolvedBase = resolveDispatchBase(repoRoot, baseRef);
  assertSliceExistsAtBase(repoRoot, resolvedBase, childId);
  const worktreePath = childWorktreePath(repoRoot, childId, depth);
  try {
    execFileSync("git", ["worktree", "add", worktreePath, resolvedBase, "-b", childBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    throw new DispatchWorktreeError(
      `worktree add failed for ${childId}: ${(err as Error).message}`
    );
  }
  const logDir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  appendJsonlSync(path.join(logDir, "worktrees.jsonl"), {
    ts: new Date().toISOString(),
    childId,
    branch: childBranch,
    path: worktreePath,
    depth,
    baseRef: resolvedBase
  });
  return { worktreePath, branch: childBranch, baseRef: resolvedBase };
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

// ──────────────────────────────────────────────────────────────────────────
// FEAT-202 SLICE-B — cherry-pick handoff commits from worker branch onto main
// ──────────────────────────────────────────────────────────────────────────

export interface CherryPickResult {
  /** Paths of handoff files successfully cherry-picked onto parentBranch. */
  cherryPicked: string[];
  /** Paths of handoff files whose cherry-pick conflicted and was aborted. */
  skippedConflict: string[];
  /** True if ANY commit triggered a conflict (aborted + parent branch tip restored). */
  aborted: boolean;
}

/**
 * Find commits on `branch` not reachable from `parentBranch` that introduce
 * handoff-candidate files. A file is a candidate if its path matches
 * `.claude/artifacts/crew/handoffs/**\/*.md` OR contains "handoff" and ends
 * with `.md` anywhere under `.claude/artifacts/`.
 *
 * Returns a map from commit SHA → list of candidate paths it introduced.
 * Only commits where `--diff-filter=A` (Added) applies are included.
 */
function findHandoffCommits(
  repoRoot: string,
  branch: string,
  parentBranch: string
): Map<string, string[]> {
  const byCommit = new Map<string, string[]>();
  let raw: string;
  try {
    raw = execFileSync(
      "git",
      ["log", `${parentBranch}..${branch}`, "--name-only", "--diff-filter=A", "--format=%H"],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
    ).toString();
  } catch {
    return byCommit;
  }

  let currentSha = "";
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // A 40-hex-char line is a commit SHA.
    if (/^[0-9a-f]{40}$/.test(trimmed)) {
      currentSha = trimmed;
    } else if (currentSha && isHandoffCandidate(trimmed)) {
      const paths = byCommit.get(currentSha) ?? [];
      paths.push(trimmed);
      byCommit.set(currentSha, paths);
    }
  }

  // Remove commits whose candidate list is empty (defensive).
  for (const [sha, paths] of byCommit) {
    if (paths.length === 0) byCommit.delete(sha);
  }
  return byCommit;
}

function isHandoffCandidate(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes(".claude/artifacts/crew/handoffs/") && normalized.endsWith(".md")) {
    return true;
  }
  if (
    normalized.startsWith(".claude/artifacts/") &&
    normalized.includes("handoff") &&
    normalized.endsWith(".md")
  ) {
    return true;
  }
  return false;
}

/**
 * Cherry-pick commits from `branch` onto `parentBranch` that introduce
 * handoff artifact files (`.claude/artifacts/crew/handoffs/**\/*.md` or
 * any `**\/*handoff*.md` under `.claude/artifacts/`).
 *
 * **Precondition (caller responsibility):** `parentBranch` MUST be checked
 * out at `repoRoot` when this function is called. `mergeChildren` satisfies
 * this naturally because it runs `git checkout parentBranch` before dispatch.
 *
 * For each unique commit that added a candidate file, runs:
 *   `git -C repoRoot cherry-pick <sha>`
 * On non-zero exit, immediately runs `git cherry-pick --abort` to restore the
 * parent-branch tip, and adds the sha's candidate paths to `skippedConflict`.
 *
 * Returns synchronously after all candidates are processed.
 */
export function cherryPickHandoffsFromBranch(
  repoRoot: string,
  branch: string,
  parentBranch: string
): CherryPickResult {
  const handoffCommits = findHandoffCommits(repoRoot, branch, parentBranch);
  const cherryPicked: string[] = [];
  const skippedConflict: string[] = [];
  let aborted = false;

  for (const [sha, paths] of handoffCommits) {
    const picked = tryCherryPick(repoRoot, sha);
    if (picked) {
      cherryPicked.push(...paths);
    } else {
      abortCherryPick(repoRoot);
      skippedConflict.push(...paths);
      aborted = true;
    }
  }

  return { cherryPicked, skippedConflict, aborted };
}

function tryCherryPick(repoRoot: string, sha: string): boolean {
  try {
    execFileSync("git", ["cherry-pick", sha], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}

function abortCherryPick(repoRoot: string): void {
  try {
    execFileSync("git", ["cherry-pick", "--abort"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    // if nothing in progress, ignore
  }
}

/**
 * Append a `WorkerInventory` to the JSONL log under the runId's dispatch dir.
 * Best-effort; failures swallowed so callers don't block on logging.
 */
export function appendInventoryLog(
  repoRoot: string,
  runId: string,
  entry: WorkerInventory & { childId: string; status: string; cherryPickResult?: CherryPickResult }
): void {
  const logDir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  appendJsonlSync(
    path.join(logDir, "inventory.jsonl"),
    { ts: new Date().toISOString(), ...entry },
    { swallowErrors: true }
  );
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

/**
 * Write a Markdown `worker-failed-<childId>.md` summary for FAIL children.
 * Mirrors `writeWorkerPreservedArtifact` but uses a "WORKER FAILED" header,
 * shows cherry-pick result summary, and prescribes manual review.
 *
 * Best-effort; failures swallowed so callers don't block on logging.
 */
export function writeWorkerFailedArtifact(
  repoRoot: string,
  runId: string,
  childId: string,
  inventory: WorkerInventory,
  cherryPickResult: CherryPickResult
): void {
  try {
    const dir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs.mkdirSync(dir, { recursive: true });
    const filesPreview = inventory.filesOnBranchNotOnMain.slice(0, 10);
    const wipPreview = inventory.uncommittedWip.slice(0, 10);
    const body = `${[
      `# WORKER FAILED — ${childId}`,
      "",
      `**status:** FAIL`,
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
      `## Cherry-pick result`,
      "",
      `- Picked: ${cherryPickResult.cherryPicked.length} handoff file(s)`,
      `- Skipped (conflict): ${cherryPickResult.skippedConflict.length} handoff file(s)`,
      cherryPickResult.cherryPicked.length > 0
        ? cherryPickResult.cherryPicked.map((p) => `  - picked: \`${p}\``).join("\n")
        : "",
      cherryPickResult.skippedConflict.length > 0
        ? cherryPickResult.skippedConflict.map((p) => `  - skipped: \`${p}\``).join("\n")
        : "",
      "",
      `## Next action`,
      "",
      "Manual review required — worktree preserved for inspection.",
      "Cherry-pick was attempted (see inventory.jsonl); resolve any skipped conflicts manually.",
      ""
    ]
      .filter((line) => line !== "")
      .join("\n")}\n`;
    fs.writeFileSync(path.join(dir, `worker-failed-${childId}.md`), body);
  } catch {
    // best-effort
  }
}
