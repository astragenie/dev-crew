// Decay-ranked learnings — confidence decay function.
// FEAT-179 / SLICE-130

/**
 * A learning entry as stored in .claude/artifacts/loop/learnings.jsonl.
 * This type is a superset of the operational learnings store shape —
 * existing entries that lack optional fields are handled gracefully.
 */
export interface LearningEntry {
  id: string;
  text: string;
  sliceId: string;
  createdAt: number; // Unix ms
  confidence?: number; // 0–1; undefined treated as 1.0
  utility_score?: number; // cumulative pass/fail tracker
  last_cited_at?: number; // Unix ms of last retrieval
  // FEAT-220: lifecycle gating fields, mirrored from the write-shape
  // (learnings.mts) via memory-context.mts::toLearningEntry. Absent on
  // legacy entries — treated as "candidate" / never-expiring by the ranker.
  status?: "candidate" | "validated" | "promoted" | "rejected";
  expires_at?: string; // ISO timestamp; hard-expires the entry when past
}

/**
 * Half-life decay constant: k = ln(2) / 10 weeks.
 * At exactly 10 weeks, confidence decays to 50% of initial value.
 */
const K = Math.LN2 / 10;

/**
 * Compute the decayed confidence for a learning entry.
 *
 * Formula: entry.confidence * exp(-k * weeks)
 * where weeks = (nowMs - entry.createdAt) / (7 * 24 * 3600 * 1000).
 *
 * When entry.confidence is undefined, it is treated as 1.0.
 * When entry.createdAt > nowMs (future timestamp), weeks is negative,
 * which produces a result > initial confidence — callers may clamp if desired.
 *
 * @param entry  A LearningEntry from the learnings store.
 * @param nowMs  Current time in Unix milliseconds.
 * @returns      Decayed confidence value in [0, initial_confidence].
 */
export function decayConfidence(entry: LearningEntry, nowMs: number): number {
  const initial = entry.confidence ?? 1.0;
  const msPerWeek = 7 * 24 * 3600 * 1000;
  const weeks = (nowMs - entry.createdAt) / msPerWeek;
  return initial * Math.exp(-K * weeks);
}
