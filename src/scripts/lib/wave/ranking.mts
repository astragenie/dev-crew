import type { SliceCandidate, SlicePriority } from "./types.mjs";

const PRIORITY_RANK: Record<SlicePriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3
};

/**
 * Rank slice candidates for wave execution.
 *
 * Ordering:
 *   1. pendingFix items first (failed slices being retried)
 *   2. compositeScore DESC (higher is better)
 *   3. priority by rank (P0 > P1 > P2 > P3)
 *   4. strategicFit DESC (higher is better)
 *   5. retryCount ASC (fewer retries is better)
 *
 * @param input Slice candidates to rank
 * @returns Ranked copy of input
 */
export function rankCandidates(input: SliceCandidate[]): SliceCandidate[] {
  return [...input].sort((a, b) => {
    // 1. pendingFix first
    if (a.pendingFix !== b.pendingFix) return a.pendingFix ? -1 : 1;

    // 2. compositeScore DESC
    if (a.compositeScore !== b.compositeScore) return b.compositeScore - a.compositeScore;

    // 3. priority by rank
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

    // 4. strategicFit DESC
    if (a.strategicFit !== b.strategicFit) return b.strategicFit - a.strategicFit;

    // 5. retryCount ASC
    return a.retryCount - b.retryCount;
  });
}
