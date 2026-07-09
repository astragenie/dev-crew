// watch/claims.mts — claim-write-before-spawn ordering primitive (AC-3).
//
// Full TTL self-heal / steal-on-expiry semantics (COND-1: kill Layer 2
// mid-reaction, verify claim self-heals after TTL) are SLICE-144 scope per
// the contract's Build Sequence. This module is the minimal ordering-correct
// primitive SLICE-143 needs: it writes the timestamped claim entry to the
// repo's tick state file, then sets the GH claim label, and only resolves
// once both have completed — giving callers a real happens-before guarantee
// against real state-module behavior, not just eventual presence.

import type { ClaimEntry, Finding } from "./types.mjs";
import { readTickState, updateTickState } from "./state.mjs";

export const DEFAULT_CLAIM_TTL_SECONDS = 3600;
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
