import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  costSpentInWindow,
  countInFlight,
  DEFAULT_COST_WINDOW_SECONDS,
  ledgerPath,
  MAX_REACTION_RUNTIME_SECONDS,
  recordReactionFinish,
  recordReactionStart
} from "../scripts/lib/watch/ledger.mjs";
import type { Finding } from "../scripts/lib/watch/types.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-ledger-test-"));
}

function finding(findingId: string, ghSlug = "org/repo-a"): Finding {
  return { kind: "issue", findingId, ghSlug };
}

test("countInFlight is 0 against a watchHome with no ledger.json yet, and never creates the file", async () => {
  const watchHome = await tmpWatchHome();
  assert.equal(await countInFlight(watchHome), 0);
  await assert.rejects(fs.access(ledgerPath(watchHome)));
});

test("costSpentInWindow is 0 against a watchHome with no ledger.json yet", async () => {
  const watchHome = await tmpWatchHome();
  assert.equal(await costSpentInWindow(watchHome), 0);
});

test("recordReactionStart increments the machine-wide in-flight count regardless of ghSlug", async () => {
  const watchHome = await tmpWatchHome();
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  await recordReactionStart(watchHome, finding("issue:1", "org/repo-a"), now);
  await recordReactionStart(watchHome, finding("issue:2", "org/repo-b"), now);
  await recordReactionStart(watchHome, finding("pr:3", "org/repo-c"), now);

  assert.equal(await countInFlight(watchHome, now), 3);
});

test("recordReactionFinish clears the in-flight slot it started", async () => {
  const watchHome = await tmpWatchHome();
  const now = () => new Date("2026-07-10T00:00:00.000Z");
  const f = finding("issue:1");

  await recordReactionStart(watchHome, f, now);
  assert.equal(await countInFlight(watchHome, now), 1);

  await recordReactionFinish(watchHome, f, 0.5, now);
  assert.equal(await countInFlight(watchHome, now), 0);
});

test("recordReactionFinish on a finding that was never started is a no-op on the in-flight count", async () => {
  const watchHome = await tmpWatchHome();
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  await recordReactionFinish(watchHome, finding("issue:404"), 0.1, now);
  assert.equal(await countInFlight(watchHome, now), 0);
});

test("a findingId is only unique per-repo — two repos with the same findingId both count", async () => {
  const watchHome = await tmpWatchHome();
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  await recordReactionStart(watchHome, finding("issue:1", "org/repo-a"), now);
  await recordReactionStart(watchHome, finding("issue:1", "org/repo-b"), now);

  assert.equal(
    await countInFlight(watchHome, now),
    2,
    "same findingId on two different repos are distinct slots"
  );
});

test("an in-flight entry older than MAX_REACTION_RUNTIME_SECONDS is treated as stale and excluded (crashed Layer 2)", async () => {
  const watchHome = await tmpWatchHome();
  const startedAt = () => new Date("2026-07-10T00:00:00.000Z");

  await recordReactionStart(watchHome, finding("issue:1"), startedAt);

  const justUnderTtl = () =>
    new Date(startedAt().getTime() + (MAX_REACTION_RUNTIME_SECONDS - 1) * 1000);
  assert.equal(
    await countInFlight(watchHome, justUnderTtl),
    1,
    "still counted just under the staleness bound"
  );

  const pastTtl = () => new Date(startedAt().getTime() + (MAX_REACTION_RUNTIME_SECONDS + 1) * 1000);
  assert.equal(
    await countInFlight(watchHome, pastTtl),
    0,
    "excluded once past the staleness bound"
  );
});

test("recordReactionStart opportunistically prunes stale in-flight entries from prior crashed reactions", async () => {
  const watchHome = await tmpWatchHome();
  const t0 = () => new Date("2026-07-10T00:00:00.000Z");
  await recordReactionStart(watchHome, finding("issue:stale"), t0);

  const wellPastTtl = () => new Date(t0().getTime() + (MAX_REACTION_RUNTIME_SECONDS + 60) * 1000);
  await recordReactionStart(watchHome, finding("issue:fresh"), wellPastTtl);

  // Only the fresh entry should remain live; the stale one was pruned on
  // write rather than merely filtered on read.
  const raw = await fs.readFile(ledgerPath(watchHome), "utf-8");
  const ledger = JSON.parse(raw) as { inFlight: Record<string, unknown> };
  assert.deepEqual(Object.keys(ledger.inFlight), ["org/repo-a::issue:fresh"]);
});

test("costSpentInWindow sums only cost entries within the window (default 1 hour)", async () => {
  const watchHome = await tmpWatchHome();
  const base = new Date("2026-07-10T00:00:00.000Z").getTime();

  await recordReactionFinish(watchHome, finding("issue:1"), 1.0, () => new Date(base));
  await recordReactionFinish(
    watchHome,
    finding("issue:2"),
    2.0,
    () => new Date(base + 30 * 60 * 1000)
  ); // +30min

  const nowAt45Min = () => new Date(base + 45 * 60 * 1000);
  assert.equal(
    await costSpentInWindow(watchHome, DEFAULT_COST_WINDOW_SECONDS, nowAt45Min),
    3.0,
    "both entries are within the trailing 1-hour window from 45 minutes in"
  );

  const nowAt90Min = () => new Date(base + 90 * 60 * 1000);
  assert.equal(
    await costSpentInWindow(watchHome, DEFAULT_COST_WINDOW_SECONDS, nowAt90Min),
    2.0,
    "the first entry (60+ min old) has aged out of the trailing 1-hour window"
  );
});

test("costSpentInWindow is machine-wide — sums across every repo, not just one", async () => {
  const watchHome = await tmpWatchHome();
  const now = () => new Date("2026-07-10T00:00:00.000Z");

  await recordReactionFinish(watchHome, finding("issue:1", "org/repo-a"), 1.5, now);
  await recordReactionFinish(watchHome, finding("issue:1", "org/repo-b"), 2.5, now);

  assert.equal(await costSpentInWindow(watchHome, DEFAULT_COST_WINDOW_SECONDS, now), 4.0);
});
