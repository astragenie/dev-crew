import { test } from "bun:test";
import assert from "node:assert/strict";

import { parseMention } from "../scripts/lib/gh-mention-parser.mjs";

// ---------------------------------------------------------------------------
// Valid mentions
// ---------------------------------------------------------------------------

test("parseMention returns review intent for '@crew review'", () => {
  const result = parseMention("@crew review");
  assert.deepEqual(result, { intent: "review", body: "" });
});

test("parseMention returns explain intent for '@crew explain'", () => {
  const result = parseMention("@crew explain");
  assert.deepEqual(result, { intent: "explain", body: "" });
});

test("parseMention returns fix intent with body for '@crew fix <text>'", () => {
  const result = parseMention("@crew fix update the authentication logic");
  assert.deepEqual(result, { intent: "fix", body: "update the authentication logic" });
});

test("parseMention is case-insensitive for intent word", () => {
  const result = parseMention("@crew REVIEW");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});

test("parseMention accepts leading whitespace before @crew", () => {
  const result = parseMention("   @crew review");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});

test("parseMention works when @crew mention is mid-comment", () => {
  const text = "Hi team!\n@crew fix please correct the typo\nThanks.";
  const result = parseMention(text);
  assert.ok(result !== null);
  assert.equal(result.intent, "fix");
  assert.equal(result.body, "please correct the typo");
});

test("parseMention sanitizes backticks and quotes from fix body", () => {
  const result = parseMention("@crew fix run `rm -rf /` or 'evil' or \"bad\"");
  assert.ok(result !== null);
  assert.equal(result.intent, "fix");
  // Backticks and quotes stripped; rest preserved
  assert.ok(!result.body.includes("`"));
  assert.ok(!result.body.includes("'"));
  assert.ok(!result.body.includes('"'));
  assert.ok(result.body.includes("run"));
});

// ---------------------------------------------------------------------------
// Invalid / unknown mentions
// ---------------------------------------------------------------------------

test("parseMention returns null for unknown intent '@crew deploy'", () => {
  const result = parseMention("@crew deploy");
  assert.equal(result, null);
});

test("parseMention returns null when no @crew mention present", () => {
  const result = parseMention("This is a regular comment with no mention.");
  assert.equal(result, null);
});

test("parseMention returns null for empty string", () => {
  const result = parseMention("");
  assert.equal(result, null);
});

test("parseMention returns null for non-crew mention '@bot review'", () => {
  const result = parseMention("@bot review");
  assert.equal(result, null);
});

test("parseMention handles @crew with mixed-case prefix '@Crew Review'", () => {
  // The regex is case-insensitive — @Crew and REVIEW both match.
  const result = parseMention("@Crew Review");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});
