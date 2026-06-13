import { test } from "bun:test";
import assert from "node:assert/strict";

import { formatReply } from "../scripts/lib/gh-reply-formatter.mjs";

// Test 1 — normal reply within budget
test("formatReply: normal reply contains verdict, summary, and path", () => {
  const result = formatReply("PASS", "Everything looks good", ".claude/artifacts/crew/reviews/abc.md");
  assert.ok(result.includes("PASS"), "should include verdict");
  assert.ok(result.includes("Everything looks good"), "should include summary");
  assert.ok(result.includes(".claude/artifacts/crew/reviews/abc.md"), "should include artifact path");
  assert.ok(result.length <= 1000, `reply must be ≤1000 chars, got ${result.length}`);
});

// Test 2 — summary truncated at 200 chars
test("formatReply: long summary is truncated to 200 chars", () => {
  const longSummary = "x".repeat(500);
  const result = formatReply("FAIL", longSummary, ".claude/artifacts/a.md");
  assert.ok(!result.includes("x".repeat(201)), "summary should not contain more than 200 consecutive x chars");
  assert.ok(result.length <= 1000, `reply must be ≤1000 chars, got ${result.length}`);
});

// Test 3 — very long artifact path still keeps reply ≤1000 chars
test("formatReply: very long artifact path is clamped to 1000 chars total", () => {
  const longPath = ".claude/artifacts/" + "a".repeat(982);
  const result = formatReply("needs-info", "summary", longPath);
  assert.ok(result.length <= 1000, `reply must be ≤1000 chars, got ${result.length}`);
});

// Test 4 — FAIL verdict renders correctly
test("formatReply: FAIL verdict includes correct emoji tag", () => {
  const result = formatReply("FAIL", "Tests failed", ".claude/a.md");
  assert.ok(result.includes("FAIL"), "should include FAIL verdict");
});

// Test 5 — needs-info verdict
test("formatReply: needs-info verdict renders without error", () => {
  const result = formatReply("needs-info", "Need more context", ".claude/a.md");
  assert.ok(result.includes("needs-info"), "should include needs-info verdict");
  assert.ok(result.length <= 1000);
});
