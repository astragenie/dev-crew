// Per-slice cost-scan cursor (SLICE-162 / FEAT-268).
//
// Root cause (docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md):
// `tryWriteCostReport` never told `crew cost-slice` what window to scan, so
// crew fell back to `workflow-state.currentRun.startedAt` -- a value shared
// across the whole repo that only rotates when `crew write-run-brief` runs
// at slice START. Any close that isn't preceded by a fresh start for that
// same slice (retries, out-of-band reconciliation, a skipped start
// ceremony) silently inherits a stale window, sometimes days old.
//
// This module gives each slice its OWN persisted "last scanned window end"
// cursor, independent of `currentRun`. A close passes the cursor as
// `--started-at` and "now" as `--completed-at`; on success the cursor
// advances to that `--completed-at`, so the NEXT invocation for the same
// slice (a retry, a re-run) resumes exactly where the last one left off
// instead of re-reading the same frozen `currentRun.startedAt`.
//
// Mirrors shape-marker.mts / fanout-marker.mts: one JSON file per slice id
// under `.claude/artifacts/loop/`, best-effort read/write (fs errors are
// caught and swallowed -- a cursor miss just falls back to today's
// pre-fix default, it never blocks the cost-report flow).

import fs from "node:fs/promises";
import path from "node:path";

import { safeSliceId } from "../slice-id-guard.mjs";

export const CURSOR_DIR_PARTS = [".claude", "artifacts", "loop", "cost-scan-cursors"];

export type CostScanCursor = {
  sliceId: string;
  lastWindowEnd: string;
  updatedAt: string;
};

export async function readCostScanCursor(
  repoPath: string,
  sliceId: string
): Promise<CostScanCursor | null> {
  try {
    const id = safeSliceId(sliceId);
    const file = path.join(repoPath, ...CURSOR_DIR_PARTS, `${id}.json`);
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed?.sliceId !== "string" ||
      typeof parsed?.lastWindowEnd !== "string" ||
      typeof parsed?.updatedAt !== "string"
    ) {
      return null;
    }
    return parsed as CostScanCursor;
  } catch {
    return null;
  }
}

export async function writeCostScanCursor(
  repoPath: string,
  sliceId: string,
  lastWindowEnd: string
): Promise<void> {
  try {
    const id = safeSliceId(sliceId);
    const dir = path.join(repoPath, ...CURSOR_DIR_PARTS);
    await fs.mkdir(dir, { recursive: true });
    const payload: CostScanCursor = {
      sliceId: id,
      lastWindowEnd,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // best-effort — never blocks the cost-report flow
  }
}

/**
 * Resolves the `--started-at` / `--completed-at` window for one
 * `crew cost-slice` invocation.
 *
 * - `completedAt` is always "now" (via the injectable `now` clock).
 * - `startedAt` prefers this slice's own persisted cursor (the last
 *   `completedAt` this slice successfully scanned to) so a retry or
 *   re-close of the SAME slice always advances, regardless of whether
 *   `currentRun.startedAt` rotated in between.
 * - When no cursor exists yet for this slice (first-ever scan), falls
 *   back to `workflowState.currentRun.startedAt` — today's pre-fix
 *   default — so first-run behavior is unchanged. `startedAt` is `null`
 *   when neither is available; the caller omits the flag and lets crew's
 *   own fallback (or error) apply, same as before this fix.
 */
export async function resolveCostScanWindow(
  repoPath: string,
  sliceId: string | null | undefined,
  workflowState: Record<string, any> | null,
  now: () => string = () => new Date().toISOString()
): Promise<{ startedAt: string | null; completedAt: string }> {
  const completedAt = now();
  if (!sliceId) {
    return { startedAt: workflowState?.currentRun?.startedAt ?? null, completedAt };
  }
  const cursor = await readCostScanCursor(repoPath, sliceId);
  if (cursor?.lastWindowEnd) {
    return { startedAt: cursor.lastWindowEnd, completedAt };
  }
  return { startedAt: workflowState?.currentRun?.startedAt ?? null, completedAt };
}

/**
 * Resolves the crew session/transcript identity to stamp onto a cost
 * report (AC-3). Crew's own frontmatter carries no session/transcript
 * field today (verified in the root-cause spike against
 * render-frontmatter.ts) — this is the loop-side substitute.
 *
 * Prefers `CLAUDE_SESSION_ID` (the session actually driving THIS
 * cost-scan invocation — same env var session-drift.mts already reads)
 * over `workflow-state.currentRun.sessionId` (the session pinned at this
 * slice's start, which may be stale or absent by close time). Returns
 * null when neither is available — the caller skips stamping rather than
 * writing a fabricated id.
 */
export function resolveCostReportSessionId(
  workflowState: Record<string, any> | null
): string | null {
  const now = process.env.CLAUDE_SESSION_ID;
  if (typeof now === "string" && now.length > 0) return now;
  const pinned = workflowState?.currentRun?.sessionId;
  return typeof pinned === "string" && pinned.length > 0 ? pinned : null;
}
