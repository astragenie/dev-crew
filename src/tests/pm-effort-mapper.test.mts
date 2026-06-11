// FEAT-167 AC-1: PM effort_estimate → Fibonacci effort_points mapper.

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  mapEffortEstimateToPoints,
  isEffortPoints,
  FIBONACCI_EFFORT_POINTS
} from "../scripts/lib/pm-effort-mapper.mjs";

test("band table — middle of each band maps to the documented point value", () => {
  const cases: [number, number][] = [
    [0.05, 1],
    [0.18, 2],
    [0.32, 3],
    [0.5, 5],
    [0.72, 8],
    [0.92, 13]
  ];
  for (const [input, expected] of cases) {
    assert.equal(
      mapEffortEstimateToPoints(input),
      expected,
      `${input} should map to ${expected} per FEAT-167 AC-1 table`
    );
  }
});

test("band lower boundaries are inclusive", () => {
  assert.equal(mapEffortEstimateToPoints(0.0), 1, "0.0 maps to 1 (first band lower edge)");
  assert.equal(mapEffortEstimateToPoints(0.1), 2);
  assert.equal(mapEffortEstimateToPoints(0.25), 3);
  assert.equal(mapEffortEstimateToPoints(0.4), 5);
  assert.equal(mapEffortEstimateToPoints(0.6), 8);
  assert.equal(mapEffortEstimateToPoints(0.85), 13);
});

test("band upper boundaries are exclusive (just under flips to next band)", () => {
  assert.equal(mapEffortEstimateToPoints(0.09999), 1);
  assert.equal(mapEffortEstimateToPoints(0.24999), 2);
  assert.equal(mapEffortEstimateToPoints(0.39999), 3);
  assert.equal(mapEffortEstimateToPoints(0.59999), 5);
  assert.equal(mapEffortEstimateToPoints(0.84999), 8);
});

test("upper edge x === 1.0 maps to 13 (final band is inclusive on both ends)", () => {
  assert.equal(mapEffortEstimateToPoints(1.0), 13);
  assert.equal(mapEffortEstimateToPoints(0.999), 13);
});

test("out-of-range and non-finite inputs return null", () => {
  assert.equal(mapEffortEstimateToPoints(-0.1), null, "negative input");
  assert.equal(mapEffortEstimateToPoints(1.0001), null, "above 1.0");
  assert.equal(mapEffortEstimateToPoints(NaN), null);
  assert.equal(mapEffortEstimateToPoints(Infinity), null);
  assert.equal(mapEffortEstimateToPoints(-Infinity), null);
  // Type-coercion defence:
  assert.equal(mapEffortEstimateToPoints("0.5" as unknown as number), null);
});

test("isEffortPoints recognises the allowed values and rejects others", () => {
  for (const ok of FIBONACCI_EFFORT_POINTS) assert.ok(isEffortPoints(ok));
  for (const bad of [0, 4, 6, 7, 9, 12, 14, 1.5, -1, NaN, "5", null, undefined]) {
    assert.equal(
      isEffortPoints(bad as unknown),
      false,
      `${String(bad)} must not pass isEffortPoints`
    );
  }
});

test("FIBONACCI_EFFORT_POINTS exports the exact set [1,2,3,5,8,13] in order", () => {
  assert.deepEqual([...FIBONACCI_EFFORT_POINTS], [1, 2, 3, 5, 8, 13]);
});
