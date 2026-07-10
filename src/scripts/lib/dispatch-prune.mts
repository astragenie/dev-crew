// FEAT-205 SLICE-138 — Dispatch prune reaper.
//
// Scans `.claude/artifacts/loop/dispatch/<runId>/` directories, identifies
// stale closed runs, and tears them down: git worktree remove --force,
// git branch -D, then rm -rf the runId directory.
//
// In-flight guard: a runId is considered open (and therefore skipped) when
// `summary.md` is absent OR `trace.jsonl` was modified within the last 5min.
//
// Age computation: extracted from the runId string when it parses as an ISO
// date prefix (e.g. `2026-07-01T...`); falls back to directory mtime.

import fs from "node:fs/promises";
import { existsSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { runGit } from "./run-git.mjs";

export interface StaleRunEntry {
  runId: string;
  ageDays: number;
  worktreeCount: number;
  branchCount: number;
}

export interface PruneRunResult {
  worktreesRemoved: number;
  branchesRemoved: number;
  dirRemoved: boolean;
  errors: string[];
}

export interface PruneStaleResult {
  listed: number;
  pruned: number;
  failed: number;
  errors: string[];
}

export interface PruneStaleOptions {
  olderThanDays?: number;
  dryRun?: boolean;
}

const IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function dispatchRoot(repoRoot: string): string {
  return path.join(repoRoot, ".claude", "artifacts", "loop", "dispatch");
}

/**
 * Extract ISO timestamp from runId string (e.g. "2026-07-01T08-42-52-174Z-23c48c").
 * Returns a Date if parseable, null otherwise.
 */
function parseRunIdDate(runId: string): Date | null {
  // Canonical format: YYYY-MM-DDTHH-mm-ss-MMMZ-<hex>
  // Normalise separators: replace first occurrence of T, then replace all "-" after T
  // with ":",":", "." to reconstruct an ISO string.
  const m = runId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d+)Z/);
  if (!m) return null;
  const [, date, hh, mm, ss, ms] = m;
  const iso = `${date}T${hh}:${mm}:${ss}.${ms}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function runIdAgeDays(runId: string, dirPath: string, nowMs: number): number {
  const fromId = parseRunIdDate(runId);
  if (fromId) {
    return (nowMs - fromId.getTime()) / (1000 * 60 * 60 * 24);
  }
  try {
    const s = statSync(dirPath);
    return (nowMs - s.mtimeMs) / (1000 * 60 * 60 * 24);
  } catch {
    return 0;
  }
}

/**
 * Determine if a runId directory represents an in-flight (open) run.
 *
 * A run is open when:
 *   - summary.md is missing, OR
 *   - trace.jsonl was modified within the last 5 minutes.
 */
async function isInFlight(runDir: string, nowMs: number): Promise<boolean> {
  const summaryPath = path.join(runDir, "summary.md");
  if (!existsSync(summaryPath)) return true;

  const tracePath = path.join(runDir, "trace.jsonl");
  if (!existsSync(tracePath)) return false;

  try {
    const s = await fs.stat(tracePath);
    return nowMs - s.mtimeMs < IN_FLIGHT_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * Count worktrees registered for a runId by reading worktrees.jsonl.
 * Also returns branch names found in that log.
 */
function readWorktreesFromLog(runDir: string): {
  worktreePaths: string[];
  branches: string[];
} {
  const logPath = path.join(runDir, "worktrees.jsonl");
  const worktreePaths: string[] = [];
  const branches: string[] = [];
  if (!existsSync(logPath)) return { worktreePaths, branches };
  let raw: string;
  try {
    raw = readFileSync(logPath, "utf8");
  } catch {
    return { worktreePaths, branches };
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (typeof entry.path === "string") worktreePaths.push(entry.path);
      if (typeof entry.branch === "string") branches.push(entry.branch);
    } catch {
      // skip malformed lines
    }
  }
  return { worktreePaths, branches };
}

/**
 * List stale (closed + older than `olderThanDays`) runId directories.
 */
export async function listStaleRunIds(
  repoRoot: string,
  olderThanDays: number
): Promise<StaleRunEntry[]> {
  const dispDir = dispatchRoot(repoRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dispDir);
  } catch {
    return [];
  }

  const nowMs = Date.now();
  const results: StaleRunEntry[] = [];

  for (const name of entries) {
    const runDir = path.join(dispDir, name);
    let isDir = false;
    try {
      const s = await fs.stat(runDir);
      isDir = s.isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    const ageDays = runIdAgeDays(name, runDir, nowMs);
    if (ageDays < olderThanDays) continue;

    const open = await isInFlight(runDir, nowMs);
    if (open) continue;

    const { worktreePaths, branches } = readWorktreesFromLog(runDir);
    results.push({
      runId: name,
      ageDays,
      worktreeCount: worktreePaths.length,
      branchCount: branches.length
    });
  }

  return results;
}

/**
 * Remove a single runId: worktrees, branches, then the runId directory.
 * Continues on individual failures; aggregates errors in the result.
 */
export async function pruneRunId(repoRoot: string, runId: string): Promise<PruneRunResult> {
  const dispDir = dispatchRoot(repoRoot);
  const runDir = path.join(dispDir, runId);
  const errors: string[] = [];
  let worktreesRemoved = 0;
  let branchesRemoved = 0;
  let dirRemoved = false;

  const { worktreePaths, branches } = readWorktreesFromLog(runDir);

  // Remove worktrees first
  for (const wt of worktreePaths) {
    try {
      const result = await runGit(["worktree", "remove", "--force", wt], { cwd: repoRoot });
      if (!result.ok) {
        throw new Error(
          `git worktree remove --force ${wt} exited ${result.status}: ${result.stderr}`
        );
      }
      worktreesRemoved += 1;
    } catch (err) {
      errors.push(`worktree remove ${wt}: ${(err as Error).message}`);
    }
  }

  // Remove branches
  for (const branch of branches) {
    try {
      const result = await runGit(["branch", "-D", branch], { cwd: repoRoot });
      if (!result.ok) {
        throw new Error(`git branch -D ${branch} exited ${result.status}: ${result.stderr}`);
      }
      branchesRemoved += 1;
    } catch (err) {
      errors.push(`branch -D ${branch}: ${(err as Error).message}`);
    }
  }

  // Remove the runId directory
  try {
    await fs.rm(runDir, { recursive: true, force: true });
    dirRemoved = true;
  } catch (err) {
    errors.push(`rm -rf ${runDir}: ${(err as Error).message}`);
  }

  return { worktreesRemoved, branchesRemoved, dirRemoved, errors };
}

/**
 * Prune all stale runIds that are older than `olderThanDays`.
 * In dry-run mode: returns the list without touching disk.
 */
export async function pruneStale(
  repoRoot: string,
  opts: PruneStaleOptions = {}
): Promise<PruneStaleResult> {
  const { olderThanDays = 7, dryRun = false } = opts;
  const stale = await listStaleRunIds(repoRoot, olderThanDays);
  const allErrors: string[] = [];
  let pruned = 0;
  let failed = 0;

  if (dryRun) {
    return { listed: stale.length, pruned: 0, failed: 0, errors: [] };
  }

  for (const entry of stale) {
    const result = await pruneRunId(repoRoot, entry.runId);
    if (result.errors.length > 0) {
      failed += 1;
      for (const e of result.errors) {
        allErrors.push(`[${entry.runId}] ${e}`);
      }
    } else {
      pruned += 1;
    }
  }

  return { listed: stale.length, pruned, failed, errors: allErrors };
}
