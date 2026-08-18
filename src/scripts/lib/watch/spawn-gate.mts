// watch/spawn-gate.mts — machine-wide reaction concurrency cap + cost
// ceiling (COND-4). Correlated failures (a shared CI dependency breaking
// many repos at once) must not spawn unbounded parallel headless sessions.
//
// This module is the pure decision function; the caller (watch/sweep.mts)
// supplies inFlightCount/costSpentUsd via WatchTickExec.getInFlightReactionCount
// / getCostSpentUsd. SLICE-143 wired those against stubs (always 0);
// SLICE-145 backs the production exec with the durable machine-wide ledger
// in watch/ledger.mts (recordReactionStart/Finish, countInFlight,
// costSpentInWindow).

import type { SpawnGateConfig, SpawnGateDecision } from "./types.mjs";

export const DEFAULT_SPAWN_GATE_CONFIG: SpawnGateConfig = {
  maxConcurrentReactions: 3,
  maxCostUsdPerWindow: 5.0
};

export function evaluateSpawnGate(
  config: SpawnGateConfig,
  inFlightCount: number,
  costSpentUsd: number
): SpawnGateDecision {
  if (inFlightCount >= config.maxConcurrentReactions) {
    return { allow: false, reason: "concurrency-cap" };
  }
  if (costSpentUsd >= config.maxCostUsdPerWindow) {
    return { allow: false, reason: "cost-ceiling" };
  }
  return { allow: true };
}
