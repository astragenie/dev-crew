// PR-merged emitter (FEAT-494 unblock — DORA change-fail-rate / lead-time signal).
//
// Fans out a `pr.merged` envelope when pr-watch detects a PR has transitioned
// to MERGED. No JSONL on disk — the GitHub PR IS the durable record. We only
// emit the webhook envelope so astrarunner can react in real time.
//
// Fail-silent: any fanout failure is swallowed by `fanoutEnvelope`. Caller is
// the "pr-watch" CLI handler in loop.mts, at the point runPrWatch resolves
// with outcome "pr-merged" (single detection per call — see pr-watch.mts).

import { fanoutEnvelope } from "./webhook-fanout.mjs";

/** Input for `emitPrMerged`. */
export interface PrMergedInput {
  /** PR URL, e.g. "https://github.com/o/r/pull/123". */
  prUrl: string;
  /** PR number, when resolvable from `gh pr view`. */
  prNumber?: number | null;
  /** ISO-8601 merge timestamp, when resolvable from `gh pr view`. */
  mergedAt: string;
  /** Linked slice, when pr-watch is invoked with slice context. */
  sliceId?: string | null;
  /** Linked feature, when pr-watch is invoked with feature context. */
  featId?: string | null;
}

/** Merge-detection result fields consumed by `buildPrMergedInput`. */
export interface PrMergeResultLike {
  mergedAt: string | null;
  prNumber: number | null;
}

/** Optional CLI flag context consumed by `buildPrMergedInput`. */
export interface PrWatchFlagsLike {
  sliceId?: string | null;
  featId?: string | null;
}

/**
 * Pure mapping from a `runPrWatch` "pr-merged" result + CLI flags to the
 * `emitPrMerged` input. Extracted out of the "pr-watch" CLI handler in
 * loop.mts so the flags -> payload wiring is unit-testable without spawning
 * a `gh` subprocess (see pr-watch-flags.test.mts).
 */
export function buildPrMergedInput(
  prUrl: string,
  result: PrMergeResultLike,
  flags: PrWatchFlagsLike
): PrMergedInput {
  return {
    prUrl,
    prNumber: result.prNumber,
    mergedAt: result.mergedAt ?? new Date().toISOString(),
    sliceId: flags.sliceId ?? null,
    featId: flags.featId ?? null
  };
}

/**
 * Emit a `pr.merged` envelope. Best-effort — `fanoutEnvelope` already
 * swallows network errors and gracefully skips when no webhook is configured.
 */
export async function emitPrMerged(repoPath: string, input: PrMergedInput): Promise<void> {
  const payload: Record<string, unknown> = {
    prUrl: input.prUrl,
    mergedAt: input.mergedAt
  };
  if (input.prNumber !== undefined) payload.prNumber = input.prNumber;
  if (input.sliceId !== undefined) payload.sliceId = input.sliceId;
  if (input.featId !== undefined) payload.featId = input.featId;
  await fanoutEnvelope(repoPath, "pr.merged", payload);
}
