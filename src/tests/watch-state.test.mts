import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  acquireTickLock,
  ghSlugHash,
  reactionStatePath,
  releaseTickLock,
  tickStatePath,
  updateReactionState,
  updateStateAtomic,
  updateTickState,
  readTickState,
  readReactionState
} from "../scripts/lib/watch/state.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-state-test-"));
}

// ---------------------------------------------------------------------------
// ghSlugHash / path helpers

test("ghSlugHash is deterministic and produces distinct hashes for distinct slugs", () => {
  assert.equal(ghSlugHash("org/repo-a"), ghSlugHash("org/repo-a"));
  assert.notEqual(ghSlugHash("org/repo-a"), ghSlugHash("org/repo-b"));
});

test("tickStatePath and reactionStatePath are separate files for the same repo (COND-2 write split)", () => {
  const watchHome = "C:\\fake\\watch";
  const tick = tickStatePath(watchHome, "org/repo-a");
  const reaction = reactionStatePath(watchHome, "org/repo-a");
  assert.notEqual(tick, reaction);
  assert.ok(tick.endsWith(".tick.json"));
  assert.ok(reaction.endsWith(".reaction.json"));
});

// ---------------------------------------------------------------------------
// updateStateAtomic — no lost updates under concurrency (AC-5, same-file case)

test("updateStateAtomic serializes N concurrent RMW calls against the same file without losing updates", async () => {
  const watchHome = await tmpWatchHome();
  const filePath = path.join(watchHome, "counter.json");
  const N = 20;

  await Promise.all(
    Array.from({ length: N }, () =>
      updateStateAtomic(filePath, { count: 0 }, (current) => ({ count: current.count + 1 }))
    )
  );

  const raw = JSON.parse(await fs.readFile(filePath, "utf-8")) as { count: number };
  assert.equal(raw.count, N);
});

test("updateStateAtomic returns default state when the file does not exist yet", async () => {
  const watchHome = await tmpWatchHome();
  const filePath = path.join(watchHome, "fresh.json");
  const result = await updateStateAtomic(filePath, { count: 0 }, (current) => current);
  assert.deepEqual(result, { count: 0 });
});

// ---------------------------------------------------------------------------
// AC-5: interleaved tick write + reaction write to the same repo's state —
// neither write is lost. The two writers target separate files by design
// (contract §2), so "interleaved" here means concurrent, not
// same-file-racing; this proves the write split holds under real I/O.

test("AC-5: interleaved tick + reaction writes to the same repo both survive", async () => {
  const watchHome = await tmpWatchHome();
  const ghSlug = "org/repo-ac5";

  await Promise.all([
    updateTickState(watchHome, ghSlug, (current) => ({
      ...current,
      lastSeenIssue: 42,
      lastTickAt: "2026-07-09T00:00:00.000Z"
    })),
    updateReactionState(watchHome, ghSlug, (current) => ({
      ...current,
      attemptCounts: { "issue:42": 1 },
      costSpent: { "issue:42": 0.25 },
      totalCostSpentUsd: 0.25
    }))
  ]);

  const tickState = await readTickState(watchHome, ghSlug);
  const reactionState = await readReactionState(watchHome, ghSlug);

  assert.equal(tickState.lastSeenIssue, 42);
  assert.equal(tickState.lastTickAt, "2026-07-09T00:00:00.000Z");
  assert.deepEqual(reactionState.attemptCounts, { "issue:42": 1 });
  assert.equal(reactionState.costSpent["issue:42"], 0.25);
  assert.equal(reactionState.totalCostSpentUsd, 0.25);
});

// ---------------------------------------------------------------------------
// AC-2: tick lockfile

test("acquireTickLock succeeds when unheld, fails while held, succeeds again after release", async () => {
  const watchHome = await tmpWatchHome();

  const first = await acquireTickLock(watchHome);
  assert.equal(first, true);

  const second = await acquireTickLock(watchHome);
  assert.equal(second, false);

  await releaseTickLock(watchHome);

  const third = await acquireTickLock(watchHome);
  assert.equal(third, true);
});
