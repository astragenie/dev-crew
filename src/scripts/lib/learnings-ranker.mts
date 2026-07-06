// Decay-ranked learnings ranker — sorts by composite score with optional query boost.
// FEAT-179 / SLICE-130

import { decayConfidence } from "./learnings-decay.mjs";
import type { LearningEntry } from "./learnings-decay.mjs";

// Re-export LearningEntry for consumers that only import from this module.
export type { LearningEntry };

// Token budget: sum of ceil(text.length / 4) across retained entries must stay ≤ 1000.
const TOKEN_BUDGET = 1000;

// Query boost added to entries whose text contains any query word.
const QUERY_BOOST = 0.1;

// FEAT-220: boost added to entries whose lifecycle status is "validated" or
// "promoted", so they rank above an otherwise-equal "candidate" entry.
// Entries with no status field (legacy rows) get no boost — same as
// "candidate" — which is what keeps AC-1's golden ranking byte-identical.
const STATUS_BOOST = 0.05;

/** True when entry.status is "rejected" — dropped from ranking entirely (AC-3). */
function isRejected(entry: LearningEntry): boolean {
  return entry.status === "rejected";
}

/** True when entry.expires_at is a parseable timestamp at or before nowMs (AC-4). */
function isExpired(entry: LearningEntry, nowMs: number): boolean {
  if (!entry.expires_at) return false;
  const expiresMs = Date.parse(entry.expires_at);
  return !Number.isNaN(expiresMs) && expiresMs <= nowMs;
}

/**
 * Estimate token count for a single learning entry.
 * Approximation: ceil(text.length / 4).
 */
function tokenCost(entry: LearningEntry): number {
  return Math.ceil(entry.text.length / 4);
}

/**
 * Compute the composite ranking score for an entry.
 *
 * score = decayConfidence(entry, nowMs) * (entry.utility_score ?? 1)
 *
 * A query boost of +0.1 is added when any whitespace-split query word
 * appears in the entry text (case-insensitive match).
 */
function compositeScore(entry: LearningEntry, nowMs: number, queryWords: string[]): number {
  const decayed = decayConfidence(entry, nowMs);
  const utility = entry.utility_score ?? 1;
  let score = decayed * utility;

  if (queryWords.length > 0) {
    const lower = entry.text.toLowerCase();
    const hasMatch = queryWords.some((w) => lower.includes(w));
    if (hasMatch) score += QUERY_BOOST;
  }

  if (entry.status === "validated" || entry.status === "promoted") {
    score += STATUS_BOOST;
  }

  return score;
}

/**
 * Rank learning entries by composite decay+utility score, apply a token-budget trim.
 *
 * @param entries  All candidate LearningEntry objects.
 * @param opts.query   Optional query string. Words (whitespace-split) that appear
 *                     in an entry's text grant a +0.1 score boost.
 * @param opts.nowMs   Current time in Unix ms. Defaults to Date.now().
 * @returns Entries sorted descending by score, trimmed so the sum of
 *          ceil(text.length / 4) across retained entries is ≤ 1000.
 */
export function rankLearnings(
  entries: LearningEntry[],
  opts?: { query?: string; nowMs?: number }
): LearningEntry[] {
  if (entries.length === 0) return [];

  const nowMs = opts?.nowMs ?? Date.now();
  const queryWords =
    opts?.query && opts.query.trim()
      ? opts.query
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 0)
      : [];

  // FEAT-220: drop rejected/expired entries before scoring — additive gates
  // that never fire for legacy entries (no status/expires_at field).
  const candidates = entries.filter((e) => !isRejected(e) && !isExpired(e, nowMs));

  // Sort descending by composite score.
  const scored = candidates
    .map((e) => ({ entry: e, score: compositeScore(e, nowMs, queryWords) }))
    .sort((a, b) => b.score - a.score);

  // Apply token budget: accumulate entries until budget exhausted.
  const result: LearningEntry[] = [];
  let usedTokens = 0;
  for (const { entry } of scored) {
    const cost = tokenCost(entry);
    if (usedTokens + cost > TOKEN_BUDGET) break;
    result.push(entry);
    usedTokens += cost;
  }

  return result;
}
