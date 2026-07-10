// watch.mts — barrel for the watcher subsystem (FEAT-242). Mirrors
// slice-linker.mts: sub-modules under watch/ are barrel-only from outside
// the directory (see src/scripts/validate-imports.mts). Runtime surface is
// intentionally narrow per the contract — only these four symbols are meant
// to be consumed by /runner:watch and the scheduler entry script.
export { runTick, recordReactionOutcome } from "./watch/tick.mjs";
export { readRegistry, validateRegistry } from "./watch/registry.mjs";

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
