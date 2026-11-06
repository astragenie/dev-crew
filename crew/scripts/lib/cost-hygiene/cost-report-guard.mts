// FEAT-025 AC-1 shared guard: refuse to write a cost report that cannot be
// honest about what it measured, on EITHER production entry point
// (crew/scripts/lib/cost-hygiene/emit-cost-report.mts's maybeEmitCostReport,
// used by the interactive `crew write-final-synthesis` path, AND
// cost-slice-handler.mts's costSliceHandler, used by the autonomous loop's
// slice-close ceremony via src/scripts/lib/slice-linker/crew-bridge.mts).
//
// Extracted out of emit-cost-report.mts (SLICE-50 review B blocker) so both
// callers share one implementation instead of two independently-evolving
// copies. Three guards, in order:
//   1. sessionsScanned === 0 -> refuse (nothing to measure).
//   2. window wider than maxWindowHours (default 24) -> refuse unless
//      allowWideWindow is set (stale/un-rotated currentRun shape — the
//      exact #178 incident).
//   3. a run_id that already has an identical-total report on disk ->
//      refuse as a duplicate.
// On success, returns the resolved run_id so the caller can stamp it into
// the artifact's frontmatter.
import fs from "node:fs/promises";
import path from "node:path";

// Overridable via params.maxWindowHours; the refusal itself is overridable
// via params.allowWideWindow (CLI surface: --allow-wide-window).
export const DEFAULT_MAX_WINDOW_HOURS = 24;

export function windowHoursBetween(startedAt: string, completedAt: string): number {
  const ms = Date.parse(completedAt) - Date.parse(startedAt);
  if (Number.isNaN(ms)) return 0;
  return ms / (1000 * 60 * 60);
}

// run_id resolution: prefer the workflow-state run's own runId (set by
// `/runner:slice start` / dispatch-timing correlation); fall back to a
// deterministic id derived from the window itself so older workflow states
// (no runId field) still get a stable, dedup-able identifier.
export function resolveRunId(
  run: Record<string, unknown> | null | undefined,
  startedAt: string,
  completedAt: string
): string {
  const explicit = run?.["runId"];
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  return `${startedAt}_${completedAt}`;
}

// Best-effort scan of existing cost-report files in the cost dir for one
// already carrying this exact run_id + usd total — "identical totals" per
// AC-1. A plain string scan (not a full frontmatter parse) keeps this
// change small; false negatives just mean an extra (still honest) report
// gets written, never data loss.
export async function findDuplicateRunId(
  repoPath: string,
  runId: string,
  usd: number
): Promise<boolean> {
  const costDir = path.join(repoPath, ".claude", "artifacts", "crew", "cost");
  let files: string[];
  try {
    files = (await fs.readdir(costDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
  const needleRunId = `run_id: ${JSON.stringify(runId)}`;
  const needleUsd = `usd: ${usd}`;
  for (const f of files) {
    try {
      const content = await fs.readFile(path.join(costDir, f), "utf8");
      if (content.includes(needleRunId) && content.includes(needleUsd)) return true;
    } catch {
      // unreadable file — skip, never block emission on a read error
    }
  }
  return false;
}

export interface CostReportGuardParams {
  repoPath: string;
  /** workflow-state currentRun (or equivalent) — consulted for an explicit runId. */
  run: Record<string, unknown> | null | undefined;
  startedAt: string;
  completedAt: string;
  sessionsScanned: number;
  usd: number;
  /** CLI surface: --allow-wide-window. */
  allowWideWindow?: boolean | undefined;
  maxWindowHours?: number | undefined;
}

export type CostReportGuardResult =
  | { refused: false; runId: string }
  | { refused: true; reason: "sessions_scanned_zero" | "window_too_wide" | "duplicate run_id" };

/**
 * Evaluates all three AC-1 guards and resolves the run_id in one call.
 * Callers that get `{ refused: true }` must not write the slice cost-report
 * artifact; they should surface `{ written: false, reason }` instead.
 */
export async function evaluateCostReportGuard(
  params: CostReportGuardParams
): Promise<CostReportGuardResult> {
  const { repoPath, run, startedAt, completedAt, sessionsScanned, usd, allowWideWindow } = params;
  const maxWindowHours = params.maxWindowHours ?? DEFAULT_MAX_WINDOW_HOURS;

  if (sessionsScanned === 0) {
    return { refused: true, reason: "sessions_scanned_zero" };
  }

  const windowHours = windowHoursBetween(startedAt, completedAt);
  if (windowHours > maxWindowHours && !allowWideWindow) {
    return { refused: true, reason: "window_too_wide" };
  }

  const runId = resolveRunId(run, startedAt, completedAt);
  if (await findDuplicateRunId(repoPath, runId, usd)) {
    return { refused: true, reason: "duplicate run_id" };
  }

  return { refused: false, runId };
}
