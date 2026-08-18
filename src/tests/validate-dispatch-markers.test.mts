// FEAT-263 T1/T5 — <task-scoped> marker balance + keyword confinement gate.
//
// checkMarkerBalance() is the pure, unit-testable core: given a label and a
// text blob, it flags unbalanced/nested <task-scoped> markers and any known
// order-block keyword (FORBIDDEN/GATES/RETURN/ECHO) sitting outside a marked
// region. validateDispatchMarkers() is the higher-level check that exercises
// the real dispatch-template producers (dispatch.mts's
// buildDispatchInstruction, start-slice.mts's wrapLearningsDigestTaskScoped)
// with representative fixture input — this is the "positive" suite (today's
// real templates must pass). Negative cases are asserted directly against
// checkMarkerBalance with hand-built bad input, since the real producers are
// (by construction, post-rewrite) always well-formed.

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  checkMarkerBalance,
  validateDispatchMarkers
} from "../scripts/validate-dispatch-markers.mjs";

// --- positive: real producers ---

test("validateDispatchMarkers: every real dispatch-template fixture is balanced and confined", () => {
  const { ok, results } = validateDispatchMarkers();
  assert.equal(
    ok,
    true,
    `expected all fixtures to pass, got failures: ${JSON.stringify(
      results.filter((r) => !r.ok),
      null,
      2
    )}`
  );
  assert.ok(results.length >= 6, "expected at least one fixture per rewritten producer route");
});

// --- positive: checkMarkerBalance on well-formed input ---

test("checkMarkerBalance: a single well-formed region passes", () => {
  const text = "prose before\n<task-scoped>\nFORBIDDEN: do not do X.\n</task-scoped>\nprose after";
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("checkMarkerBalance: multiple sibling (non-nested) regions pass", () => {
  const text = [
    "<task-scoped>\nFORBIDDEN: one\n</task-scoped>",
    "middle prose",
    "<task-scoped>\nRETURN: two\n</task-scoped>"
  ].join("\n");
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, true);
});

test("checkMarkerBalance: text with no markers at all and no keywords passes", () => {
  const result = checkMarkerBalance("fixture", "just plain prose, nothing scoped here.");
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

// --- negative: unbalanced / nested markers ---

test("checkMarkerBalance: unclosed open marker fails", () => {
  const result = checkMarkerBalance("fixture", "<task-scoped>\nFORBIDDEN: X\n");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("unclosed")));
});

test("checkMarkerBalance: unmatched close marker fails", () => {
  const result = checkMarkerBalance("fixture", "prose\n</task-scoped>\nmore prose");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("unmatched")));
});

test("checkMarkerBalance: nested markers fail", () => {
  const text =
    "<task-scoped>\nFORBIDDEN: outer\n<task-scoped>\nGATES: inner\n</task-scoped>\n</task-scoped>";
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("nested")));
});

// --- negative: keyword leaking outside a marked region ---

test("checkMarkerBalance: a FORBIDDEN label outside any marker fails", () => {
  const text = "FORBIDDEN: this order was never wrapped in a marker.";
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('"FORBIDDEN:"') && e.includes("outside")));
});

test("checkMarkerBalance: a RETURN label outside a marker fails even when another region exists elsewhere", () => {
  const text = [
    "RETURN: leaked order outside any region.",
    "<task-scoped>",
    "GATES: this one is fine.",
    "</task-scoped>"
  ].join("\n");
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('"RETURN:"')));
  // The properly-scoped GATES label must not also be flagged.
  assert.ok(!result.errors.some((e) => e.includes('"GATES:"')));
});

test("checkMarkerBalance: an ECHO label inside a region does not false-positive", () => {
  const text = "<task-scoped>\nECHO: never quote this back.\n</task-scoped>";
  const result = checkMarkerBalance("fixture", text);
  assert.equal(result.ok, true);
});
