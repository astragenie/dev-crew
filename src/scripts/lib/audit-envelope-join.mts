// audit-envelope-join.mts — Joins audit-log dispatch entries to hook-event pairs
// so that slice.agent_completed envelopes carry real dispatchKind + iterationIndex
// values instead of null/0 defaults.
//
// Algorithm: nearest-preceding-timestamp match scoped by (sliceId, agentType).
// Each audit entry is consumed at most once (LIFO guard via used-index Set).
//
// SLICE-137 / FEAT-204

import { readDispatchLog } from "./cost-by-skill.mjs";

export interface AuditEntryForJoin {
  timestamp: string;
  agent?: string | null;
  sliceId?: string | null;
  dispatchKind?: "auto" | "manual" | "wave" | "hierarchical" | null;
  iterationIndex?: number;
}

export interface PairInput {
  agentType?: string;
  startTs?: string | null;
}

export type EnrichedPair<T extends PairInput> = T & {
  dispatchKind: "auto" | "manual" | "wave" | "hierarchical" | null;
  iterationIndex: number;
};

/**
 * Build a sorted, indexed candidate list from audit entries scoped to sliceId.
 * Each candidate carries its original index so the used-set can reference it.
 */
function buildCandidates(
  entries: AuditEntryForJoin[],
  sliceId: string
): Array<{ e: AuditEntryForJoin; idx: number }> {
  const cands = entries
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e.sliceId === sliceId && typeof e.timestamp === "string");
  cands.sort((a, b) => {
    if (a.e.timestamp < b.e.timestamp) return -1;
    if (a.e.timestamp > b.e.timestamp) return 1;
    return 0;
  });
  return cands;
}

/**
 * Find the latest unconsumed candidate that matches agentType and precedes
 * startTs. Returns `{ e, origIdx }` on match, or null when none found.
 */
function findBestCandidate(
  candidates: Array<{ e: AuditEntryForJoin; idx: number }>,
  agentType: string | null,
  startTs: string,
  used: Set<number>
): { e: AuditEntryForJoin; origIdx: number } | null {
  for (let ci = candidates.length - 1; ci >= 0; ci--) {
    const { e, idx } = candidates[ci]!;
    if (used.has(idx)) continue;
    if (e.agent !== agentType) continue;
    if (e.timestamp > startTs) continue;
    return { e, origIdx: idx };
  }
  return null;
}

/**
 * Join audit-log entries to hook-event pairs, threading dispatchKind and
 * iterationIndex from the nearest-preceding dispatch entry that matches
 * (sliceId, agent === pair.agentType).
 *
 * Match rule:
 *   entry.timestamp <= pair.startTs  (ISO string comparison — lexicographic OK for ISO-8601)
 *   entry.agent === pair.agentType
 *   entry.sliceId === sliceId
 *   Largest qualifying timestamp wins. Consumed entries not re-used (LIFO guard).
 *
 * Pairs with null/missing startTs receive dispatchKind: null, iterationIndex: 0.
 * Audit entries with no sliceId (legacy v1 entries) are excluded from matching.
 *
 * @param pairs      Hook-event pairs from pairAgentEvents().
 * @param entries    Parsed audit log entries (readDispatchLog() output).
 * @param sliceId    The slice whose dispatches we are joining.
 */
export function joinAuditToPairs<T extends PairInput>(
  pairs: T[],
  entries: AuditEntryForJoin[],
  sliceId: string
): Array<EnrichedPair<T>> {
  const candidates = buildCandidates(entries, sliceId);
  const used = new Set<number>();

  return pairs.map((pair) => {
    const startTs = pair.startTs ?? null;
    if (!startTs) {
      return { ...pair, dispatchKind: null, iterationIndex: 0 } as EnrichedPair<T>;
    }
    const agentType = pair.agentType ?? null;
    const match = findBestCandidate(candidates, agentType, startTs, used);
    if (!match) {
      return { ...pair, dispatchKind: null, iterationIndex: 0 } as EnrichedPair<T>;
    }
    used.add(match.origIdx);
    return {
      ...pair,
      dispatchKind: match.e.dispatchKind ?? null,
      iterationIndex: match.e.iterationIndex ?? 0
    } as EnrichedPair<T>;
  });
}

/**
 * Compute the next iterationIndex for a (sliceId, agent) tuple by reading
 * the audit log and returning max(entry.iterationIndex) + 1 across all
 * matching entries. Returns 0 when no match exists (i.e. first dispatch).
 *
 * Malformed entries and missing files return 0 (fail-open).
 *
 * @param auditLogPath  Absolute path to auto-dispatch.jsonl.
 * @param sliceId       Slice scoping key.
 * @param agent         Agent identifier (e.g. "crew:builder").
 */
export async function computeNextIterationIndex(
  auditLogPath: string,
  sliceId: string,
  agent: string
): Promise<number> {
  const entries = await readDispatchLog(auditLogPath);
  let maxIndex = -1;
  for (const entry of entries) {
    if (entry.sliceId !== sliceId) continue;
    if (entry.agent !== agent) continue;
    const idx = typeof entry.iterationIndex === "number" ? entry.iterationIndex : 0;
    if (idx > maxIndex) maxIndex = idx;
  }
  return maxIndex === -1 ? 0 : maxIndex + 1;
}
