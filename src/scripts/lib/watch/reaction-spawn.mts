// watch/reaction-spawn.mts — real headless `claude -p` reaction spawning +
// permission allowlist wiring (FEAT-244 SLICE-147 / contract B3 AC-3).
//
// Split in two: buildSpawnArgs is a pure function (no I/O) so AC-3's "never
// --dangerously-skip-permissions" invariant is unit-testable without ever
// touching a real process. spawnReactionProcess is the only impure half —
// it launches via node:child_process.spawn(bin, args, { detached: true }),
// never exec/execFile with shell:true, so a constructed argv array is
// handed straight to the OS and nothing here is reinterpreted by a shell.
//
// "issue-broker-file" (tier-2, "watch-only" per the contract) never reaches
// a real spawn: buildSpawnArgs returns null for that action and
// spawnReactionProcess treats null as "nothing to run" — tier-2 repos file
// an issue for a human, they never launch a headless claude session.

import { spawn as nodeSpawn } from "node:child_process";

import type { ReactionSpawn } from "./types.mjs";

export const CLAUDE_BIN = "claude";

// AC-3: constructed args must NEVER include this flag, under any
// ReactionAction. Guarded twice — the runtime check in buildSpawnArgs below,
// and a grep-style test (src/tests/watch-reaction-spawn.test.mts) over this
// directory's source files — so a future edit can't silently reintroduce it
// in either the code path or a comment/string that later gets copy-pasted
// into real args.
const FORBIDDEN_FLAG = "--dangerously-skip-permissions";

export interface SpawnArgs {
  bin: string;
  args: string[];
  cwd: string;
}

/**
 * Pure arg construction — no process spawned. Returns null for
 * "issue-broker-file" (tier-2 watch-only: never a headless spawn).
 *
 * `allowedTools` is the pre-configured permission allowlist (machine
 * config's `allowedTools`, watch/config.mts). Absent/empty means no
 * `--allowedTools` flag is added — the spawned session falls back to
 * Claude Code's normal permission prompts (may stall under `-p`; that is
 * the accepted, documented trade-off — never substitute a bypass flag).
 */
export function buildSpawnArgs(
  spawn: ReactionSpawn,
  allowedTools: string[] | undefined
): SpawnArgs | null {
  if (spawn.action === "issue-broker-file") return null;

  const args = ["-p", spawn.promptArg];
  // Tool names never start with a dash — drop any flag-shaped entry so a
  // poisoned allowlist cannot smuggle argv flags (the forbidden bypass flag
  // or anything else) through --allowedTools's value position.
  const safeTools = (allowedTools ?? []).filter((tool) => !tool.trimStart().startsWith("-"));
  if (safeTools.length > 0) {
    args.push("--allowedTools", safeTools.join(","));
  }

  if (args.includes(FORBIDDEN_FLAG)) {
    // Unreachable under the construction above — defense in depth so a
    // future edit to this function fails loudly instead of spawning.
    throw new Error(`[watch/reaction-spawn] refusing to spawn with ${FORBIDDEN_FLAG}`);
  }

  return { bin: CLAUDE_BIN, args, cwd: spawn.cwd };
}

// Minimal shape spawnReactionProcess needs off a spawned handle — matches
// node:child_process's ChildProcess structurally, narrowed to keep this
// module's test seam small (a fake in tests never has to implement the
// full ChildProcess surface).
export interface SpawnHandle {
  on(event: "error", listener: (err: Error) => void): void;
  unref(): void;
}

export type SpawnFn = (
  bin: string,
  args: string[],
  options: { cwd: string; detached: boolean; stdio: "ignore" }
) => SpawnHandle;

const defaultSpawnFn: SpawnFn = (bin, args, options) => nodeSpawn(bin, args, options);

/**
 * Real detached spawn — injectable so callers (buildDefaultTickExec) and
 * tests never have to launch an actual `claude` process. Detached +
 * unref'd: the reaction session outlives this tick process (the watcher
 * scheduler tick must return promptly; headless claude sessions run for
 * minutes). A synchronous spawn failure (e.g. `claude` not on PATH) is
 * surfaced via the 'error' event rather than left to crash the process on
 * an unhandled EventEmitter error.
 */
export function spawnReactionProcess(
  spawnArgs: SpawnArgs | null,
  spawnFn: SpawnFn = defaultSpawnFn
): void {
  if (spawnArgs === null) return; // tier-2 issue-broker-file — nothing to spawn
  const child = spawnFn(spawnArgs.bin, spawnArgs.args, {
    cwd: spawnArgs.cwd,
    detached: true,
    stdio: "ignore"
  });
  child.on("error", (err) => {
    console.error(`[watch/reaction-spawn] failed to spawn ${spawnArgs.bin}: ${err.message}`);
  });
  child.unref();
}
