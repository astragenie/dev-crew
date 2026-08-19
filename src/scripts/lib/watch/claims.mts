// watch/claims.mts — claim-write-before-spawn ordering (AC-3) + TTL
// self-heal / steal-on-expiry (COND-1, SLICE-144).
//
// SLICE-143 landed the ordering-correct primitive: claimFinding writes the
// timestamped claim entry to the repo's tick state file, then sets the GH
// claim label, resolving only once both have completed. SLICE-144 adds the
// other half of COND-1 — "kill Layer 2 mid-reaction, verify claim self-heals
// after TTL": claimFinding already overwrites unconditionally (a "claim" and
// a "steal" are the same write — there is no compare-and-swap, matching the
// plan's framing that claim labels are an intra-machine/cross-tick
// idempotency signal, not a cross-machine lock), so the missing piece was
// *re-surfacing* a finding whose claim has expired so watch/tick.mts's sweep
// loop considers it again even when the underlying gh-side cursor
// (lastSeenIssue / lastFailedRunIds / lastPrShas) has already moved past it.
// collectExpiredClaims below is that re-surfacing primitive.
//
// TTL default: 30 minutes (1800s). Chosen to comfortably outlast a normal
// headless reaction (intake / pr-fix / devcrew:fix runs are typically single-
// digit minutes) while keeping the orphaned-claim recovery window well
// under the ~5-minute tick cadence's own noise floor multiplied out — a
// crashed reaction is retried within one to a few ticks, not left claimed
// for hours. Per-repo override lives in RegistryEntry.claimTtlSeconds
// (watch/types.mts) for repos whose reactions routinely run longer.

import type { ClaimEntry, Finding, FindingKind, TickState } from "./types.mjs";
import { readTickState, updateTickState } from "./state.mjs";

export const DEFAULT_CLAIM_TTL_SECONDS = 1800;
export const DEFAULT_CLAIM_LABEL = "loop-claimed";

export function isClaimActive(claim: ClaimEntry | undefined, now: Date = new Date()): boolean {
  if (!claim) return false;
  const claimedAtMs = new Date(claim.claimedAt).getTime();
  if (Number.isNaN(claimedAtMs)) return false;
  return now.getTime() - claimedAtMs < claim.ttlSeconds * 1000;
}

export interface ClaimFindingOptions {
  watchHome: string;
  ghSlug: string;
  finding: Finding;
  addClaimLabel: (ghSlug: string, finding: Finding) => Promise<void>;
  ttlSeconds?: number;
  label?: string;
  now?: () => Date;
}

export async function claimFinding(opts: ClaimFindingOptions): Promise<ClaimEntry> {
  const ttlSeconds = opts.ttlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS;
  const label = opts.label ?? DEFAULT_CLAIM_LABEL;
  const claimedAt = (opts.now ? opts.now() : new Date()).toISOString();
  const entry: ClaimEntry = { findingId: opts.finding.findingId, claimedAt, ttlSeconds, label };

  // 1. State write — source of truth, atomic temp+rename via state.mts.
  await updateTickState(opts.watchHome, opts.ghSlug, (current) => ({
    ...current,
    claims: { ...current.claims, [entry.findingId]: entry }
  }));

  // 2. GH claim label — human-visible hint. Runs after the state write so a
  //    label-call failure never leaves an un-recorded claim.
  await opts.addClaimLabel(opts.ghSlug, opts.finding);

  return entry;
}

export async function getActiveClaim(
  watchHome: string,
  ghSlug: string,
  findingId: string,
  now: Date = new Date()
): Promise<ClaimEntry | undefined> {
  const state = await readTickState(watchHome, ghSlug);
  const claim = state.claims[findingId];
  return isClaimActive(claim, now) ? claim : undefined;
}

// ---------------------------------------------------------------------------
// COND-1 self-heal: reconstruct + re-surface findings whose claim has expired
// (orphaned by a killed Layer 2 reaction, or simply never followed up) so
// the sweep loop can steal + re-spawn them even though the gh-side cursor
// (lastSeenIssue / lastFailedRunIds / lastPrShas) no longer treats them as
// "new".

const FINDING_KIND_PREFIXES: Record<string, FindingKind> = {
  issue: "issue",
  run: "failed-run",
  pr: "red-pr"
};

/**
 * Reconstruct a Finding from a claim's findingId (e.g. "issue:123",
 * "run:987", "pr:45" — the same `${kind-prefix}:${number}` shape every
 * detectXFindings function in watch/sweep.mts produces). Falls back to
 * "issue" for an unrecognized prefix rather than throwing — a claim entry
 * surviving on disk from a future/renamed finding kind should still be
 * stealable, not silently dropped from self-heal.
 */
export function findingFromClaimId(findingId: string, ghSlug: string): Finding {
  const prefix = findingId.split(":", 1)[0] ?? "";
  const kind = FINDING_KIND_PREFIXES[prefix] ?? "issue";
  return { kind, findingId, ghSlug };
}

/**
 * Every claim in `state.claims` whose TTL has expired, as re-claimable
 * Finding candidates. Active (non-expired) claims are excluded — they are
 * still owned by an in-flight (or at least not-yet-orphaned) reaction, so
 * re-surfacing them would spawn a duplicate reaction against live work.
 */
export function collectExpiredClaims(
  state: TickState,
  ghSlug: string,
  now: Date = new Date()
): Finding[] {
  return Object.values(state.claims)
    .filter((claim) => !isClaimActive(claim, now))
    .map((claim) => findingFromClaimId(claim.findingId, ghSlug));
}
