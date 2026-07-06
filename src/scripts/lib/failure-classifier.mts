// failure-classifier.mts — FEAT-221 Part A: clusters recent failure signal
// from the stores that actually carry it, into ranked FailureCluster[].
//
// Read-only over four sources:
//   - grades/*.md         (via grade-parser/lessons-feed) — PRIMARY lesson
//     corpus. Only grades whose `verdict` is present and not a pass-like
//     value count as failure signal; today's corpus has zero such grades
//     (verdict is either absent or one of approved/approved_with_notes/pass),
//     so this source legitimately contributes 0 signals until reviewers
//     start recording non-pass verdicts — see AC-5.
//   - pause-events.jsonl   (dispatch_outcome rows, outcome:"paused")
//   - auto-dispatch.jsonl  (rows with ok:false)
//   - learnings.jsonl      (entries carrying FEAT-220's failure_class field,
//     or best-effort inferred from key/source for legacy rows)
//
// `failure_class` is the only real discriminator (see FEAT-221 spec — `kind`
// is NOT a storage field anywhere and must never be keyed on: pause-events.jsonl
// happens to have an unrelated `kind` field of its own, pause/resume/pickup,
// which is not a failure classification).

import { listGrades } from "./grade-parser.mjs";
import { parseListSection } from "./lessons-feed.mjs";
import { listPauseTelemetry, type DispatchOutcomeRecord } from "./pause-telemetry.mjs";
import { resolveAuditLogPath } from "./auto-dispatch.mjs";
import { listAllLearnings, FAILURE_CLASSES, type FailureClass } from "./learnings.mjs";
import fs from "node:fs/promises";

export type { FailureClass };

export interface FailureSignal {
  id: string;
  ts: string;
  failureClass: FailureClass;
  rootCause: string;
  recommendedFix: string;
  source: "grade" | "pause_event" | "auto_dispatch" | "learning";
}

export interface FailureCluster {
  failure_class: FailureClass;
  count: number;
  exemplar_ids: string[];
  first_seen: string;
  last_seen: string;
  representative_root_cause: string;
  representative_fix: string;
}

export interface ClassifyOptions {
  /** ISO date/time lower bound. Takes precedence over sinceDays. */
  since?: string | null;
  /** Rolling window size in days, applied when `since` is absent. Default 14. */
  sinceDays?: number | null;
  config?: Record<string, unknown> | null;
  /** Injectable "now" for deterministic ranking in tests. */
  nowMs?: number;
  /** Cap on exemplar_ids per cluster (readability, not a signal cap). Default 5. */
  exemplarLimit?: number;
}

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_EXEMPLAR_LIMIT = 5;
const PASS_VERDICTS = new Set(["pass", "approved", "approved_with_notes"]);

// Key prefix the mining job (failure-mining.mts) writes its own candidate
// lessons under. Signals derived from those rows must be excluded here —
// otherwise a mined lesson becomes next run's failure signal, and repeated
// `mine-failures` invocations inflate cluster counts indefinitely instead of
// converging on the underlying raw-store signal.
export const MINED_LESSON_KEY_PREFIX = "mined:";

export function resolveSinceMs(opts: ClassifyOptions, nowMs: number): number {
  if (opts.since) {
    const parsed = Date.parse(opts.since);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const days =
    typeof opts.sinceDays === "number" && opts.sinceDays > 0 ? opts.sinceDays : DEFAULT_WINDOW_DAYS;
  return nowMs - days * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Best-effort failure_class inference — used for any source lacking an
// explicit, trustworthy failure_class value.
// ---------------------------------------------------------------------------

const KEYWORD_RULES: Array<{ failureClass: FailureClass; pattern: RegExp }> = [
  {
    failureClass: "subagent_incomplete",
    pattern: /\b(pause|paused|incomplete|abandoned|mid-sentence)\b/i
  },
  { failureClass: "review_fail", pattern: /\breview.*(fail|reject|change)/i },
  { failureClass: "validation_fail", pattern: /\b(validation|test).*(fail|reject)/i },
  { failureClass: "hallucinated_ref", pattern: /\b(hallucinat|fabricat|invented|non-existent)\b/i },
  {
    failureClass: "bad_tool_use",
    pattern: /\btool(search)?\b.*(misuse|wrong|missing|gap)|wrong tool/i
  },
  { failureClass: "ignored_policy", pattern: /\b(polic|refus|disabled|ignored)\b/i },
  { failureClass: "bad_patch", pattern: /\b(patch|diff|merge conflict|bad edit)\b/i },
  { failureClass: "stale_context", pattern: /\b(stale|outdated|drift)\b/i }
];

export function inferFailureClass(text: string): FailureClass {
  if (!text) return "other";
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(text)) return rule.failureClass;
  }
  return "other";
}

/** Lowercase, collapse whitespace, truncate — used for grouping + dedup hashing. */
export function normalizeRootCause(text: string | null | undefined): string {
  if (!text) return "";
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 160);
}

function isValidFailureClass(value: unknown): value is FailureClass {
  return typeof value === "string" && (FAILURE_CLASSES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Per-source collectors
// ---------------------------------------------------------------------------

async function collectGradeSignals(
  repoPath: string,
  config: Record<string, unknown> | null | undefined,
  sinceMs: number
): Promise<FailureSignal[]> {
  const grades = await listGrades(repoPath, { config });
  const signals: FailureSignal[] = [];
  for (const grade of grades) {
    const verdict = String(grade.frontmatter?.verdict ?? "")
      .trim()
      .toLowerCase();
    if (!verdict || PASS_VERDICTS.has(verdict)) continue;
    const ts = grade.frontmatter?.graded_at ?? grade.frontmatter?.date ?? null;
    const tsMs = ts ? Date.parse(ts) : Number.NaN;
    if (!Number.isNaN(tsMs) && tsMs < sinceMs) continue;
    const surprises = parseListSection(grade.body, "Surprises");
    const followups = parseListSection(grade.body, "Followups");
    const text = [...surprises, ...followups].join(" ");
    signals.push({
      id: grade.frontmatter?.slice ?? grade.filePath,
      ts: ts ?? new Date(0).toISOString(),
      failureClass: inferFailureClass(text),
      rootCause: followups[0] ?? surprises[0] ?? verdict,
      recommendedFix: "",
      source: "grade"
    });
  }
  return signals;
}

async function collectPauseSignals(repoPath: string, sinceMs: number): Promise<FailureSignal[]> {
  const records = await listPauseTelemetry(repoPath);
  const notesBySlice = new Map<string, string>();
  for (const r of records) {
    if (r.type === "pause_event" && r.kind === "pause" && r.sliceId && r.notes) {
      notesBySlice.set(r.sliceId, r.notes);
    }
  }
  const paused = records.filter(
    (r): r is DispatchOutcomeRecord => r.type === "dispatch_outcome" && r.outcome === "paused"
  );
  const signals: FailureSignal[] = [];
  for (const r of paused) {
    const tsMs = Date.parse(r.ts);
    if (!Number.isNaN(tsMs) && tsMs < sinceMs) continue;
    const rootCause =
      (r.sliceId && notesBySlice.get(r.sliceId)) || `${r.agentRole} paused mid-dispatch`;
    signals.push({
      id: r.sliceId ? `${r.sliceId}@${r.ts}` : `${r.agentRole}@${r.ts}`,
      ts: r.ts,
      failureClass: "subagent_incomplete",
      rootCause,
      recommendedFix: "",
      source: "pause_event"
    });
  }
  return signals;
}

async function readDispatchAuditLog(
  repoPath: string,
  config: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown>[]> {
  const logPath = resolveAuditLogPath(repoPath, { config: config as never });
  let raw: string;
  try {
    raw = await fs.readFile(logPath, "utf8");
  } catch {
    return [];
  }
  const entries: Record<string, unknown>[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") entries.push(parsed);
    } catch {
      // skip malformed line
    }
  }
  return entries;
}

async function collectDispatchSignals(
  repoPath: string,
  config: Record<string, unknown> | null | undefined,
  sinceMs: number
): Promise<FailureSignal[]> {
  const entries = await readDispatchAuditLog(repoPath, config);
  const signals: FailureSignal[] = [];
  for (const e of entries) {
    if (e.ok !== false) continue;
    const ts = typeof e.timestamp === "string" ? e.timestamp : new Date(0).toISOString();
    const tsMs = Date.parse(ts);
    if (!Number.isNaN(tsMs) && tsMs < sinceMs) continue;
    const skipReason = typeof e.skipReason === "string" ? e.skipReason : "";
    const rootCause = skipReason || (typeof e.error === "string" ? e.error : "dispatch failed");
    signals.push({
      id: `${e.agent ?? "unknown"}@${ts}`,
      ts,
      failureClass: inferFailureClass(rootCause),
      rootCause,
      recommendedFix: "",
      source: "auto_dispatch"
    });
  }
  return signals;
}

async function collectLearningSignals(repoPath: string, sinceMs: number): Promise<FailureSignal[]> {
  const entries = await listAllLearnings(repoPath);
  const signals: FailureSignal[] = [];
  for (const e of entries) {
    if (typeof e.key === "string" && e.key.startsWith(MINED_LESSON_KEY_PREFIX)) continue;
    const ts = typeof e.timestamp === "string" ? e.timestamp : new Date(0).toISOString();
    const tsMs = Date.parse(ts);
    if (!Number.isNaN(tsMs) && tsMs < sinceMs) continue;
    const failureClass = isValidFailureClass(e.failure_class)
      ? e.failure_class
      : inferFailureClass(`${e.key ?? ""} ${e.source ?? ""}`);
    signals.push({
      id: `learning-${e.id}`,
      ts,
      failureClass,
      rootCause: e.root_cause ?? e.insight ?? e.key ?? "",
      recommendedFix: e.recommended_fix ?? "",
      source: "learning"
    });
  }
  return signals;
}

export async function collectFailureSignals(
  repoPath: string,
  opts: ClassifyOptions = {}
): Promise<FailureSignal[]> {
  const nowMs = opts.nowMs ?? Date.now();
  const sinceMs = resolveSinceMs(opts, nowMs);
  const [grades, pauses, dispatches, learnings] = await Promise.all([
    collectGradeSignals(repoPath, opts.config, sinceMs),
    collectPauseSignals(repoPath, sinceMs),
    collectDispatchSignals(repoPath, opts.config, sinceMs),
    collectLearningSignals(repoPath, sinceMs)
  ]);
  return [...grades, ...pauses, ...dispatches, ...learnings];
}

// ---------------------------------------------------------------------------
// Clustering + ranking
// ---------------------------------------------------------------------------

function pickRepresentative(signals: FailureSignal[]): { rootCause: string; fix: string } {
  const counts = new Map<string, number>();
  for (const s of signals) {
    const key = normalizeRootCause(s.rootCause);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey = "";
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  const match = signals.find((s) => normalizeRootCause(s.rootCause) === bestKey);
  const fix = signals.find((s) => s.recommendedFix)?.recommendedFix ?? "";
  return { rootCause: match?.rootCause ?? "", fix };
}

export function clusterFailures(
  signals: FailureSignal[],
  exemplarLimit = DEFAULT_EXEMPLAR_LIMIT
): FailureCluster[] {
  const byClass = new Map<FailureClass, FailureSignal[]>();
  for (const s of signals) {
    const bucket = byClass.get(s.failureClass);
    if (bucket) bucket.push(s);
    else byClass.set(s.failureClass, [s]);
  }

  const clusters: FailureCluster[] = [];
  for (const [failureClass, group] of byClass) {
    const sorted = [...group].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const { rootCause, fix } = pickRepresentative(group);
    clusters.push({
      failure_class: failureClass,
      count: group.length,
      exemplar_ids: sorted.slice(0, exemplarLimit).map((s) => s.id),
      first_seen: sorted[0]!.ts,
      last_seen: sorted[sorted.length - 1]!.ts,
      representative_root_cause: rootCause,
      representative_fix: fix
    });
  }
  return clusters;
}

/** Frequency-first, recency-tiebreak, deterministic tie-break by class name (AC-2). */
export function rankClusters(
  clusters: FailureCluster[],
  nowMs: number = Date.now()
): FailureCluster[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const score = (c: FailureCluster): number => {
    const ageDays = Math.max(0, (nowMs - Date.parse(c.last_seen)) / dayMs);
    const recencyBonus = 1 / (1 + ageDays);
    return c.count + recencyBonus;
  };
  return [...clusters].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.failure_class.localeCompare(b.failure_class);
  });
}

export async function classifyFailures(
  repoPath: string,
  opts: ClassifyOptions = {}
): Promise<FailureCluster[]> {
  const nowMs = opts.nowMs ?? Date.now();
  const signals = await collectFailureSignals(repoPath, opts);
  const clusters = clusterFailures(signals, opts.exemplarLimit ?? DEFAULT_EXEMPLAR_LIMIT);
  return rankClusters(clusters, nowMs);
}
