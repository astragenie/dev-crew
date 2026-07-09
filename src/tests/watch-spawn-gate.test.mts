import { test } from "bun:test";
import assert from "node:assert/strict";

import { DEFAULT_SPAWN_GATE_CONFIG, evaluateSpawnGate } from "../scripts/lib/watch/spawn-gate.mjs";

test("evaluateSpawnGate allows when under both the concurrency cap and cost ceiling", () => {
  const decision = evaluateSpawnGate(DEFAULT_SPAWN_GATE_CONFIG, 0, 0);
  assert.deepEqual(decision, { allow: true });
});

test("AC-4 concurrency-cap variant: denies at the configured cap", () => {
  const decision = evaluateSpawnGate(DEFAULT_SPAWN_GATE_CONFIG, 3, 0);
  assert.deepEqual(decision, { allow: false, reason: "concurrency-cap" });
});

test("AC-4 cost-ceiling variant: denies at the configured ceiling", () => {
  const decision = evaluateSpawnGate(DEFAULT_SPAWN_GATE_CONFIG, 0, 5.0);
  assert.deepEqual(decision, { allow: false, reason: "cost-ceiling" });
});

test("concurrency-cap is checked before cost-ceiling when both would trip", () => {
  const decision = evaluateSpawnGate(DEFAULT_SPAWN_GATE_CONFIG, 3, 5.0);
  assert.deepEqual(decision, { allow: false, reason: "concurrency-cap" });
});

test("respects a custom config", () => {
  const config = { maxConcurrentReactions: 1, maxCostUsdPerWindow: 0.5 };
  assert.deepEqual(evaluateSpawnGate(config, 1, 0), { allow: false, reason: "concurrency-cap" });
  assert.deepEqual(evaluateSpawnGate(config, 0, 0.5), { allow: false, reason: "cost-ceiling" });
  assert.deepEqual(evaluateSpawnGate(config, 0, 0.49), { allow: true });
});
