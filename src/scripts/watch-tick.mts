// watch-tick.mts — Layer 1 entry point (FEAT-242 SLICE-146).
//
// Thin wrapper: resolves watchHome + machineShard, then delegates to the
// exported runTick(). Deliberately platform-neutral (AC-7) — no
// `process.platform` branching belongs in this file. OS-specific scheduling
// (Windows Task Scheduler vs cron) lives entirely in
// scripts/setup-watch-scheduler.mjs, which only ever invokes THIS script by
// path; this file has no idea what scheduled it.
//
// `/devcrew:watch` (commands/watch.md) invokes this same script — there is
// no divergent code path between the scheduled tick and the interactive
// command (AC-8).
//
// Sets `process.exitCode` only, never `process.exit` (docs/code-conventions.md).

import path from "node:path";
import { fileURLToPath } from "node:url";

import { defaultWatchHome, resolveMachineShard, runTick } from "./lib/watch.mjs";
import type { WatchTickExec } from "./lib/watch.mjs";

// `exec` is exposed here purely for testability (mirrors runTick's own
// exec-injection pattern) — production invocation (the scheduler and
// /devcrew:watch) always calls main() with no arguments and gets the real
// `gh` + spawn exec built by runTick's default.
export interface MainOptions {
  watchHome?: string;
  exec?: WatchTickExec;
}

export async function main(options: MainOptions = {}): Promise<void> {
  const watchHome = options.watchHome ?? defaultWatchHome();
  const machineShard = await resolveMachineShard(watchHome);
  const registryPath = path.join(watchHome, "repos.json");

  const result = await runTick({
    registryPath,
    machineShard,
    watchHome,
    ...(options.exec ? { exec: options.exec } : {})
  });

  if (result.outcome === "lock-held") {
    console.log("[watch-tick] lock held by another tick — exiting");
    return;
  }

  console.log(
    `[watch-tick] swept: findings=${result.findingsCount} spawned=${result.spawnedCount} skipped=${result.skippedCount}`
  );
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  try {
    await main();
  } catch (err) {
    console.error("[watch-tick] failed:", err);
    process.exitCode = 1;
  }
}
