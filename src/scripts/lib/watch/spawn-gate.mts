// watch/spawn-gate.mts — machine-wide reaction concurrency cap + cost
// ceiling (COND-4). Correlated failures (a shared CI dependency breaking
// many repos at once) must not spawn unbounded parallel headless sessions.
//
// Full in-flight tracking (a durable ledger of currently-running Layer 2
// reactions) is SLICE-145 scope — this module is the pure decision function;
// SLICE-143 wires it against caller-supplied inFlightCount/costSpentUsd
// (see watch/tick.mts::WatchTickExec.getInFlightReactionCount /
// getCostSpentUsd, both stubbed to 0 in the production default exec until
// SLICE-145 lands a real ledger).

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
