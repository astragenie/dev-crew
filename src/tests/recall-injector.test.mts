// Tests for src/scripts/lib/recall-injector.mts

import { test } from "bun:test";
import assert from "node:assert/strict";

import { formatRecallBlock } from "../scripts/lib/recall-injector.mjs";
import type { RecallResult } from "../scripts/lib/memory-recall.mjs";

// ---------------------------------------------------------------------------
// Empty array → empty string
// ---------------------------------------------------------------------------

test("formatRecallBlock returns empty string for empty array", () => {
  const result = formatRecallBlock([]);
  assert.equal(result, "");
});

// ---------------------------------------------------------------------------
// K-item formatting with importance ordering
// ---------------------------------------------------------------------------

test("formatRecallBlock sorts by importance descending and renders header", () => {
  const memories: RecallResult[] = [
    { type: "lesson", content: "Low priority lesson.", importance: 0.3 },
    { type: "decision", content: "High priority decision.", importance: 0.9 },
    { type: "insight", content: "Mid priority insight.", importance: 0.6 }
  ];
  const result = formatRecallBlock(memories);

  assert.ok(result.startsWith("## Prior context (from astramem)"), "should start with header");

  // High importance should appear before low importance in the output.
  const decisionPos = result.indexOf("High priority decision.");
  const lessonPos = result.indexOf("Low priority lesson.");
  assert.ok(decisionPos < lessonPos, "high importance entry should appear first");

  // All items should be present.
  assert.ok(result.includes("insight"), "should include all type labels");
});

// ---------------------------------------------------------------------------
// Truncation at 200 chars
// ---------------------------------------------------------------------------

test("formatRecallBlock truncates content body to 200 chars with ellipsis", () => {
  const longContent = "A".repeat(250);
  const memories: RecallResult[] = [{ type: "fact", content: longContent }];
  const result = formatRecallBlock(memories);

  // The block must contain truncated content with ellipsis.
  assert.ok(result.includes("..."), "truncated content must end with ellipsis");
  // Must NOT contain the full 250-char string.
  assert.ok(!result.includes("A".repeat(201)), "content must be truncated at 200 chars");
  // Must contain exactly 200 A's followed by ...
  assert.ok(result.includes("A".repeat(200) + "..."), "must have 200 A's + ...");
});

// ---------------------------------------------------------------------------
// Type label appears in formatted block
// ---------------------------------------------------------------------------

test("formatRecallBlock includes type label and score in bullet prefix", () => {
  const memories: RecallResult[] = [
    { type: "decision", content: "Use ESM only.", score: 0.75 },
    { type: "lesson", content: "Keep complexity ≤15.", importance: 0.88 }
  ];
  const result = formatRecallBlock(memories);

  // Labels include type name and numeric score/importance.
  assert.ok(result.includes("[decision"), "should show 'decision' type");
  assert.ok(result.includes("0.75"), "should show score for decision entry");
  assert.ok(result.includes("[lesson"), "should show 'lesson' type");
  assert.ok(result.includes("0.88"), "should show importance for lesson entry");
});

// ---------------------------------------------------------------------------
// Slice id prefix when present
// ---------------------------------------------------------------------------

test("formatRecallBlock prepends slice_id when present", () => {
  const memories: RecallResult[] = [
    { type: "lesson", content: "Don't skip review.", slice_id: "SLICE-79", importance: 0.8 }
  ];
  const result = formatRecallBlock(memories);
  assert.ok(result.includes("SLICE-79"), "should include slice_id as origin prefix");
});

// ---------------------------------------------------------------------------
// Falls back to score when importance is absent
// ---------------------------------------------------------------------------

test("formatRecallBlock uses score field when importance is absent", () => {
  const memories: RecallResult[] = [{ type: "insight", content: "Short body.", score: 0.55 }];
  const result = formatRecallBlock(memories);
  assert.ok(result.includes("0.55"), "should show score when importance absent");
});
