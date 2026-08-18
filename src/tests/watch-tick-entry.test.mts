import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { main } from "../scripts/watch-tick.mjs";
import type { WatchTickExec } from "../scripts/lib/watch.mjs";
import { acquireTickLock, releaseTickLock } from "../scripts/lib/watch/state.mjs";
import type { RegistryFile } from "../scripts/lib/watch/types.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-tick-entry-test-"));
}

async function writeRegistry(watchHome: string, registry: RegistryFile): Promise<void> {
  await fs.writeFile(path.join(watchHome, "repos.json"), JSON.stringify(registry), "utf-8");
}

function oneEntryRegistry(): RegistryFile {
  return {
    controlRepoPath: "C:\\work\\control-repo",
    entries: [
      {
        path: "C:\\work\\repo-a",
        ghSlug: "org/repo-a",
        shard: 1,
        tier: 1,
        tenantId: "t1",
        appId: "a1"
      }
    ]
  };
}

function makeExec(): { exec: WatchTickExec; calls: { listOpenIssues: number } } {
  const calls = { listOpenIssues: 0 };
  const exec: WatchTickExec = {
    listOpenIssues: async () => {
      calls.listOpenIssues++;
      return [];
    },
    listFailedRuns: async () => [],
    listOpenPrChecks: async () => [],
    addClaimLabel: async () => {},
    spawnReaction: async () => {},
    getInFlightReactionCount: async () => 0,
    getCostSpentUsd: async () => 0
  };
  return { exec, calls };
}

// AC-8 regression guard (main() must delegate to the real runTick, not a
// hand-rolled parallel sweep) — asserted here by proving the injected exec's
// gh-listing hooks are actually invoked, which only happens inside
// runTick -> sweepEntry.
test("watch-tick main() delegates to runTick and sweeps the resolved registry", async () => {
  const watchHome = await tmpWatchHome();
  await writeRegistry(watchHome, oneEntryRegistry());
  const { exec, calls } = makeExec();

  await main({ watchHome, exec });

  expect(calls.listOpenIssues).toBe(1);
});

// AC-2 regression guard through the entry point: a held tick lock makes
// main() return without sweeping.
test("watch-tick main() exits without sweeping when the tick lock is held", async () => {
  const watchHome = await tmpWatchHome();
  await writeRegistry(watchHome, oneEntryRegistry());
  const { exec, calls } = makeExec();

  const locked = await acquireTickLock(watchHome);
  expect(locked).toBe(true);
  try {
    await main({ watchHome, exec });
    expect(calls.listOpenIssues).toBe(0);
  } finally {
    await releaseTickLock(watchHome);
  }
});

// AC-7: watch-tick.mts must have no OS-branching reads of the platform
// global — OS scheduling differences live entirely in
// scripts/setup-watch-scheduler.mjs. Comment lines are stripped before the
// grep so documenting the constraint in prose doesn't trip its own check.
test("watch-tick.mts source has no process.platform branches", async () => {
  const source = await fs.readFile(path.resolve("src/scripts/watch-tick.mts"), "utf-8");
  const codeOnly = source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  expect(codeOnly).not.toMatch(/process\s*\.\s*platform/);
});
