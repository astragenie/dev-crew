// FEAT-205 SLICE-138 — Dispatch tree observability snapshot.
//
// Enumerates .claude/artifacts/loop/dispatch/<runId>/ directories and
// classifies each as open or closed. Returns aggregate telemetry consumed
// by loop-snapshot.mts and marathon-checkpoint.mts.
//
// Open runId: summary.md missing OR trace.jsonl modified within last 5min.
// Worktree count: count of paths in worktrees.jsonl (per-runId log).
// OldestRunAgeDays: age of the oldest runId dir (any state), null when empty.

import fs from "node:fs/promises";
import { existsSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface DispatchTreeSnapshot {
  openRunIds: string[];
  worktreeCount: number;
  oldestRunAgeDays: number | null;
}

function dispatchRoot(repoRoot: string): string {
  return path.join(repoRoot, ".claude", "artifacts", "loop", "dispatch");
}

/**
 * Extract ISO timestamp from runId string (e.g. "2026-07-01T08-42-52-174Z-23c48c").
 * Returns a Date if parseable, null otherwise.
 */
function parseRunIdDate(runId: string): Date | null {
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

async function isOpenRun(runDir: string, nowMs: number): Promise<boolean> {
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

function countWorktreesInLog(runDir: string): number {
  const logPath = path.join(runDir, "worktrees.jsonl");
  if (!existsSync(logPath)) return 0;
  let raw: string;
  try {
    raw = readFileSync(logPath, "utf8");
  } catch {
    return 0;
  }
  let count = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (typeof entry.path === "string") count += 1;
    } catch {
      // skip malformed lines
    }
  }
  return count;
}

/**
 * Read and return a snapshot of the dispatch tree state.
 *
 * - `openRunIds`: runId dirs considered in-flight (missing summary or
 *   trace recently modified).
 * - `worktreeCount`: sum of worktree entries across all open runId dirs.
 * - `oldestRunAgeDays`: age in days of the oldest runId dir (any state),
 *   null when the dispatch directory is absent or empty.
 */
export async function readDispatchTreeSnapshot(repoRoot: string): Promise<DispatchTreeSnapshot> {
  const dispDir = dispatchRoot(repoRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dispDir);
  } catch {
    return { openRunIds: [], worktreeCount: 0, oldestRunAgeDays: null };
  }

  const nowMs = Date.now();
  const openRunIds: string[] = [];
  let worktreeCount = 0;
  let oldestAgeDays: number | null = null;

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
    if (oldestAgeDays === null || ageDays > oldestAgeDays) {
      oldestAgeDays = ageDays;
    }

    const open = await isOpenRun(runDir, nowMs);
    if (open) {
      openRunIds.push(name);
      worktreeCount += countWorktreesInLog(runDir);
    }
  }

  return { openRunIds, worktreeCount, oldestRunAgeDays: oldestAgeDays };
}
