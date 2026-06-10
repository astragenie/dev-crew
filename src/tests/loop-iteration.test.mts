import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  initializeIterationCounter,
  incrementIteration,
  getIterationStatus,
  resetIterationCounter
} from "../scripts/lib/loop-iteration.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("initializeIterationCounter creates state file with count=0", async () => {
  const repo = await tmpRepo("al-iter-init-");
  const state = await initializeIterationCounter(repo);
  assert.equal(state.count, 0);
  assert.ok(state.initializedAt);
  // Verify file was written
  const stateFile = path.join(repo, ".claude/state/loop/iteration.json");
  const exists = await fs
    .access(stateFile)
    .then(() => true)
    .catch(() => false);
  assert.ok(exists, "iteration.json should be created");
});

test("initializeIterationCounter is idempotent", async () => {
  const repo = await tmpRepo("al-iter-idempotent-");
  const first = await initializeIterationCounter(repo);
  const second = await initializeIterationCounter(repo);
  assert.equal(first.count, 0);
  assert.equal(second.count, 0);
  assert.equal(first.initializedAt, second.initializedAt, "should not reinitialize");
});

test("incrementIteration increases count by 1", async () => {
  const repo = await tmpRepo("al-iter-increment-");
  await initializeIterationCounter(repo);
  const state1 = await incrementIteration(repo);
  assert.equal(state1.count, 1);
  assert.ok(state1.lastIncrementedAt);
  const state2 = await incrementIteration(repo);
  assert.equal(state2.count, 2);
});

test("incrementIteration auto-initializes if state missing", async () => {
  const repo = await tmpRepo("al-iter-auto-init-");
  // Don't call initializeIterationCounter; counter file doesn't exist yet
  const state = await incrementIteration(repo);
  assert.equal(state.count, 1);
});

test("incrementIteration persists count across calls", async () => {
  const repo = await tmpRepo("al-iter-persist-");
  await initializeIterationCounter(repo);
  await incrementIteration(repo);
  await incrementIteration(repo);
  await incrementIteration(repo);
  const state = await incrementIteration(repo);
  assert.equal(state.count, 4);
  // Read from disk again to verify persistence
  const stateFile = path.join(repo, ".claude/state/loop/iteration.json");
  const raw = await fs.readFile(stateFile, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.count, 4);
});

test("getIterationStatus returns count, cap, exhausted=false under limit", async () => {
  const repo = await tmpRepo("al-iter-status-under-");
  await initializeIterationCounter(repo);
  const status = await getIterationStatus(repo, 25);
  assert.equal(status.count, 0);
  assert.equal(status.cap, 25);
  assert.equal(status.exhausted, false);
});

test("getIterationStatus returns exhausted=true when count >= cap", async () => {
  const repo = await tmpRepo("al-iter-status-exhausted-");
  await initializeIterationCounter(repo);
  // Increment to cap
  for (let i = 0; i < 25; i++) {
    await incrementIteration(repo);
  }
  const status = await getIterationStatus(repo, 25);
  assert.equal(status.count, 25);
  assert.equal(status.exhausted, true);
});

test("getIterationStatus respects custom cap", async () => {
  const repo = await tmpRepo("al-iter-custom-cap-");
  await initializeIterationCounter(repo);
  for (let i = 0; i < 5; i++) {
    await incrementIteration(repo);
  }
  const status = await getIterationStatus(repo, 3);
  assert.equal(status.count, 5);
  assert.equal(status.cap, 3);
  assert.equal(status.exhausted, true);
});

test("getIterationStatus returns count=0 when state file missing", async () => {
  const repo = await tmpRepo("al-iter-missing-state-");
  const status = await getIterationStatus(repo, 25);
  assert.equal(status.count, 0);
  assert.equal(status.exhausted, false);
});

test("resetIterationCounter sets count to 0", async () => {
  const repo = await tmpRepo("al-iter-reset-");
  await initializeIterationCounter(repo);
  for (let i = 0; i < 10; i++) {
    await incrementIteration(repo);
  }
  const before = await getIterationStatus(repo, 25);
  assert.equal(before.count, 10);
  const after = await resetIterationCounter(repo);
  assert.equal(after.count, 0);
  assert.ok(after.resetAt);
});

test("checkStopConditions returns iterationCapReached=true when cap exhausted", async () => {
  const repo = await tmpRepo("al-stop-iter-cap-");
  // Initialize bare backlog structure for stop-conditions to work
  await fs.mkdir(path.join(repo, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs", "specs"), { recursive: true });
  // Create minimal backlog
  await fs.writeFile(path.join(repo, "docs", "backlog", "pending", ".gitkeep"), "");

  // Initialize and max out iteration counter
  await initializeIterationCounter(repo);
  for (let i = 0; i < 25; i++) {
    await incrementIteration(repo);
  }

  // auto mode (default) treats iteration cap as advisory.
  // This test asserts the legacy gating path — opt in explicitly.
  const config = { loop: { maxIterations: 25, autoMode: false } };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, true);
  assert.equal(result.iterationCapReached, true);
  assert.ok(result.reasons.some((r: string) => r.includes("iteration cap reached")));
  assert.ok(result.suggestions.some((s: string) => s.includes("maxIterations")));
  assert.equal(result.snapshot.iterationCount, 25);
});

test("checkStopConditions uses preset maxIterations from config", async () => {
  const repo = await tmpRepo("al-stop-iter-config-");
  // Initialize bare structure
  await fs.mkdir(path.join(repo, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs", "specs"), { recursive: true });
  await fs.writeFile(path.join(repo, "docs", "backlog", "pending", ".gitkeep"), "");

  await initializeIterationCounter(repo);
  // Increment to 5
  for (let i = 0; i < 5; i++) {
    await incrementIteration(repo);
  }

  // Config says cap is 3, so we're exhausted
  const config = { loop: { maxIterations: 3 } };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.iterationCapReached, true);
  assert.equal(result.snapshot.iterationCount, 5);
  assert.equal(result.snapshot.iterationCap, 3);
});

test("checkStopConditions defaults to maxIterations=25 when not in config", async () => {
  const repo = await tmpRepo("al-stop-iter-default-");
  await fs.mkdir(path.join(repo, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs", "specs"), { recursive: true });
  await fs.writeFile(path.join(repo, "docs", "backlog", "pending", ".gitkeep"), "");

  await initializeIterationCounter(repo);
  for (let i = 0; i < 26; i++) {
    await incrementIteration(repo);
  }

  // Config without loop section
  const config = {};
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.iterationCapReached, true);
  assert.equal(result.snapshot.iterationCount, 26);
  assert.equal(result.snapshot.iterationCap, 25);
});

test("checkStopConditions returns iterationCapReached=false when under cap", async () => {
  const repo = await tmpRepo("al-stop-iter-under-cap-");
  await fs.mkdir(path.join(repo, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs", "specs"), { recursive: true });
  await fs.writeFile(path.join(repo, "docs", "backlog", "pending", ".gitkeep"), "");

  await initializeIterationCounter(repo);
  for (let i = 0; i < 10; i++) {
    await incrementIteration(repo);
  }

  const config = { loop: { maxIterations: 25 } };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.iterationCapReached, false);
  assert.equal(result.snapshot.iterationCount, 10);
});

test("stop-conditions keeps backward-compat: still checks backlog + alerts", async () => {
  const repo = await tmpRepo("al-stop-backward-compat-");
  await fs.mkdir(path.join(repo, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs", "specs"), { recursive: true });
  await fs.writeFile(path.join(repo, "docs", "backlog", "pending", ".gitkeep"), "");

  // Initialize iteration counter (won't trigger cap)
  await initializeIterationCounter(repo);

  const config = { loop: { maxIterations: 25 } };
  // With no pending/triaged/in-progress backlog and no specs, should trigger "empty backlog" stop condition
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, true);
  // Should have empty backlog reason, not iteration cap reason
  assert.ok(result.reasons.some((r: string) => r.includes("backlog empty")));
  assert.equal(result.iterationCapReached, false);
});
