// cost-by-skill.mts — Aggregates auto-dispatch.jsonl spend by agent/skill name.
//
// FEAT-165 / SLICE-115: bucket dispatch log entries by `agent` field and
// surface a ranked report with 4-week avg and week-over-week delta.
//
// The field in auto-dispatch.jsonl is `agent` (e.g. "loop:researcher",
// "crew:document-writer"). This module treats `agent` as the "skill name"
// for cost attribution purposes, since no separate `skill_name` field exists
// in the log schema.

import fs from "node:fs/promises";
import path from "node:path";

export const DISPATCH_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";
const CURRENT_WEEK_DAYS = 7;
const AVG_WINDOW_DAYS = 28; // 4 weeks

/** A parsed entry from auto-dispatch.jsonl. */
export interface DispatchEntry {
  timestamp: string;
  /** Agent/skill identifier, e.g. "loop:researcher". May be absent in malformed lines. */
  agent?: string | null;
  costUsd?: number | null;
  durationMs?: number;
  ok?: boolean;
  skipped?: boolean;
  /** Slice ID this dispatch was associated with. Added in SLICE-137. */
  sliceId?: string | null;
  /** Dispatch kind classification. Added in SLICE-137. */
  dispatchKind?: "auto" | "manual" | "wave" | "hierarchical" | null;
  /** Retry iteration index (0 = first attempt). Added in SLICE-137. */
  iterationIndex?: number;
}

/** Aggregated cost row for a single skill/agent. */
export interface SkillCostRow {
  /** Skill name (agent field value, or "(unknown)" for missing/null entries). */
  skillName: string;
  /** Total spend in the most recent 7-day window. */
  currentWeekUsd: number;
  /** Average weekly spend over the last 28 days (4-week average). */
  fourWeekAvgUsd: number;
  /**
   * Week-over-week delta as a percentage relative to the 4-week avg.
   * null when fourWeekAvgUsd === 0.
   */
  deltaPercent: number | null;
  /** Total entries in the 28-day window (includes skipped / zero-cost). */
  entryCount: number;
}

const DISPATCH_KIND_SET = new Set<string>(["auto", "manual", "wave", "hierarchical"]);

/** Parse a single JSON object into a DispatchEntry. Extracted to keep readDispatchLog simple. */
function parseEntry(obj: Record<string, unknown>): DispatchEntry {
  const rawKind = obj.dispatchKind;
  const costRaw = obj.costUsd;
  return {
    timestamp: typeof obj.timestamp === "string" ? obj.timestamp : new Date(0).toISOString(),
    agent: typeof obj.agent === "string" ? obj.agent : null,
    costUsd: typeof costRaw === "number" && Number.isFinite(costRaw) ? costRaw : null,
    durationMs: typeof obj.durationMs === "number" ? obj.durationMs : 0,
    ok: typeof obj.ok === "boolean" ? obj.ok : true,
    skipped: typeof obj.skipped === "boolean" ? obj.skipped : false,
    sliceId: typeof obj.sliceId === "string" ? obj.sliceId : null,
    dispatchKind:
      typeof rawKind === "string" && DISPATCH_KIND_SET.has(rawKind)
        ? (rawKind as "auto" | "manual" | "wave" | "hierarchical")
        : null,
    iterationIndex: typeof obj.iterationIndex === "number" ? obj.iterationIndex : 0
  };
}

/**
 * Read and parse auto-dispatch.jsonl, returning all parseable entries.
 * Lines that are not valid JSON or contain no `agent` field are still
 * returned but will have `agent: null`; callers handle them gracefully.
 * Never throws — on I/O error returns an empty array.
 */
export async function readDispatchLog(logPath: string): Promise<DispatchEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const results: DispatchEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(parseEntry(JSON.parse(trimmed) as Record<string, unknown>));
    } catch {
      // Malformed line: skip silently (AC-3)
    }
  }
  return results;
}

/**
 * Bucket entries by skill name and compute per-skill cost aggregates.
 *
 * @param entries - Parsed dispatch log entries.
 * @param windowDays - Total window in days (default 28 = 4 weeks). The
 *   current-week bucket always uses the most recent 7 days regardless of
 *   this value; fourWeekAvgUsd is totalWindowSpend / (windowDays / 7).
 * @param now - Reference timestamp for window calculations (default: Date.now()).
 *   Pass in tests for determinism.
 */
export function aggregateBySkill(
  entries: DispatchEntry[],
  windowDays: number = AVG_WINDOW_DAYS,
  now: number = Date.now()
): SkillCostRow[] {
  const weeksInWindow = windowDays / CURRENT_WEEK_DAYS;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const currentWeekMs = CURRENT_WEEK_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;
  const currentWeekCutoff = now - currentWeekMs;

  // Bucket by skill name within the full window
  const perSkill = new Map<string, { windowTotal: number; currentWeek: number; count: number }>();

  for (const entry of entries) {
    const ts = Date.parse(entry.timestamp);
    if (Number.isNaN(ts) || ts < cutoff) continue;

    const skillName = entry.agent != null && entry.agent.length > 0 ? entry.agent : "(unknown)";
    const cost = entry.costUsd ?? 0;

    let bucket = perSkill.get(skillName);
    if (!bucket) {
      bucket = { windowTotal: 0, currentWeek: 0, count: 0 };
      perSkill.set(skillName, bucket);
    }
    bucket.windowTotal += cost;
    bucket.count += 1;
    if (ts >= currentWeekCutoff) {
      bucket.currentWeek += cost;
    }
  }

  const rows: SkillCostRow[] = [];
  for (const [skillName, bucket] of perSkill) {
    const fourWeekAvgUsd = weeksInWindow > 0 ? bucket.windowTotal / weeksInWindow : 0;
    const currentWeekUsd = bucket.currentWeek;
    const deltaPercent = computeDeltaPercent(currentWeekUsd, fourWeekAvgUsd);
    rows.push({
      skillName,
      currentWeekUsd,
      fourWeekAvgUsd,
      deltaPercent,
      entryCount: bucket.count
    });
  }

  // Sort by current-week spend descending, then by 4-week avg descending
  rows.sort((a, b) => {
    const diff = b.currentWeekUsd - a.currentWeekUsd;
    if (diff !== 0) return diff;
    return b.fourWeekAvgUsd - a.fourWeekAvgUsd;
  });

  return rows;
}

/**
 * Compute week-over-week delta percent.
 * Returns null when baseline is zero (division undefined).
 * Pure function; no I/O.
 */
export function computeDeltaPercent(currentWeek: number, baseline: number): number | null {
  if (baseline === 0) return null;
  return ((currentWeek - baseline) / baseline) * 100;
}

/**
 * Format the cost-by-skill report as a human-readable string.
 *
 * @param rows - Pre-sorted SkillCostRow array from aggregateBySkill.
 * @param topN - Max rows to include (default: all).
 */
export function formatCostBySkillReport(rows: SkillCostRow[], topN?: number): string {
  if (rows.length === 0) {
    return "No dispatch log entries found in the last 4 weeks.";
  }

  const displayRows = topN != null && topN > 0 ? rows.slice(0, topN) : rows;
  const lines: string[] = ["Cost by skill (last 4 weeks / week-over-week delta):"];

  for (const row of displayRows) {
    const avg = row.fourWeekAvgUsd.toFixed(4);
    const current = row.currentWeekUsd.toFixed(4);
    let deltaStr: string;
    if (row.deltaPercent === null) {
      deltaStr = "n/a (no baseline)";
    } else {
      const sign = row.deltaPercent >= 0 ? "+" : "";
      deltaStr = `${sign}${row.deltaPercent.toFixed(1)}% vs 4-week avg`;
    }
    lines.push(
      `  ${row.skillName}: spent $${current} last week, ${deltaStr} (4-week avg $${avg}, ${row.entryCount} dispatch(es))`
    );
  }

  return lines.join("\n");
}

/**
 * High-level entry point: read the dispatch log and return a formatted report.
 * Fail-open: returns a "no data" message on missing file or empty log.
 */
export async function buildCostBySkillReport(
  repoPath: string,
  opts: { topN?: number; windowDays?: number; now?: number } = {}
): Promise<string> {
  const logPath = path.join(repoPath, DISPATCH_LOG_REL);
  const entries = await readDispatchLog(logPath);
  const rows = aggregateBySkill(
    entries,
    opts.windowDays ?? AVG_WINDOW_DAYS,
    opts.now ?? Date.now()
  );
  return formatCostBySkillReport(rows, opts.topN);
}
