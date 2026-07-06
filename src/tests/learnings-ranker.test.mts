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
    makeEntry({
      id: "high",
      text: "high utility",
      utility_score: 5,
      confidence: 1.0,
      createdAt: 0
    }),
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
    makeEntry({
      id: "no-match",
      text: "something else entirely",
      utility_score: 2,
      confidence: 1.0,
      createdAt: 0
    }),
    makeEntry({
      id: "match",
      text: "decay confidence ranking boost",
      utility_score: 2,
      confidence: 1.0,
      createdAt: 0
    })
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
    makeEntry({
      id: "zero",
      text: "zero utility",
      utility_score: 0,
      confidence: 1.0,
      createdAt: 0
    }),
    makeEntry({
      id: "pos",
      text: "positive utility",
      utility_score: 1,
      confidence: 1.0,
      createdAt: 0
    })
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

// Test 7 — --limit post-rank: slice after ranking returns top-N by score, not first-N by insertion
test("rankLearnings + limit: post-rank slice returns top-N by score", () => {
  const nowMs = 0;
  // Insert in ascending utility order; only the top 2 by score should appear with limit=2
  const entries: LearningEntry[] = [
    makeEntry({
      id: "score1",
      text: "lowest score",
      utility_score: 1,
      confidence: 1.0,
      createdAt: 0
    }),
    makeEntry({ id: "score3", text: "mid score", utility_score: 3, confidence: 1.0, createdAt: 0 }),
    makeEntry({
      id: "score9",
      text: "highest score",
      utility_score: 9,
      confidence: 1.0,
      createdAt: 0
    }),
    makeEntry({
      id: "score5",
      text: "fourth score",
      utility_score: 5,
      confidence: 1.0,
      createdAt: 0
    })
  ];
  // Rank all, then slice to 2 (mimics the CLI --limit behaviour)
  const ranked = rankLearnings(entries, { nowMs }).slice(0, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]!.id, "score9", "highest utility should rank first");
  assert.equal(ranked[1]!.id, "score5", "second highest should be second");
});

// --- FEAT-220: status/expires_at gating (AC-3, AC-4) ---

test("rankLearnings: status=rejected entries are excluded", () => {
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({ id: "kept", text: "kept entry", utility_score: 1, confidence: 1.0, createdAt: 0 }),
    makeEntry({
      id: "rejected",
      text: "rejected entry",
      utility_score: 10,
      confidence: 1.0,
      createdAt: 0,
      status: "rejected"
    })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result.length, 1);
  assert.equal(result[0]!.id, "kept");
});

test("rankLearnings: status=validated ranks above an otherwise-equal candidate", () => {
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({
      id: "candidate",
      text: "same text length",
      utility_score: 2,
      confidence: 1.0,
      createdAt: 0,
      status: "candidate"
    }),
    makeEntry({
      id: "validated",
      text: "same text length",
      utility_score: 2,
      confidence: 1.0,
      createdAt: 0,
      status: "validated"
    })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(
    result[0]!.id,
    "validated",
    "validated must rank above an otherwise-equal candidate"
  );
  assert.equal(result[1]!.id, "candidate");
});

test("rankLearnings: status=promoted ranks above an otherwise-equal candidate", () => {
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({ id: "candidate", text: "x", utility_score: 2, confidence: 1.0, createdAt: 0 }),
    makeEntry({
      id: "promoted",
      text: "x",
      utility_score: 2,
      confidence: 1.0,
      createdAt: 0,
      status: "promoted"
    })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result[0]!.id, "promoted");
});

test("rankLearnings: entry with a past expires_at is dropped", () => {
  const nowMs = Date.parse("2026-07-01T00:00:00.000Z");
  const entries: LearningEntry[] = [
    makeEntry({
      id: "expired",
      text: "stale learning",
      utility_score: 10,
      confidence: 1.0,
      createdAt: 0,
      expires_at: "2026-06-01T00:00:00.000Z"
    }),
    makeEntry({ id: "fresh", text: "still valid", utility_score: 1, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result.length, 1);
  assert.equal(result[0]!.id, "fresh");
});

test("rankLearnings: entry with a future expires_at is retained", () => {
  const nowMs = Date.parse("2026-07-01T00:00:00.000Z");
  const entries: LearningEntry[] = [
    makeEntry({
      id: "not-yet-expired",
      text: "still valid",
      utility_score: 1,
      confidence: 1.0,
      createdAt: 0,
      expires_at: "2027-01-01T00:00:00.000Z"
    })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result.length, 1);
  assert.equal(result[0]!.id, "not-yet-expired");
});

test("rankLearnings: absent status/expires_at preserves pre-FEAT-220 ordering exactly", () => {
  // Regression guard for AC-1: entries with neither field behave identically
  // to the pre-FEAT-220 ranker (no drop, no boost) — same assertions as the
  // "ordered by composite score descending" test above, unaffected by the
  // new gates.
  const nowMs = 0;
  const entries: LearningEntry[] = [
    makeEntry({ id: "low", text: "low utility", utility_score: 1, confidence: 1.0, createdAt: 0 }),
    makeEntry({
      id: "high",
      text: "high utility",
      utility_score: 5,
      confidence: 1.0,
      createdAt: 0
    }),
    makeEntry({ id: "mid", text: "mid utility", utility_score: 3, confidence: 1.0, createdAt: 0 })
  ];
  const result = rankLearnings(entries, { nowMs });
  assert.equal(result[0]!.id, "high");
  assert.equal(result[1]!.id, "mid");
  assert.equal(result[2]!.id, "low");
});
