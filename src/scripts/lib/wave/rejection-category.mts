// src/scripts/lib/wave/rejection-category.mts
// SLICE-182 (FEAT-276 AC-5): pure categorization of WaveRejection.reason
// strings into an operator-legible bucket, so telemetry sinks (index.json,
// plan_built event, loop snapshot) can report "N rejected: N conflict, N
// missing-confidence" instead of dumping raw reason strings. This reads the
// reason conventions packWave()/applyPreFlightDrops() already emit
// (planner.mts) -- it infers structure from those strings and does not
// change packing behavior.
//
// Known gap (FEAT-278, explicitly out of scope for this slice): packWave's
// capacity cutoff (`if (picked.length >= opts.waveSize) break;`) drops
// remaining ranked candidates without adding them to either `items` or
// `rejected`, so `picked.length + rejected.length` can undercount the full
// ranked candidate list. Counts here are only ever as complete as
// `plan.rejected` -- callers must not treat a breakdown total as "all
// candidates not packed".

import type { WaveRejection } from "./types.mjs";

export type RejectionCategory = "conflict" | "missing_confidence" | "other";

/**
 * Categorize a single WaveRejection.reason string. `conflict_with_<path>`
 * (packWave path-conflict rejections) -> "conflict"; the literal
 * `missing_touches_files_solo_only` (packWave missing-confidence
 * deferral) -> "missing_confidence"; anything else -- currently the
 * `pre-flight: ...` reasons from applyPreFlightDrops() -- -> "other".
 */
export function categorizeRejectionReason(reason: string): RejectionCategory {
  if (reason.startsWith("conflict_with_")) return "conflict";
  if (reason === "missing_touches_files_solo_only") return "missing_confidence";
  return "other";
}

export type RejectionBreakdown = {
  conflict: number;
  missingConfidence: number;
  other: number;
};

/** Aggregate a WavePlan's rejected list by category for telemetry sinks. */
export function summarizeRejections(rejected: readonly WaveRejection[]): RejectionBreakdown {
  const breakdown: RejectionBreakdown = { conflict: 0, missingConfidence: 0, other: 0 };
  for (const r of rejected) {
    const category = categorizeRejectionReason(r.reason);
    if (category === "conflict") breakdown.conflict++;
    else if (category === "missing_confidence") breakdown.missingConfidence++;
    else breakdown.other++;
  }
  return breakdown;
}
