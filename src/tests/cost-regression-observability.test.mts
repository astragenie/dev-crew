// FEAT-167 AC-3: cost-regression observability log line shape + behaviour.

import { test } from "bun:test";
import assert from "node:assert/strict";

import { emitObservabilityLog } from "../scripts/lib/cost-regression.mjs";

function captureStderr<T>(fn: () => T): { result: T; lines: string[] } {
  const original = process.stderr.write.bind(process.stderr);
  const lines: string[] = [];
  // Replace write so we can inspect what would have been emitted.
  (process.stderr as any).write = (chunk: any) => {
    lines.push(typeof chunk === "string" ? chunk : String(chunk));
    return true;
  };
  try {
    const result = fn();
    return { result, lines };
  } finally {
    (process.stderr as any).write = original;
  }
}

test("emits a single JSON line per call with the required fields", () => {
  delete process.env.LOOP_DISABLE_COST_REGRESSION_LOG;
  const { lines } = captureStderr(() =>
    emitObservabilityLog({
      mode: "median",
      actualUsd: 91,
      expectedUsd: null,
      medianUsdPerPoint: null,
      effortPoints: null,
      thresholdUsd: 90,
      triggered: true,
      multiplier: 3,
      window: 5,
      sampleCount: 5
    })
  );
  assert.equal(lines.length, 1);
  const trimmed = lines[0]!.trim();
  const parsed = JSON.parse(trimmed);
  assert.equal(parsed.event, "cost-regression-check");
  assert.equal(parsed.mode, "median");
  assert.equal(parsed.actual_usd, 91);
  assert.equal(parsed.expected_usd, null);
  assert.equal(parsed.median_usd_per_point, null);
  assert.equal(parsed.effort_points, null);
  assert.equal(parsed.threshold_usd, 90);
  assert.equal(parsed.triggered, true);
  assert.equal(parsed.multiplier, 3);
  assert.equal(parsed.window, 5);
  assert.equal(parsed.sample_count, 5);
  assert.match(parsed.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test("expected_usd mode populates effort_points + median_usd_per_point", () => {
  delete process.env.LOOP_DISABLE_COST_REGRESSION_LOG;
  const { lines } = captureStderr(() =>
    emitObservabilityLog({
      mode: "expected_usd",
      actualUsd: 150,
      expectedUsd: 130,
      medianUsdPerPoint: 10,
      effortPoints: 13,
      thresholdUsd: 390,
      triggered: false,
      multiplier: 3,
      window: 5,
      sampleCount: 5
    })
  );
  const parsed = JSON.parse(lines[0]!.trim());
  assert.equal(parsed.mode, "expected_usd");
  assert.equal(parsed.expected_usd, 130);
  assert.equal(parsed.median_usd_per_point, 10);
  assert.equal(parsed.effort_points, 13);
  assert.equal(parsed.triggered, false);
});

// (removed) LOOP_DISABLE_COST_REGRESSION_LOG env-var silencer — env var dropped
// in favor of unconditional stderr emission. Callers that need silence should
// spy on process.stderr.write.
test("emitObservabilityLog always writes (env-var silencer removed)", () => {
  const { lines } = captureStderr(() =>
    emitObservabilityLog({
      mode: "median",
      actualUsd: 1,
      expectedUsd: null,
      medianUsdPerPoint: null,
      effortPoints: null,
      thresholdUsd: 1,
      triggered: false,
      multiplier: 3,
      window: 5,
      sampleCount: 5
    })
  );
  assert.equal(lines.length, 1, "emission is unconditional now");
});
