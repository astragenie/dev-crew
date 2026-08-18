// watch/ledger.mts — machine-wide (COND-4) durable ledger of in-flight
// Layer 2 reactions + a rolling cost-spent window.
//
// Single file (<watchHome>/ledger.json), not per-repo, because the
// concurrency cap and cost ceiling are fleet-wide per machine, not
// per-repo (contract §"Cross-machine safety" / design doc COND-4: "a
// correlated failure across many repos must not spawn unbounded parallel
// headless sessions" — a shard's repos can trip the SAME machine-wide cap).
// Reuses the same atomic-RMW-with-lock primitive as tick.json /
// reaction.json (watch/state.mts::updateStateAtomic) so ledger writes never
// corrupt or lose updates under concurrent same-process access.
//
// A reaction is "in-flight" from the moment Layer 1 spawns it
// (recordReactionStart, called by watch/sweep.mts right after
// exec.spawnReaction resolves) until Layer 2 reports an outcome
// (recordReactionFinish, folded into watch/tick.mts::recordReactionOutcome)
// removes it. A crashed Layer 2 process that never reports an outcome would
// otherwise permanently occupy a concurrency slot — entries older than
// MAX_REACTION_RUNTIME_SECONDS are treated as stale and excluded from the
// live count (mirrors claims.mts's TTL self-heal for the same "process died
// without cleaning up after itself" shape).

import path from "node:path";

import type { Finding } from "./types.mjs";
import { readJsonOrDefault, updateStateAtomic } from "./state.mjs";

// Generous outlier bound over pr-fix/intake/crew:fix's typical single-digit-
// minute runtime — matches claims.mts's DEFAULT_CLAIM_TTL_SECONDS reasoning.
export const MAX_REACTION_RUNTIME_SECONDS = 1800;

// Design doc COND-4: "N $/hour ceiling" — a 1-hour rolling window.
export const DEFAULT_COST_WINDOW_SECONDS = 3600;

// Retention for cost-entry pruning at write time — a generous multiple of
// the default window so ledger.json doesn't grow unbounded on a
// long-running machine, without affecting any window-scoped read (nothing
// reads a window wider than this).
const LEDGER_COST_RETENTION_SECONDS = 24 * 3600;

export interface LedgerInFlightEntry {
  ghSlug: string;
  findingId: string;
  startedAt: string; // ISO
}

export interface LedgerCostEntry {
  ghSlug: string;
  findingId: string;
  costUsd: number;
  at: string; // ISO
}

export interface Ledger {
  // keyed by `${ghSlug}::${findingId}` — findingId alone (e.g. "issue:123")
  // is only unique per-repo, not machine-wide.
  inFlight: Record<string, LedgerInFlightEntry>;
  costEntries: LedgerCostEntry[];
}

const DEFAULT_LEDGER: Ledger = { inFlight: {}, costEntries: [] };

export function ledgerPath(watchHome: string): string {
  return path.join(watchHome, "ledger.json");
}

function ledgerKey(ghSlug: string, findingId: string): string {
  return `${ghSlug}::${findingId}`;
}

function isStale(startedAtIso: string, now: Date, maxAgeSeconds: number): boolean {
  const startedAtMs = new Date(startedAtIso).getTime();
  if (Number.isNaN(startedAtMs)) return true;
  return now.getTime() - startedAtMs >= maxAgeSeconds * 1000;
}

function pruneStaleInFlight(
  inFlight: Record<string, LedgerInFlightEntry>,
  now: Date
): Record<string, LedgerInFlightEntry> {
  const kept: Record<string, LedgerInFlightEntry> = {};
  for (const [key, entry] of Object.entries(inFlight)) {
    if (!isStale(entry.startedAt, now, MAX_REACTION_RUNTIME_SECONDS)) kept[key] = entry;
  }
  return kept;
}

function pruneOldCostEntries(entries: LedgerCostEntry[], now: Date): LedgerCostEntry[] {
  const cutoffMs = now.getTime() - LEDGER_COST_RETENTION_SECONDS * 1000;
  return entries.filter((entry) => new Date(entry.at).getTime() >= cutoffMs);
}

/**
 * AC-4 (concurrency-cap path): record a just-spawned reaction as in-flight,
 * machine-wide. Called by watch/sweep.mts immediately after
 * exec.spawnReaction resolves — mirrors the claim-before-spawn ordering
 * (AC-3) by recording state as soon as the fact it describes becomes true.
 * Also opportunistically prunes stale in-flight entries so a crashed
 * reaction from a prior tick doesn't linger in the file forever.
 */
export async function recordReactionStart(
  watchHome: string,
  finding: Finding,
  now: () => Date = () => new Date()
): Promise<void> {
  const key = ledgerKey(finding.ghSlug, finding.findingId);
  const nowDate = now();
  await updateStateAtomic(ledgerPath(watchHome), DEFAULT_LEDGER, (current) => ({
    ...current,
    inFlight: {
      ...pruneStaleInFlight(current.inFlight, nowDate),
      [key]: {
        ghSlug: finding.ghSlug,
        findingId: finding.findingId,
        startedAt: nowDate.toISOString()
      }
    }
  }));
}

/**
 * Reaction outcome reported — clears the in-flight slot (a no-op if it was
 * never recorded, e.g. a reaction that was itself skipped before ever
 * running) and appends a timestamped cost entry consumed by the rolling
 * cost-ceiling window.
 */
export async function recordReactionFinish(
  watchHome: string,
  finding: Finding,
  costUsd: number,
  now: () => Date = () => new Date()
): Promise<void> {
  const key = ledgerKey(finding.ghSlug, finding.findingId);
  const nowDate = now();
  await updateStateAtomic(ledgerPath(watchHome), DEFAULT_LEDGER, (current) => {
    const inFlight = pruneStaleInFlight(current.inFlight, nowDate);
    delete inFlight[key];
    return {
      inFlight,
      costEntries: [
        ...pruneOldCostEntries(current.costEntries, nowDate),
        { ghSlug: finding.ghSlug, findingId: finding.findingId, costUsd, at: nowDate.toISOString() }
      ]
    };
  });
}

/**
 * Machine-wide count of reactions currently in-flight (started, no outcome
 * recorded yet, and not stale per MAX_REACTION_RUNTIME_SECONDS). Read-only
 * — does not mutate the ledger, so a gate check never itself creates
 * ledger.json.
 */
export async function countInFlight(
  watchHome: string,
  now: () => Date = () => new Date()
): Promise<number> {
  const ledger = await readJsonOrDefault(ledgerPath(watchHome), DEFAULT_LEDGER);
  const nowDate = now();
  return Object.values(ledger.inFlight).filter(
    (entry) => !isStale(entry.startedAt, nowDate, MAX_REACTION_RUNTIME_SECONDS)
  ).length;
}

/**
 * Machine-wide cost spent within the rolling window (default 1 hour, per
 * COND-4's "N $/hour ceiling"). Read-only.
 */
export async function costSpentInWindow(
  watchHome: string,
  windowSeconds: number = DEFAULT_COST_WINDOW_SECONDS,
  now: () => Date = () => new Date()
): Promise<number> {
  const ledger = await readJsonOrDefault(ledgerPath(watchHome), DEFAULT_LEDGER);
  const cutoffMs = now().getTime() - windowSeconds * 1000;
  return ledger.costEntries
    .filter((entry) => new Date(entry.at).getTime() >= cutoffMs)
    .reduce((sum, entry) => sum + entry.costUsd, 0);
}
