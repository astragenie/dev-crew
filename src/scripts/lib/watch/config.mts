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
  // Pre-configured permission allowlist for Layer 2's headless `claude -p`
  // reaction sessions (FEAT-244 SLICE-147 / contract B3 AC-3) — joined and
  // passed as `--allowedTools <a,b,c>` by watch/reaction-spawn.mts. Absent,
  // empty, or malformed means NO --allowedTools flag is added at all: the
  // spawned session falls back to Claude Code's normal interactive
  // permission prompts. A headless `-p` session with no configured
  // allowlist may then stall waiting on a prompt it can never answer — an
  // accepted, documented trade-off. It is NEVER resolved by substituting
  // `--dangerously-skip-permissions` (see reaction-spawn.mts).
  allowedTools?: string[];
}

export const DEFAULT_MACHINE_SHARD = 1;

export function machineConfigPath(watchHome: string): string {
  return path.join(watchHome, "config.json");
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "string" && v.length > 0)
  );
}

/**
 * Reads `<watchHome>/config.json`. Missing file, unparseable JSON, or a
 * non-positive-integer `machineShard` all fall back to
 * DEFAULT_MACHINE_SHARD rather than throwing — an absent config is the
 * expected zero-config single-machine case, not an error. `allowedTools` is
 * similarly best-effort: a malformed value is dropped (treated as absent)
 * rather than failing the whole config read.
 */
export async function readMachineConfig(watchHome: string): Promise<MachineConfig> {
  try {
    const raw = await fs.readFile(machineConfigPath(watchHome), "utf-8");
    const parsed = JSON.parse(raw) as Partial<MachineConfig>;
    const { machineShard, allowedTools } = parsed;
    const shard =
      typeof machineShard === "number" && Number.isInteger(machineShard) && machineShard > 0
        ? machineShard
        : DEFAULT_MACHINE_SHARD;
    return isNonEmptyStringArray(allowedTools)
      ? { machineShard: shard, allowedTools }
      : { machineShard: shard };
  } catch {
    return { machineShard: DEFAULT_MACHINE_SHARD };
  }
}

export async function resolveMachineShard(watchHome: string): Promise<number> {
  const { machineShard } = await readMachineConfig(watchHome);
  return machineShard;
}
