// watch/tick.mts — runTick(): the deterministic, zero-LLM sweep (Layer 1).
//
// Sweeps every registry entry assigned to this machine's shard (gh issue
// list delta, gh run list --status failure, open-PR statusCheckRollup),
// claims new findings (state write BEFORE any Layer 2 spawn — AC-3),
// respects the machine-wide spawn-gate cap/ceiling (AC-4), and never calls
// an LLM itself — Layer 2 dispatch is fully delegated to the injectable
// `exec.spawnReaction` (mirrors pr-watch.mts's PrWatchExec DI pattern; the
// production default just logs, same as pr-watch.mts::buildDefaultExec's
// dispatchBuilder — real headless `claude -p` wiring is the scheduler
// script's job, SLICE-146).
//
// The per-entry detection + claim/spawn-gate decision logic (including the
// COND-1 expired-claim self-heal merge) lives in watch/sweep.mts — this
// file owns only the whole-tick lock, the per-entry loop, and envelope
// emission. Split out in SLICE-144 (tick.mts had grown to 428 lines).

import type { ReactionSpawn, RegistryFile, SpawnGateConfig, TickResult } from "./types.mjs";
import { buildDefaultTickExec, sweepEntry } from "./sweep.mjs";
import type { WatchTickExec } from "./sweep.mjs";
import { readRegistry, validateRegistry } from "./registry.mjs";
import { DEFAULT_SPAWN_GATE_CONFIG } from "./spawn-gate.mjs";
import { emitWatchReactionEnvelope, emitWatchTickEnvelope } from "./envelopes.mjs";
import { recordReactionFinish } from "./ledger.mjs";
import {
  acquireTickLock,
  defaultWatchHome,
  releaseTickLock,
  updateReactionState
} from "./state.mjs";

// Re-exported so `watch.mts` (and any other caller that only needs the
// tick.mts import path) keeps working unchanged — the sweep-module split is
// an internal reorganization, not a public-surface change.
export type { WatchTickExec } from "./sweep.mjs";
export { buildDefaultTickExec } from "./sweep.mjs";

export interface RunTickOptions {
  registryPath: string;
  machineShard: number;
  watchHome?: string;
  exec?: WatchTickExec;
  spawnGateConfig?: SpawnGateConfig;
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Public entry point

export async function runTick(options: RunTickOptions): Promise<TickResult> {
  const watchHome = options.watchHome ?? defaultWatchHome();
  const now = options.now ?? (() => new Date());
  const exec = options.exec ?? buildDefaultTickExec(watchHome, now);
  const spawnGateConfig = options.spawnGateConfig ?? DEFAULT_SPAWN_GATE_CONFIG;

  // AC-2: second tick on the same machine exits immediately, no sweeping.
  const locked = await acquireTickLock(watchHome);
  if (!locked) {
    return { outcome: "lock-held" };
  }

  try {
    const registry = await readRegistry(options.registryPath);
    const validation = validateRegistry(registry);
    if (!validation.ok) {
      throw new Error(`[watch/tick] invalid registry:\n  ${validation.errors.join("\n  ")}`);
    }

    const assigned = registry.entries.filter((entry) => entry.shard === options.machineShard);

    let findingsCount = 0;
    let spawnedCount = 0;
    let skippedCount = 0;

    for (const entry of assigned) {
      const result = await sweepEntry(entry, exec, watchHome, spawnGateConfig, now);
      findingsCount += result.findingsCount;
      spawnedCount += result.spawnedCount;
      skippedCount += result.skippedCount;

      await emitWatchTickEnvelope(registry, {
        ghSlug: entry.ghSlug,
        shard: entry.shard,
        tenantId: entry.tenantId,
        appId: entry.appId,
        tickAt: now().toISOString(),
        findingsCount: result.findingsCount,
        skippedCeilingCount: result.skippedCount
      });
    }

    return { outcome: "swept", findingsCount, spawnedCount, skippedCount };
  } finally {
    await releaseTickLock(watchHome);
  }
}

// ---------------------------------------------------------------------------
// Layer-2-side hook: records a reaction outcome into reaction.json (the
// reaction-owned file — COND-2) and emits watch.reaction. Callable by
// whatever ultimately spawns `claude -p` (the scheduler script / interactive
// /runner:watch command land in SLICE-146); exposed now so AC-5 can prove
// the tick/reaction write split holds against real state-module behavior.

export interface RecordReactionOutcomeOptions {
  watchHome: string;
  registry: RegistryFile;
  entryTenantId: string;
  entryAppId: string;
  spawn: ReactionSpawn;
  outcome: "spawned" | "circuit-broken" | "skipped-ceiling";
  costUsd: number;
  now?: () => Date;
}

export async function recordReactionOutcome(opts: RecordReactionOutcomeOptions): Promise<void> {
  const findingId = opts.spawn.finding.findingId;
  const updated = await updateReactionState(
    opts.watchHome,
    opts.spawn.finding.ghSlug,
    (current) => {
      const attemptCount = (current.attemptCounts[findingId] ?? 0) + 1;
      const costSpent = (current.costSpent[findingId] ?? 0) + opts.costUsd;
      return {
        attemptCounts: { ...current.attemptCounts, [findingId]: attemptCount },
        costSpent: { ...current.costSpent, [findingId]: costSpent },
        totalCostSpentUsd: current.totalCostSpentUsd + opts.costUsd
      };
    }
  );

  // COND-4 machine-wide ledger: clear the in-flight slot (this outcome IS
  // the reaction finishing, from the gate's perspective) and record the
  // cost against the rolling window — mirrors the reaction.json bookkeeping
  // above but scoped machine-wide rather than per-repo.
  await recordReactionFinish(opts.watchHome, opts.spawn.finding, opts.costUsd, opts.now);

  await emitWatchReactionEnvelope(opts.registry, {
    ghSlug: opts.spawn.finding.ghSlug,
    tenantId: opts.entryTenantId,
    appId: opts.entryAppId,
    findingId,
    action: opts.spawn.action,
    attemptCount: updated.attemptCounts[findingId] ?? 1,
    costUsd: opts.costUsd,
    outcome: opts.outcome
  });
}
