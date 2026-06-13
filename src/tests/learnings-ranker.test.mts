import { test } from "bun:test";
import assert from "node:assert/strict";

import { rankLearnings } from "../scripts/lib/learnings-ranker.mjs";
import type { LearningEntry } from "../scripts/lib/learnings-decay.mjs";

function makeEntry(overrides: Partial<LearningEntry> & Pick<LearningEntry, "id">): LearningEntry {
  return {
    text: "default learning text",
    sliceId: "SLICE-001",
    createdAt: 0,
    ...overrides
  };
}

// Test 1 — empty input returns empty array
test("rankLearnings: empty input returns empty array", () => {
  const result = rankLearnings([]);
  assert.deepEqual(result, []);
});

// Test 2 — ordering by score: higher utility_score ranks first
test("rankLearnings: entries ordered by composite score descending", () => {
  const nowMs = 0; // createdAt=0, nowMs=0 → 0 weeks decay
  const entries: LearningEntry[] = [
    makeEntry({ id: "low", text: "low utility", utility_score: 1, confidence: 1.0, createdAt: 0 }),
    makeEntry({ id: "high", text: "high utility", utility_score: 5, confidence: 1.0, createdAt: 0 }),
    makeEntry({ id: "mid", text: "mid utility", utility_score: 3, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result[0]!.id, "high");
  assert.equal(result[1]!.id, "mid");
  assert.equal(result[2]!.id, "low");
});

// Test 3 — query boost: matching entry overtakes a slightly higher-scored entry
test("rankLearnings: query boost promotes matching entry", () => {
  const nowMs = 0;
  // Equal utility_score; query "decay" boosts the matching entry → it ranks first
  const candidates: LearningEntry[] = [
    makeEntry({ id: "no-match", text: "something else entirely", utility_score: 2, confidence: 1.0, createdAt: 0 }),
    makeEntry({ id: "match", text: "decay confidence ranking boost", utility_score: 2, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(candidates, { nowMs, query: "decay" });
  assert.equal(result[0]!.id, "match", "query-matching entry should rank first");
});

// Test 4 — token budget trimming
test("rankLearnings: token budget trims entries when sum exceeds 1000", () => {
  const nowMs = 0;
  // Each entry has 4001 chars → tokenCost = ceil(4001/4) = 1001 > 1000 per entry
  // So only 0 entries can fit (1001 > 1000)
  const longText = "x".repeat(4001);
  const entries: LearningEntry[] = [
    makeEntry({ id: "big1", text: longText, utility_score: 10, confidence: 1.0, createdAt: 0 }),
    makeEntry({ id: "big2", text: longText, utility_score: 9, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  // First entry costs 1001 tokens (> 1000 budget) → no entries fit
  assert.equal(result.length, 0, "entries exceeding token budget per-entry should be excluded");
});

// Test 4b — token budget: several small entries stay within budget
test("rankLearnings: small entries accumulate within token budget", () => {
  const nowMs = 0;
  // text length 400 → tokenCost = 100 tokens each
  // 10 entries → 1000 tokens total (exactly at budget)
  const text = "a".repeat(400);
  const entries: LearningEntry[] = Array.from({ length: 12 }, (_, i) =>
    makeEntry({ id: `e${i}`, text, utility_score: 12 - i, confidence: 1.0, createdAt: 0 })
  );
  const result = rankLearnings(entries, { nowMs });
  // 10 entries fit (10 * 100 = 1000); 11th would push to 1100
  assert.equal(result.length, 10, `Expected 10 entries within budget, got ${result.length}`);
});

// Test 5 — utility_score floor interaction: 0 utility_score still ranks, just lower
test("rankLearnings: utility_score=0 entries rank below positive-utility entries", () => {
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({ id: "zero", text: "zero utility", utility_score: 0, confidence: 1.0, createdAt: 0 }),
    makeEntry({ id: "pos", text: "positive utility", utility_score: 1, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result[0]!.id, "pos");
  assert.equal(result[1]!.id, "zero");
});

// Test 6 — undefined utility_score treated as 1 (default)
test("rankLearnings: undefined utility_score treated as 1", () => {
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({ id: "undef", text: "no utility score", confidence: 1.0, createdAt: 0 }), // utility_score undefined
    makeEntry({ id: "two", text: "explicit two", utility_score: 2, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  // undef → score = 1.0 * 1 = 1.0; two → score = 1.0 * 2 = 2.0
  assert.equal(result[0]!.id, "two");
  assert.equal(result[1]!.id, "undef");
});
