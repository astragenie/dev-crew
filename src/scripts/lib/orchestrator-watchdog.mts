// FEAT-259 SLICE-185 — Orchestrator watchdog rule (auto-nudge-once +
// fresh-mtime guard).
//
// Scope note (measured, 2026-08-04): FEAT-259's own "New evidence" section
// and the SLICE-184/187 independence finding establish that this repo has
// NO orchestrator-side execution point that can observe a dispatched
// subagent's live idle/stop state — `slice-linker/dispatch.mts` is pure
// prompt-string assembly with no execution or observation machinery, and
// hooks (`hooks/report-gate.mjs`, SLICE-187) run as detached `node`
// processes with no access to the live session's Monitor/TaskList state.
// Only the interactive orchestrator turn itself (this session, or a future
// one) has that visibility, and it is not scriptable from a Bun CLI entry
// point the way e.g. `dispatch-prune.mts` is.
//
// This module is therefore built and shipped as a PURE DECISION FUNCTION —
// deliberately not wired to any call site. It is NOT WIRED to any execution
// point today (FEAT-281's "tested but never wired" pattern is exactly what
// this header exists to avoid repeating silently). A future orchestrator
// tick (or a lead manually reasoning about a stalled dispatch) is the
// intended caller: gather a `LaneObservation` per dispatched agent (idle
// state from the session's own Monitor/TaskList view, worktree state via
// `inspectWorktree` below), fold it through `classifyLaneCondition` then
// `decideWatchdogAction`, and act on the returned `WatchdogAction` — send
// the nudge text, or treat the lane as `report_missing` and fall back to
// worktree evidence (git log + artifacts) as FEAT-259 AC4 specifies.
//
// Three conditions, checked in this priority order (see classifyLaneCondition):
//
//   1. "running"             — worktree activity fresher than the configured
//                               threshold. HARD GUARD: never nudge. Nudging a
//                               RUNNING builder forks execution (dev-team#162)
//                               — this is the one mistake this module exists
//                               to make structurally impossible, so it wins
//                               over every other signal including uncommitted
//                               changes (mid-edit dirt on a running agent is
//                               normal, not a symptom).
//   2. "stopped_uncommitted"  — worktree stopped (not fresh) AND has
//                               uncommitted changes (tracked or untracked —
//                               both are destroyed on prune). Strictly worse
//                               than a missing report: work is lost outright.
//                               Recovery is a nudge to COMMIT, never a
//                               respawn.
//   3. "idle_without_report"  — agent went idle (idle_notification) and no
//                               report (SendMessage to main) has been
//                               observed. Recovery is a nudge to REPORT.
//   4. "ok"                   — nothing to do.
//
// Auto-nudge-once bound: `decideWatchdogAction` nudges a given
// agent+condition pair exactly once (tracked in `WatchdogLaneState.
// nudgeCounts`). A second silent occurrence of the SAME condition after that
// nudge sets `reportMissing: true` — the orchestrator proceeds from worktree
// evidence rather than nudging again. Once a lane is marked report_missing,
// every subsequent call is a no-op for that lane (no further nudges,
// regardless of which condition is observed) — the orchestrator has already
// moved on to worktree-evidence fallback for it.
//
// Freshness default (5 minutes): matches `IN_FLIGHT_WINDOW_MS` already
// established in `dispatch-tree-snapshot.mts` and `dispatch-prune.mts` for
// the identical judgment call ("is this run still active?") — reusing the
// existing repo convention avoids two different answers to the same
// question living in the same codebase. Configurable via
// `loop.watchdog.freshnessMinutes` in `.claude/loop.json` for repos whose
// dispatch cadence runs longer between tool calls (see
// resolveFreshnessThresholdMs).

import fs from "node:fs/promises";
import path from "node:path";
import { gitText, runGit } from "./run-git.mjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WatchdogCondition = "running" | "stopped_uncommitted" | "idle_without_report" | "ok";

/** Conditions that are ever eligible for a nudge (excludes "running"/"ok"). */
export type NudgeableCondition = Exclude<WatchdogCondition, "running" | "ok">;

export type WatchdogAction = "nudge_commit" | "nudge_report" | "mark_report_missing" | "none";

/** Worktree-side observation for one dispatched agent's lane. Gathered by
 * `inspectWorktree` (real I/O) and kept separate from the pure decision
 * functions below so the decision logic itself needs no filesystem/git
 * access and is trivially unit-testable. */
export interface WorktreeObservation {
  /** The worktree path exists on disk. */
  exists: boolean;
  /** `git status --porcelain -uall` (tracked + untracked) is non-empty. */
  hasUncommittedChanges: boolean;
  /** ms-since-epoch of the freshest activity signal found, or null when
   * `exists` is false (nothing to inspect). See inspectWorktree for the
   * fallback chain used to fill this in even on a clean worktree. */
  freshestActivityMs: number | null;
}

/** Everything the watchdog needs to know about one dispatched agent's lane
 * for a single tick. `worktree` is null when the dispatch has no worktree
 * to inspect (e.g. non-worktree-mode dispatch) — freshness/uncommitted
 * checks are then simply skipped and only idle/report state applies. */
export interface LaneObservation {
  agentId: string;
  /** True when the last event observed for this agent was a bare
   * idle_notification (no report received alongside it). */
  idleNotificationSeen: boolean;
  /** True once a report (SendMessage to main) has been received from this
   * agent for its current dispatch. */
  reportReceived: boolean;
  worktree: WorktreeObservation | null;
}

/** Persisted, per-agent watchdog state carried across ticks by the caller. */
export interface WatchdogLaneState {
  /** Nudges already sent, per condition — the auto-nudge-once bound. */
  nudgeCounts: Partial<Record<NudgeableCondition, number>>;
  /** Set once a second silent occurrence follows a nudge for any condition.
   * Once true, the lane is done being nudged; the orchestrator proceeds
   * from worktree evidence. */
  reportMissing: boolean;
}

export interface WatchdogDecision {
  agentId: string;
  condition: WatchdogCondition;
  action: WatchdogAction;
  /** Nudge text to send, or null when action is "none"/"mark_report_missing". */
  message: string | null;
  /** Updated lane state the caller must persist for the next tick. */
  nextState: WatchdogLaneState;
}

// ---------------------------------------------------------------------------
// Freshness threshold
// ---------------------------------------------------------------------------

/** Default freshness window — see header for the IN_FLIGHT_WINDOW_MS-parity
 * rationale. */
const DEFAULT_FRESHNESS_MS = 5 * 60 * 1000;

/**
 * Resolve the configured freshness threshold from `.claude/loop.json`'s
 * `loop.watchdog.freshnessMinutes`, falling back to the 5-minute default on
 * anything absent, non-numeric, or non-positive.
 */
export function resolveFreshnessThresholdMs(config: Record<string, unknown> | null): number {
  const loop = (config as { loop?: { watchdog?: { freshnessMinutes?: unknown } } } | null)?.loop;
  const configured = loop?.watchdog?.freshnessMinutes;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return configured * 60 * 1000;
  }
  return DEFAULT_FRESHNESS_MS;
}

// ---------------------------------------------------------------------------
// Pure classification + decision
// ---------------------------------------------------------------------------

export function emptyLaneState(): WatchdogLaneState {
  return { nudgeCounts: {}, reportMissing: false };
}

/**
 * Classify one lane's condition for this tick. Pure function — no I/O.
 * Priority order matches the header: running (HARD GUARD) beats
 * stopped_uncommitted beats idle_without_report beats ok.
 */
export function classifyLaneCondition(
  observation: LaneObservation,
  nowMs: number,
  freshnessThresholdMs: number = DEFAULT_FRESHNESS_MS
): WatchdogCondition {
  const wt = observation.worktree;

  if (wt?.exists && wt.freshestActivityMs !== null) {
    const ageMs = nowMs - wt.freshestActivityMs;
    if (ageMs < freshnessThresholdMs) return "running";
  }

  if (wt?.exists && wt.hasUncommittedChanges) return "stopped_uncommitted";

  if (observation.idleNotificationSeen && !observation.reportReceived) {
    return "idle_without_report";
  }

  return "ok";
}

/** Nudge text — deliberately distinct per condition (FEAT-259 requirement:
 * "send your report" and "commit before it is pruned" are different
 * instructions; conflating them wastes the one nudge a lane gets). */
export function nudgeMessageFor(condition: NudgeableCondition): string {
  if (condition === "stopped_uncommitted") {
    return (
      "Your worktree has uncommitted changes and you appear to have stopped. " +
      "Commit your work now — an uncommitted worktree is destroyed when pruned " +
      "and the work would be lost outright. Do not respawn or restart; just commit."
    );
  }
  return (
    'You went idle without sending a report. Send your report now via SendMessage(to: "main", ' +
    'message: "<your report>") — plain final text is not delivered to the orchestrator.'
  );
}

/**
 * Decide what (if anything) to do about one lane this tick, given its prior
 * persisted state. Pure function — no I/O, no SendMessage call; the caller
 * executes `action`/`message` and persists `nextState` for the next tick.
 *
 * - "running" / "ok": always action "none", state unchanged.
 * - First occurrence of a nudgeable condition: nudge, bump that condition's
 *   count to 1.
 * - Lane already marked report_missing: always action "none" (done nudging).
 * - Second occurrence of a condition already nudged once: mark_report_missing.
 */
export function decideWatchdogAction(
  agentId: string,
  condition: WatchdogCondition,
  priorState: WatchdogLaneState
): WatchdogDecision {
  if (condition === "running" || condition === "ok") {
    return { agentId, condition, action: "none", message: null, nextState: priorState };
  }

  if (priorState.reportMissing) {
    return { agentId, condition, action: "none", message: null, nextState: priorState };
  }

  const priorCount = priorState.nudgeCounts[condition] ?? 0;

  if (priorCount === 0) {
    const nextState: WatchdogLaneState = {
      ...priorState,
      nudgeCounts: { ...priorState.nudgeCounts, [condition]: 1 }
    };
    return {
      agentId,
      condition,
      action: condition === "stopped_uncommitted" ? "nudge_commit" : "nudge_report",
      message: nudgeMessageFor(condition),
      nextState
    };
  }

  const nextState: WatchdogLaneState = { ...priorState, reportMissing: true };
  return { agentId, condition, action: "mark_report_missing", message: null, nextState };
}

// ---------------------------------------------------------------------------
// Worktree inspection (real I/O — kept separate from the pure functions above)
// ---------------------------------------------------------------------------

/** Strip the two-char XY status code + separating space `git status
 * --porcelain` prefixes each line with, e.g. " M path", "?? path". Rename
 * entries ("R  old -> new") are left as-is; callers only use the result to
 * stat a path, and a rename's "new" path is what matters, so the raw
 * remainder (containing " -> ") simply fails the later stat and is skipped —
 * acceptable since a rename always co-occurs with other changed paths in the
 * same status output for freshness purposes. */
function parseChangedPaths(statusOut: string): string[] {
  // Porcelain lines are fixed-width: 2 status chars + 1 space + path (e.g.
  // " M README.md", "?? new-file.txt"). Strip only the trailing CR/newline
  // before slicing — trimming the WHOLE line first would eat the leading
  // space that is itself one of the two status-code columns (status " M"
  // starts with a literal space), shifting the fixed slice(3) offset by one
  // and corrupting every such path (e.g. "README.md" -> "EADME.md").
  return statusOut
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0)
    .map((line) => line.slice(3).trim());
}

async function freshestMtimeAmong(
  worktreePath: string,
  relPaths: string[]
): Promise<number | null> {
  let freshest: number | null = null;
  for (const rel of relPaths) {
    try {
      const st = await fs.stat(path.join(worktreePath, rel));
      if (freshest === null || st.mtimeMs > freshest) freshest = st.mtimeMs;
    } catch {
      // Deleted path ("D" status) or unstat-able rename remainder — not a
      // freshness signal, skip it.
    }
  }
  return freshest;
}

/** Fallback chain when no changed-file mtime is available: last commit time,
 * then the worktree root directory's own mtime. A stopped-but-clean lane
 * (e.g. a read-only investigation agent) still needs SOME freshness signal
 * — without this a just-committed, now-idle agent would read as
 * infinitely stale rather than recently active. */
async function fallbackActivityMs(worktreePath: string): Promise<number | null> {
  const commitEpoch = await gitText(["log", "-1", "--format=%ct"], { cwd: worktreePath });
  if (commitEpoch) {
    const parsed = Number(commitEpoch) * 1000;
    if (Number.isFinite(parsed)) return parsed;
  }
  try {
    const st = await fs.stat(worktreePath);
    return st.mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Inspect a worktree's real git/filesystem state for one lane. Uses tracked
 * AND untracked changes (`-uall`, not the `-uno` used by
 * worktree-manager.mts's unrelated "is the MAIN tree dirty" gate) —
 * deliberate: an agent's uncommitted new file is exactly the at-risk
 * artifact `stopped_uncommitted` exists to protect, and it is pruned right
 * alongside an unstaged edit to a tracked file.
 */
export async function inspectWorktree(worktreePath: string): Promise<WorktreeObservation> {
  try {
    await fs.access(worktreePath);
  } catch {
    return { exists: false, hasUncommittedChanges: false, freshestActivityMs: null };
  }

  // Deliberately `runGit` (untrimmed stdout), not the `gitText` helper used
  // elsewhere in this module: gitText trims the WHOLE output string, which
  // eats the leading space of a first-line " M path" porcelain entry (that
  // space is itself one of the two fixed-width status columns) and
  // corrupts parseChangedPaths's slice(3) offset for that entry.
  let statusOut = "";
  try {
    const result = await runGit(["status", "--porcelain", "-uall"], { cwd: worktreePath });
    if (result.ok) statusOut = result.stdout;
  } catch {
    // fail-open: treat as "no changes observed" — same posture as every
    // other git call in this module on a genuine spawn failure.
  }
  const changedPaths = parseChangedPaths(statusOut);
  const hasUncommittedChanges = changedPaths.length > 0;

  let freshestActivityMs = await freshestMtimeAmong(worktreePath, changedPaths);
  if (freshestActivityMs === null) {
    freshestActivityMs = await fallbackActivityMs(worktreePath);
  }

  return { exists: true, hasUncommittedChanges, freshestActivityMs };
}
