import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runTick } from "../scripts/lib/watch/tick.mjs";
import type { WatchTickExec } from "../scripts/lib/watch/tick.mjs";
import { buildDefaultTickExec } from "../scripts/lib/watch/sweep.mjs";
import { acquireTickLock, tickStatePath } from "../scripts/lib/watch/state.mjs";
import { claimFinding, getActiveClaim } from "../scripts/lib/watch/claims.mjs";
import {
  costSpentInWindow,
  countInFlight,
  recordReactionFinish,
  recordReactionStart
} from "../scripts/lib/watch/ledger.mjs";
import type { RegistryFile } from "../scripts/lib/watch/types.mjs";
import type { SpawnFn } from "../scripts/lib/watch/reaction-spawn.mjs";

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
// AC-4: spawn-gate cap / cost ceiling skip path, against the REAL
// machine-wide ledger (watch/ledger.mts) — not stub-injected counts. The
// gh-facing parts of the exec (listOpenIssues etc.) stay mocked as
// everywhere else in this file; only getInFlightReactionCount /
// getCostSpentUsd are wired to the real ledger functions, seeded by the
// real writer functions (recordReactionStart / recordReactionFinish).

test("AC-4 concurrency-cap variant: 3 in-flight reactions (seeded via the real ledger, across two repos) block a 4th finding from spawning", async () => {
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
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  // Seed 3 in-flight reactions through the real ledger writer — machine-wide,
  // so even a mix of repos (one of them not in this tick's registry at all)
  // must trip the cap.
  await recordReactionStart(
    watchHome,
    { kind: "issue", findingId: "issue:1", ghSlug: "org/repo-a" },
    now
  );
  await recordReactionStart(
    watchHome,
    { kind: "issue", findingId: "issue:2", ghSlug: "org/repo-a" },
    now
  );
  await recordReactionStart(
    watchHome,
    { kind: "red-pr", findingId: "pr:9", ghSlug: "org/repo-z" },
    now
  );
  assert.equal(await countInFlight(watchHome, now), 3, "sanity: real ledger reports 3 in-flight");

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 100 }],
    getInFlightReactionCount: async () => countInFlight(watchHome, now),
    getCostSpentUsd: async () => costSpentInWindow(watchHome, undefined, now)
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec, now });

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

test("AC-4 cost-ceiling variant: cost recorded via the real ledger (recordReactionFinish) within the window blocks the spawn", async () => {
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
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  // A finished reaction (possibly on a different repo — the ceiling is
  // machine-wide) that spent exactly the default ceiling, recorded through
  // the real ledger writer.
  await recordReactionFinish(
    watchHome,
    { kind: "issue", findingId: "issue:77", ghSlug: "org/repo-z" },
    5.0, // == default maxCostUsdPerWindow
    now
  );
  assert.equal(
    await costSpentInWindow(watchHome, undefined, now),
    5.0,
    "sanity: real ledger reports the spend"
  );

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 200 }],
    getInFlightReactionCount: async () => countInFlight(watchHome, now),
    getCostSpentUsd: async () => costSpentInWindow(watchHome, undefined, now)
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec, now });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 0);
  assert.equal(result.skippedCount, 1);

  const raw = await fs.readFile(tickStatePath(watchHome, "org/repo-a"), "utf-8");
  const state = JSON.parse(raw) as { skippedCeiling: Array<{ findingId: string; reason: string }> };
  assert.equal(state.skippedCeiling[0]!.reason, "cost-ceiling");

  const activeClaim = await getActiveClaim(watchHome, "org/repo-a", "issue:200");
  assert.equal(activeClaim, undefined, "finding must remain unclaimed for next tick");
});

test("AC-4: a successful spawn is itself recorded as in-flight via the real ledger", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 5 }],
    getInFlightReactionCount: async () => countInFlight(watchHome, now),
    getCostSpentUsd: async () => costSpentInWindow(watchHome, undefined, now)
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec, now });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 1);
  assert.equal(
    await countInFlight(watchHome, now),
    1,
    "the spawned reaction is now tracked as in-flight"
  );
});

// ---------------------------------------------------------------------------
// AC-3b (SLICE-145 reviewer INFO / SLICE-147): record-before-spawn +
// failure-prune ordering — a spawn failure must never leak an untracked
// concurrency slot, and must never cause a double-spawn on a later tick.

test("AC-3b: the ledger slot is recorded BEFORE spawnReaction is invoked (happens-before, not just eventual consistency)", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  let inFlightAtSpawnTime = -1;
  const exec = makeExec({
    listOpenIssues: async () => [{ number: 1 }],
    spawnReaction: async () => {
      inFlightAtSpawnTime = await countInFlight(watchHome, now);
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec, now });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(
    inFlightAtSpawnTime,
    1,
    "the ledger slot must already be recorded when spawnReaction runs"
  );
});

test("AC-3b: a spawnReaction failure prunes the ledger slot immediately (failure-prune) instead of leaking it", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry());
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  const exec = makeExec({
    listOpenIssues: async () => [{ number: 1 }],
    spawnReaction: async () => {
      throw new Error("spawn ENOENT");
    }
  });

  const result = await runTick({ registryPath, machineShard: 1, watchHome, exec, now });

  assert.equal(result.outcome, "swept");
  if (result.outcome !== "swept") throw new Error("unreachable");
  assert.equal(result.spawnedCount, 0, "a failed spawn is never counted as spawned");
  assert.equal(
    await countInFlight(watchHome, now),
    0,
    "the ledger slot recorded before the failed spawn must be pruned, not leaked"
  );
});

test("AC-3b: a failed spawn leaves the claim in place (self-heals via COND-1 TTL) and does not double-spawn before the TTL expires", async () => {
  const watchHome = await tmpWatchHome();
  const registryPath = await tmpRegistry(oneEntryRegistry({ claimTtlSeconds: 60 }));

  let attempts = 0;
  const execThatFailsOnce = makeExec({
    listOpenIssues: async () => [{ number: 1 }],
    spawnReaction: async () => {
      attempts++;
      throw new Error("spawn ENOENT");
    }
  });

  const firstTick = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec: execThatFailsOnce,
    now: () => new Date("2026-07-10T00:00:00.000Z")
  });
  assert.equal(firstTick.outcome, "swept");
  if (firstTick.outcome !== "swept") throw new Error("unreachable");
  assert.equal(attempts, 1);

  // Still inside the 60s claim TTL — the finding stays claimed, so a second
  // tick (even with a working spawner) must not re-spawn it: no double-spawn
  // caused by the failed first attempt.
  const execThatWorks = makeExec({ listOpenIssues: async () => [] });
  const secondTick = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec: execThatWorks,
    now: () => new Date("2026-07-10T00:00:30.000Z")
  });
  assert.equal(secondTick.outcome, "swept");
  if (secondTick.outcome !== "swept") throw new Error("unreachable");
  assert.equal(
    execThatWorks.calls.spawnReaction,
    0,
    "still inside the claim TTL — no double-spawn"
  );

  // Past the TTL — COND-1 self-heal steals the orphaned claim and retries
  // exactly once (no leftover stale ledger slots accumulated from the
  // earlier failure).
  const execAfterTtl = makeExec({ listOpenIssues: async () => [] });
  const thirdTick = await runTick({
    registryPath,
    machineShard: 1,
    watchHome,
    exec: execAfterTtl,
    now: () => new Date("2026-07-10T00:02:00.000Z")
  });
  assert.equal(thirdTick.outcome, "swept");
  if (thirdTick.outcome !== "swept") throw new Error("unreachable");
  assert.equal(
    thirdTick.spawnedCount,
    1,
    "past TTL, the orphaned claim is stolen and retried exactly once"
  );
  assert.equal(
    await countInFlight(watchHome, () => new Date("2026-07-10T00:02:00.000Z")),
    1,
    "the retried spawn is tracked as in-flight, with no leftover slot from the earlier failure"
  );
});

// ---------------------------------------------------------------------------
// AC-reg: buildDefaultTickExec's REAL spawnReaction wiring (allowlist lookup
// + arg construction), proven with the underlying process-spawn call
// injected — this suite must never launch an actual `claude` process.

test("AC-reg: buildDefaultTickExec wires the configured allowlist into a real spawn's args and never launches an actual process", async () => {
  const watchHome = await tmpWatchHome();
  await fs.writeFile(
    path.join(watchHome, "config.json"),
    JSON.stringify({ allowedTools: ["Read", "Bash(gh:*)"] }),
    "utf-8"
  );

  const spawnCalls: Array<{ bin: string; args: string[] }> = [];
  const spawnFn: SpawnFn = (bin, args) => {
    spawnCalls.push({ bin, args });
    return { on: () => {}, unref: () => {} };
  };

  const exec = buildDefaultTickExec(watchHome, () => new Date("2026-07-10T00:00:00.000Z"), spawnFn);

  await exec.spawnReaction({
    finding: { kind: "issue", findingId: "issue:1", ghSlug: "org/repo-a" },
    action: "intake",
    command: 'claude -p "/runner:intake --from-issue x"',
    promptArg: "/runner:intake --from-issue x",
    cwd: "C:\\work\\repo-a"
  });

  assert.equal(
    spawnCalls.length,
    1,
    "the real spawner must call only the injected spawnFn — it never itself launches claude"
  );
  assert.equal(spawnCalls[0]!.bin, "claude");
  assert.deepEqual(spawnCalls[0]!.args, [
    "-p",
    "/runner:intake --from-issue x",
    "--allowedTools",
    "Read,Bash(gh:*)"
  ]);
  assert.ok(!spawnCalls[0]!.args.includes("--dangerously-skip-permissions"));
});

test("AC-reg: buildDefaultTickExec with no allowedTools configured adds no --allowedTools flag (never a bypass)", async () => {
  const watchHome = await tmpWatchHome(); // no config.json written — zero-config default

  const spawnCalls: string[][] = [];
  const spawnFn: SpawnFn = (_bin, args) => {
    spawnCalls.push(args);
    return { on: () => {}, unref: () => {} };
  };

  const exec = buildDefaultTickExec(watchHome, () => new Date("2026-07-10T00:00:00.000Z"), spawnFn);

  await exec.spawnReaction({
    finding: { kind: "red-pr", findingId: "pr:9", ghSlug: "org/repo-a" },
    action: "pr-fix",
    command: 'claude -p "/runner:pr-fix 9"',
    promptArg: "/runner:pr-fix 9",
    cwd: "C:\\work\\repo-a"
  });

  assert.deepEqual(spawnCalls, [["-p", "/runner:pr-fix 9"]]);
});

test("AC-reg: buildDefaultTickExec never calls spawnFn for an issue-broker-file (tier-2) reaction", async () => {
  const watchHome = await tmpWatchHome();
  let called = false;
  const spawnFn: SpawnFn = () => {
    called = true;
    return { on: () => {}, unref: () => {} };
  };

  const exec = buildDefaultTickExec(watchHome, () => new Date("2026-07-10T00:00:00.000Z"), spawnFn);

  await exec.spawnReaction({
    finding: { kind: "issue", findingId: "issue:1", ghSlug: "org/repo-b" },
    action: "issue-broker-file",
    command: "# issue-broker-file: issue:1 (tier-2, watch-only — no headless spawn)",
    promptArg: "",
    cwd: "C:\\work\\repo-b"
  });

  assert.equal(called, false);
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
