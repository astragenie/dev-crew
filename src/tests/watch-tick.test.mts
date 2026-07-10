import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runTick } from "../scripts/lib/watch/tick.mjs";
import type { WatchTickExec } from "../scripts/lib/watch/tick.mjs";
import { acquireTickLock, tickStatePath } from "../scripts/lib/watch/state.mjs";
import { claimFinding, getActiveClaim } from "../scripts/lib/watch/claims.mjs";
import type { RegistryFile } from "../scripts/lib/watch/types.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-tick-test-"));
}

async function tmpRegistry(registry: RegistryFile): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-tick-registry-"));
  const file = path.join(dir, "repos.json");
  await fs.writeFile(file, JSON.stringify(registry), "utf-8");
  return file;
}

function makeExec(overrides: Partial<WatchTickExec> = {}): WatchTickExec & {
  calls: {
    listOpenIssues: string[];
    listFailedRuns: string[];
    listOpenPrChecks: string[];
    spawnReaction: number;
  };
} {
  const calls = {
    listOpenIssues: [] as string[],
    listFailedRuns: [] as string[],
    listOpenPrChecks: [] as string[],
    spawnReaction: 0
  };
  return {
    calls,
    listOpenIssues: async (entry) => {
      calls.listOpenIssues.push(entry.ghSlug);
      return [];
    },
    listFailedRuns: async (entry) => {
      calls.listFailedRuns.push(entry.ghSlug);
      return [];
    },
    listOpenPrChecks: async (entry) => {
      calls.listOpenPrChecks.push(entry.ghSlug);
      return [];
    },
    addClaimLabel: async () => {},
    spawnReaction: async () => {
      calls.spawnReaction++;
    },
    getInFlightReactionCount: async () => 0,
    getCostSpentUsd: async () => 0,
    ...overrides
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

// ---------------------------------------------------------------------------
// AC-1: quiet tick sweeps every assigned entry, zero claude -p spawns.

test("AC-1: quiet tick sweeps every shard-assigned entry with zero reaction spawns", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(twoEntryRegistry());
  const exec = makeExec();

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.findingsCount, 0);
  assert.equal(result.spawnedCount, 0);
  assert.equal(exec.calls.spawnReaction, 0);
  // per-repo sweep-count assertion — every assigned entry was swept exactly once
  assert.deepEqual(exec.calls.listOpenIssues.sort(), ["org/repo-a", "org/repo-b"]);
  assert.deepEqual(exec.calls.listFailedRuns.sort(), ["org/repo-a", "org/repo-b"]);
  assert.deepEqual(exec.calls.listOpenPrChecks.sort(), ["org/repo-a", "org/repo-b"]);
});

test("AC-1: entries outside this machine's shard are not swept", async () => {
  const watchHome = await tmpWatchHome();
  const registry: RegistryFile = {
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
        shard: 2,
        tier: 1,
        tenantId: "t1",
        appId: "a1"
      }
    ]
  };
  const registryPath = await tmpRegistry(registry);
  const exec = makeExec();

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  assert.deepEqual(exec.calls.listOpenIssues, ["org/repo-a"]);
});

// ---------------------------------------------------------------------------
// AC-2: overlapping tick exits immediately without sweeping.

test("AC-2: a second tick exits immediately without sweeping while the lock is held", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(twoEntryRegistry());
  const exec = makeExec();

  const locked = await acquireTickLock(watchHome);
  assert.equal(locked, true);

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.deepEqual(result, { outcome: "lock-held" });
  assert.equal(exec.calls.listOpenIssues.length, 0, "second tick must not sweep at all");
});

// ---------------------------------------------------------------------------
// AC-3: claim-write-before-spawn ordering, proven against real state I/O.

test("AC-3: claim label + state entry are written BEFORE the reaction spawn (happens-before, not just presence)", async () => {
  const watchHome = await tmpWatchHome();
  const registry: RegistryFile = {
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
  const registryPath = await tmpRegistry(registry);

  const order: string[] = [];
  let claimsOnDiskAtSpawnTime: Record<string, unknown> | null = null;

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 42 }],
    addClaimLabel: async () => {
      order.push("claimLabel");
    },
    spawnReaction: async () => {
      order.push("spawn");
      // Read the state file directly off disk at the moment spawn is
      // invoked — proves the claim write already completed, not merely
      // that it completes eventually.
      const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
      claimsOnDiskAtSpawnTime = (JSON.parse(raw) as { claims: Record<string, unknown> }).claims;
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 1);
  assert.deepEqual(order, ["claimLabel", "spawn"]);
  assert.ok(claimsOnDiskAtSpawnTime);
  assert.ok(
    (claimsOnDiskAtSpawnTime as Record<string, unknown>)["issue:42"],
    "claim entry must exist before spawn"
  );

  const activeClaim = await getActiveClaim(watchHome, "org/repo-a", "issue:42");
  assert.ok(activeClaim);
});

// ---------------------------------------------------------------------------
// AC-4: spawn-gate cap / cost ceiling skip path.

test("AC-4 concurrency-cap variant: 3 in-flight reactions block a 4th finding from spawning", async () => {
  const watchHome = await tmpWatchHome();
  const registry: RegistryFile = {
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
  const registryPath = await tmpRegistry(registry);

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 100 }],
    getInFlightReactionCount: async () => 3 // at the default cap
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 0);
  assert.equal(result.skippedCount, 1);
  assert.equal(exec.calls.spawnReaction, 0);

  const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
  const state = JSON.parse(raw) as { skippedCeiling: Array<{ findingId: string; reason: string }> };
  assert.equal(state.skippedCeiling.length, 1);
  assert.equal(state.skippedCeiling[0]!.findingId, "issue:100");
  assert.equal(state.skippedCeiling[0]!.reason, "concurrency-cap");

  const activeClaim = await getActiveClaim(watchHome, "org/repo-a", "issue:100");
  assert.equal(activeClaim, undefined, "finding must remain unclaimed for next tick");
});

test("AC-4 cost-ceiling variant: cost at the configured ceiling blocks the spawn", async () => {
  const watchHome = await tmpWatchHome();
  const registry: RegistryFile = {
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
  const registryPath = await tmpRegistry(registry);

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 200 }],
    getCostSpentUsd: async () => 5.0 // == default maxCostUsdPerWindow
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 0);
  assert.equal(result.skippedCount, 1);

  const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
  const state = JSON.parse(raw) as { skippedCeiling: Array<{ findingId: string; reason: string }> };
  assert.equal(state.skippedCeiling[0]!.reason, "cost-ceiling");
});

// ---------------------------------------------------------------------------
// registry validation is enforced before any sweep.

test("runTick throws on an invalid registry (duplicate ghSlug) instead of sweeping", async () => {
  const watchHome = await tmpWatchHome();
  const registry: RegistryFile = {
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
        path: "C:\\work\\repo-a-2",
        ghSlug: "org/repo-a",
        shard: 2,
        tier: 1,
        tenantId: "t1",
        appId: "a1"
      }
    ]
  };
  const registryPath = await tmpRegistry(registry);
  const exec = makeExec();

  await assert.rejects(
    () => runTick({ registryPath, machineShard: 1, watchHome, exec }),
    /invalid registry/
  );
  assert.equal(exec.calls.listOpenIssues.length, 0);

  // the tick lock must be released even on this failure path, so a
  // subsequent tick is not permanently blocked
  const locked = await acquireTickLock(watchHome);
  assert.equal(locked, true);
});

// ---------------------------------------------------------------------------
// COND-1: claim-label + TTL self-heal (SLICE-144).

function oneEntryRegistry(overrides: Partial<RegistryFile["entries"][number]> = {}): RegistryFile {
  return {
    controlRepoPath: "C:\\work\\control-repo",
    entries: [
      {
        path: "C:\\work\\repo-a",
        ghSlug: "org/repo-a",
        shard: 1,
        tier: 1,
        tenantId: "t1",
        appId: "a1",
        ...overrides
      }
    ]
  };
}

test("COND-1: an expired claim on a finding the gh cursor no longer treats as new is stolen and re-spawned", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());

  // Simulate a prior tick that already claimed + saw issue:99 (lastSeenIssue
  // advanced past it), then the claim went stale (TTL expired) — e.g. a
  // killed Layer 2 reaction that never recorded an outcome.
  await claimFinding({
    watchHome,
    ghSlug: "org/repo-a",
    finding: { kind: "issue", findingId: "issue:99", ghSlug: "org/repo-a" },
    addClaimLabel: async () => {},
    ttlSeconds: 60,
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  const exec = makeExec({
    // gh's cursor sees no NEW issues — 99 is already <= lastSeenIssue from
    // the (simulated) prior tick, so it would never resurface via the
    // ordinary cursor path.
    listOpenIssues: async () => []
  });

  const result = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-09T01:00:00.000Z") // 1 hour later — past the 60s TTL
  });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 1, "the orphaned claim's finding is stolen and re-spawned");
  assert.equal(exec.calls.spawnReaction, 1);

  const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
  const state = JSON.parse(raw) as { claims: Record<string, { claimedAt: string }> };
  assert.equal(
    state.claims["issue:99"]!.claimedAt,
    "2026-07-09T01:00:00.000Z",
    "steal overwrites the claim entry with a fresh timestamp"
  );
});

test("COND-1: an active (non-expired) claim is never re-stolen — no double reaction", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());

  await claimFinding({
    watchHome,
    ghSlug: "org/repo-a",
    finding: { kind: "issue", findingId: "issue:50", ghSlug: "org/repo-a" },
    addClaimLabel: async () => {},
    ttlSeconds: 1800,
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  const exec = makeExec({ listOpenIssues: async () => [] });

  const result = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    // 5 minutes later — well inside the 30-minute TTL.
    now: () => new Date("2026-07-09T00:05:00.000Z")
  });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 0);
  assert.equal(result.skippedCount, 0);
  assert.equal(exec.calls.spawnReaction, 0, "an active claim must never trigger a second reaction");
});

test("COND-1: kill-mid-reaction — claim set, no reaction outcome ever recorded, next tick past TTL steals cleanly", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const finding = { kind: "red-pr" as const, findingId: "pr:7", ghSlug: "org/repo-a" };

  // Tick N: Layer 1 claims pr:7 and "spawns" a reaction that then gets
  // killed — recordReactionOutcome is deliberately never called, so
  // reaction.json is never written. This is the exact orphan shape COND-1
  // targets.
  await claimFinding({
    watchHome,
    ghSlug: "org/repo-a",
    finding,
    addClaimLabel: async () => {},
    ttlSeconds: 120,
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  // Tick N+1, still inside the TTL window: gh still reports the same PR
  // head sha (no new activity), so the cursor produces no finding, and the
  // claim is still active — must stay untouched.
  const execStillClaimed = makeExec({ listOpenPrChecks: async () => [] });
  const stillClaimedResult = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec: execStillClaimed,
    now: () => new Date("2026-07-09T00:01:00.000Z")
  });
  assert.equal(stillClaimedResult.outcome, "swept");
  if (stillClaimedResult.outcome !== "swept") throw new Error("unreachable");
  assert.equal(execStillClaimed.calls.spawnReaction, 0);

  // Tick N+2, past the TTL: self-heal kicks in — the orphaned claim is
  // stolen and a fresh reaction is spawned.
  const execAfterTtl = makeExec({ listOpenPrChecks: async () => [] });
  const healedResult = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec: execAfterTtl,
    now: () => new Date("2026-07-09T00:03:00.000Z") // 3 min later, past the 120s TTL
  });

  assert.equal(healedResult.outcome, "swept");
  if (healedResult.outcome !== "swept") throw new Error("unreachable");
  assert.equal(healedResult.spawnedCount, 1);
  assert.equal(execAfterTtl.calls.spawnReaction, 1);

  const activeClaim = await getActiveClaim(
    watchHome,
    "org/repo-a",
    "pr:7",
    new Date("2026-07-09T00:03:00.000Z")
  );
  assert.ok(activeClaim, "the steal re-claims with a fresh timestamp, active again immediately");
});

test("COND-1: RegistryEntry.claimTtlSeconds overrides the default TTL when claiming", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry({ claimTtlSeconds: 30 }));

  const exec = makeExec({ listOpenIssues: async () => [{ number: 5 }] });

  await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec,
    now: () => new Date("2026-07-09T00:00:00.000Z")
  });

  const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
  const state = JSON.parse(raw) as { claims: Record<string, { ttlSeconds: number }> };
  assert.equal(
    state.claims["issue:5"]!.ttlSeconds,
    30,
    "the per-repo claimTtlSeconds override is used, not the 1800s default"
  );

  // 31 seconds later — past the 30s override TTL, still well inside the
  // 1800s default — the claim must be expired (proves the override, not
  // the default, was what governed).
  const stillExpired = await getActiveClaim(
    watchHome,
    "org/repo-a",
    "issue:5",
    new Date("2026-07-09T00:00:31.000Z")
  );
  assert.equal(stillExpired, undefined);
});
