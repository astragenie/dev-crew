// watch/config.mts — machine-level watcher config (~/.claude/watch/config.json).
//
// machineShard identifies which shard THIS machine claims from the
// registry (repos.json's per-entry `shard` field) — a machine property,
// not a per-repo one. Resolves the open contract question carried from
// SLICE-143/144 ("`loop.json`'s `watch.shard` field ... not fully
// specified — confirm whether it lives in `.claude/loop.json` (repo-scoped,
// awkward for a machine-wide concept) or a new `~/.claude/watch/machine.json`
// (machine-scoped, cleaner fit)" — contract §"Open trade-offs" item 1):
// this module reads it from `<watchHome>/config.json`, alongside
// repos.json/state/tick.lock, because a single machine watches many repos
// and a target repo's `.claude/loop.json` has no natural single owner for a
// machine-wide identity.
//
// Default machineShard is 1 (not 0) so a single-machine setup works with
// zero config against a registry whose entries use shard: 1 — the natural
// first/only shard number (registry.mts's schema requires a positive
// integer, so 0 is not a valid fallback).

import fs from "node:fs/promises";
import path from "node:path";

export interface MachineConfig {
  machineShard: number;
}

export const DEFAULT_MACHINE_SHARD = 1;

export function machineConfigPath(watchHome: string): string {
  return path.join(watchHome, "config.json");
}

/**
 * Reads `<watchHome>/config.json`. Missing file, unparseable JSON, or a
 * non-positive-integer `machineShard` all fall back to
 * DEFAULT_MACHINE_SHARD rather than throwing — an absent config is the
 * expected zero-config single-machine case, not an error.
 */
export async function readMachineConfig(watchHome: string): Promise<MachineConfig> {
  try {
    const raw = await fs.readFile(machineConfigPath(watchHome), "utf-8");
    const parsed = JSON.parse(raw) as Partial<MachineConfig>;
    const { machineShard } = parsed;
    if (typeof machineShard === "number" && Number.isInteger(machineShard) && machineShard > 0) {
      return { machineShard };
    }
    return { machineShard: DEFAULT_MACHINE_SHARD };
  } catch {
    return { machineShard: DEFAULT_MACHINE_SHARD };
  }
}

export async function resolveMachineShard(watchHome: string): Promise<number> {
  const { machineShard } = await readMachineConfig(watchHome);
  return machineShard;
}
