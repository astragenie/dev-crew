import { test } from "bun:test";
import assert from "node:assert/strict";

import { decayConfidence } from "../scripts/lib/learnings-decay.mjs";
import type { LearningEntry } from "../scripts/lib/learnings-decay.mjs";

function makeEntry(overrides: Partial<LearningEntry> = {}): LearningEntry {
  return {
    id: "1",
    text: "test learning",
    sliceId: "SLICE-001",
    createdAt: 0,
    ...overrides
  };
}

const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

// Test 1 — 0-week: no decay, result equals initial confidence
test("decayConfidence: 0 weeks => no decay, returns initial confidence", () => {
  const entry = makeEntry({ confidence: 0.8, createdAt: 1000 });
  const result = decayConfidence(entry, 1000);
  assert.ok(
    Math.abs(result - 0.8) < 0.0001,
    `Expected ~0.8, got ${result}`
  );
});

// Test 2 — 10-week: result ≈ 0.5 × initial (±0.001)
test("decayConfidence: 10 weeks => ~50% of initial confidence", () => {
  const createdAt = 0;
  const nowMs = 10 * MS_PER_WEEK;
  const entry = makeEntry({ confidence: 1.0, createdAt });
  const result = decayConfidence(entry, nowMs);
  assert.ok(
    Math.abs(result - 0.5) < 0.001,
    `Expected ~0.5, got ${result}`
  );
});

// Test 3 — 20-week: result ≈ 0.25 × initial
test("decayConfidence: 20 weeks => ~25% of initial confidence", () => {
  const createdAt = 0;
  const nowMs = 20 * MS_PER_WEEK;
  const entry = makeEntry({ confidence: 1.0, createdAt });
  const result = decayConfidence(entry, nowMs);
  assert.ok(
    Math.abs(result - 0.25) < 0.001,
    `Expected ~0.25, got ${result}`
  );
});

// Test 4 — zero confidence stays zero
test("decayConfidence: confidence=0 stays 0 regardless of time", () => {
  const entry = makeEntry({ confidence: 0, createdAt: 0 });
  const result = decayConfidence(entry, 10 * MS_PER_WEEK);
  assert.equal(result, 0);
});

// Test 5 — undefined confidence treated as 1.0
test("decayConfidence: undefined confidence treated as 1.0", () => {
  const entry = makeEntry({ createdAt: 0 }); // no confidence field
  const result10 = decayConfidence(entry, 10 * MS_PER_WEEK);
  assert.ok(
    Math.abs(result10 - 0.5) < 0.001,
    `Expected ~0.5, got ${result10}`
  );
});

// Test 6 — non-unit initial confidence scales proportionally
test("decayConfidence: non-unit initial confidence scales proportionally at 10 weeks", () => {
  const entry = makeEntry({ confidence: 0.6, createdAt: 0 });
  const result = decayConfidence(entry, 10 * MS_PER_WEEK);
  assert.ok(
    Math.abs(result - 0.3) < 0.001,
    `Expected ~0.3, got ${result}`
  );
});
