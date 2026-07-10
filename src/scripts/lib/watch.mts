// watch.mts — barrel for the watcher subsystem (FEAT-242). Mirrors
// slice-linker.mts: sub-modules under watch/ are barrel-only from outside
// the directory (see src/scripts/validate-imports.mts). Runtime surface is
// intentionally narrow per the contract — these are the symbols consumed by
// src/scripts/watch-tick.mts (the scheduler entry point) and, via the same
// entry point, /runner:watch (commands/watch.md) — SLICE-146.
export { runTick, recordReactionOutcome } from "./watch/tick.mjs";
export { readRegistry, validateRegistry } from "./watch/registry.mjs";
export { defaultWatchHome } from "./watch/state.mjs";
export {
  resolveMachineShard,
  readMachineConfig,
  machineConfigPath,
  DEFAULT_MACHINE_SHARD
} from "./watch/config.mjs";
export type { MachineConfig } from "./watch/config.mjs";

export type {
  RegistryEntry,
  RegistryFile,
  ClaimEntry,
  SkippedCeilingEntry,
  TickState,
  ReactionState,
  FindingKind,
  Finding,
  TickResult,
  SpawnGateConfig,
  SpawnGateDecision,
  ReactionAction,
  ReactionSpawn
} from "./watch/types.mjs";
export type { RunTickOptions, WatchTickExec } from "./watch/tick.mjs";
export type { RegistryValidationResult } from "./watch/registry.mjs";
