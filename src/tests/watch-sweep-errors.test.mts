// watch-sweep-errors.test.mts — B3 AC-2 / AC-2b: tick resilience against an
// unreachable / insufficient-scope registry entry.
//
// A gh CLI failure (403 insufficient-scope, 404 not-found, or any other
// exec failure) for one registry entry must not crash the whole tick — it
// must record a classified, tick-owned error state (COND-2: only tick.json
// fields, via the existing updateStateAtomic path) and let the loop continue
// sweeping the remaining assigned entries. The error clears on the next
// successful sweep of that entry (AC-2b).

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runTick } from "../scripts/lib/watch/tick.mjs";
import type { WatchTickExec } from "../scripts/lib/watch/tick.mjs";
import { tickStatePath } from "../scripts/lib/watch/state.mjs";
import type { RegistryFile, TickState } from "../scripts/lib/watch/types.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-sweep-errors-test-"));
}

async function tmpRegistry(registry: RegistryFile): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-sweep-errors-registry-"));
  const file = path.join(dir, "repos.json");
  await fs.writeFile(file, JSON.stringify(registry), "utf-8");
  return file;
}

// Mirrors the shape Node's promisified execFile throws on a non-zero gh
// exit: `.message` carries the command line, `.stderr` carries gh's own
// error text — the classifier in sweep.mts inspects both.
class GhCliError extends Error {
  stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.stderr = stderr;
  }
}

function ghForbiddenError(): GhCliError {
  return new GhCliError(
    "Command failed: gh issue list --repo org/repo-a --state open --json number --limit 100",
    "HTTP 403: Resource not accessible by integration (https://api.github.com/repos/org/repo-a/issues)\n"
  );
}

function ghNotFoundError(): GhCliError {
  return new GhCliError(
    "Command failed: gh issue list --repo org/repo-a --state open --json number --limit 100",
    "gh: HTTP 404: Not Found (https://api.github.com/repos/org/repo-a/issues)\n"
  );
}

function ghNetworkError(): GhCliError {
  return new GhCliError(
    "request to https://api.github.com failed",
    "getaddrinfo ENOTFOUND api.github.com\n"
  );
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

function twoEntryRegistry(): RegistryFile {
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
      },
      {
        path: "C:\\work\\repo-b",
        ghSlug: "org/repo-b",
        shard: 1,
        tier: 1,
        tenantId: "t1",
        appId: "a1"
      }
    ]
  };
}

function makeExec(overrides: Partial<WatchTickExec> = {}): WatchTickExec {
  return {
    listOpenIssues: async () => [],
    listFailedRuns: async () => [],
    listOpenPrChecks: async () => [],
    addClaimLabel: async () => {},
    spawnReaction: async () => {},
    getInFlightReactionCount: async () => 0,
    getCostSpentUsd: async () => 0,
    ...overrides
  };
}

async function readTickStateFile(watchHome: string, ghSlug: string): Promise<TickState> {
  const raw = await fs.readFile(tickStatePath(watchHome, ghSlug), "utf-8");
  return JSON.parse(raw) as TickState;
}

// ---------------------------------------------------------------------------
// AC-2: one failing repo among several — tick continues, error classified.

test("AC-2: a 403 from gh for one repo is recorded as insufficient-scope and the tick continues sweeping remaining repos", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(twoEntryRegistry());
  const sweptSlugs: string[] = [];

  const exec = makeExec({
    listOpenIssues: async (entry) => {
      if (entry.ghSlug === "org/repo-a") throw ghForbiddenError();
      sweptSlugs.push(entry.ghSlug);
      return [];
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.errorCount, 1);
  assert.deepEqual(sweptSlugs, ["org/repo-b"], "repo-b is still swept despite repo-a failing");

  const stateA = await readTickStateFile(watchHome, "org/repo-a");
  assert.ok(stateA.lastSweepError, "repo-a records an error state");
  assert.equal(stateA.lastSweepError!.kind, "insufficient-scope");
  assert.equal(stateA.lastSweepError!.consecutiveCount, 1);

  const stateB = await readTickStateFile(watchHome, "org/repo-b");
  assert.equal(stateB.lastSweepError, null, "repo-b's successful sweep carries no error state");
});

test("AC-2: a 404 from gh is classified as not-found", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const exec = makeExec({
    listOpenIssues: async () => {
      throw ghNotFoundError();
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });
  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.errorCount, 1);

  const state = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(state.lastSweepError!.kind, "not-found");
});

test("a non-403/404 gh failure (e.g. network error) is classified as other", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const exec = makeExec({
    listFailedRuns: async () => {
      throw ghNetworkError();
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });
  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.errorCount, 1);

  const state = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(state.lastSweepError!.kind, "other");
});

test("the tick exits cleanly (no throw) when a gh call rejects", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const exec = makeExec({
    listOpenPrChecks: async () => {
      throw ghForbiddenError();
    }
  });

  await assert.doesNotReject(() => runTick({ registryPath, machineShard: 1, watchHome, exec }));
});

// ---------------------------------------------------------------------------
// AC-2b: error clears once the entry sweeps successfully again.

test("AC-2b: a recorded sweep error clears once the next tick sweeps the entry successfully", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());

  let fail = true;
  const exec = makeExec({
    listOpenIssues: async () => {
      if (fail) throw ghForbiddenError();
      return [];
    }
  });

  const tick1 = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:00:00.000Z")
  });
  assert.equal(tick1.outcome, "swept");
  if (tick1.outcome !== "swept") throw new Error("unreachable");
  assert.equal(tick1.errorCount, 1);

  const afterTick1 = await readTickStateFile(watchHome, "org/repo-a");
  assert.ok(afterTick1.lastSweepError, "error present after tick 1");
  assert.equal(afterTick1.lastSweepError!.kind, "insufficient-scope");

  fail = false;
  const tick2 = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:05:00.000Z")
  });
  assert.equal(tick2.outcome, "swept");
  if (tick2.outcome !== "swept") throw new Error("unreachable");
  assert.equal(tick2.errorCount, 0);

  const afterTick2 = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(afterTick2.lastSweepError, null, "error cleared after a successful sweep");
});

test("consecutiveCount increments across back-to-back failing ticks and resets after recovery", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());

  let mode: "fail" | "ok" = "fail";
  const exec = makeExec({
    listOpenIssues: async () => {
      if (mode === "fail") throw ghForbiddenError();
      return [];
    }
  });

  await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:00:00.000Z")
  });
  await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:01:00.000Z")
  });
  const afterTwoFailures = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(afterTwoFailures.lastSweepError!.consecutiveCount, 2);

  mode = "ok";
  await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:02:00.000Z")
  });
  const afterRecovery = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(afterRecovery.lastSweepError, null);

  mode = "fail";
  await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-10T00:03:00.000Z")
  });
  const afterFreshFailure = await readTickStateFile(watchHome, "org/repo-a");
  assert.equal(
    afterFreshFailure.lastSweepError!.consecutiveCount,
    1,
    "count restarts after a recovery cleared it"
  );
});
