// Tests for the SLICE-52 aggregate cost regression gate.
// Covers: computeRollingMedian edge cases, checkCostRegression threshold
// boundary, missing-report fail-open, and stop-check integration.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  computeRollingMedian,
  loadAggregateCostReport
} from "../scripts/lib/cost-alert-loader.mjs";
import { checkCostRegression } from "../scripts/lib/cost-regression.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true });
  // Seed a pending FEAT so backlog-exhausted does not trip tests.
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---\nid: FEAT-001\nstatus: pending\n---\n# Test Feature\n`
  );
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      }
    })
  );
  return repo;
}

/**
 * Write an aggregate cost report. timestamp must sort correctly
 * (e.g. "20260601T100000Z" < "20260602T100000Z").
 */
async function writeAggregateReport(
  repo: string,
  timestamp: string,
  slice: string,
  usd: number | null,
  extra: Record<string, string | number | boolean> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  const filename = `${timestamp}-cost-report-aggregate-${slice.toLowerCase()}.md`;
  const filepath = path.join(dir, filename);
  const lines = [
    "---",
    "kind: cost-report",
    `slice: ${slice}`,
    `run_title: "${slice} run"`,
    ...(usd !== null ? [`usd: ${usd}`] : []),
    "aggregate_all: true",
    `source_count: 2`,
    `created_at: ${timestamp.replace("T", "-").replace("Z", ":00.000Z")}`,
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`),
    "---",
    "",
    `# Aggregate Cost Report: ${slice}`,
    ""
  ].join("\n");
  await fs.writeFile(filepath, lines);
  return filepath;
}

// ---------------------------------------------------------------------------
// computeRollingMedian unit tests
// ---------------------------------------------------------------------------

test("computeRollingMedian: 5 historical + 1 current — median over 5", async () => {
  // reports[0] = current (excluded), reports[1..5] = historical
  const reports = [
    { usd: 100, path: "p0" }, // current — excluded
    { usd: 80, path: "p1" },
    { usd: 60, path: "p2" },
    { usd: 40, path: "p3" },
    { usd: 20, path: "p4" },
    { usd: 10, path: "p5" }
  ] as any[];
  const result = computeRollingMedian({ reports, window: 5 });
  // historical USD (newest-first): 80, 60, 40, 20, 10
  // sorted ascending: 10, 20, 40, 60, 80 → median = 40
  assert.equal(result.sampleCount, 5);
  assert.equal(result.median, 40);
  assert.deepEqual(result.sampleValues, [80, 60, 40, 20, 10]);
});

test("computeRollingMedian: 3 historical + 1 current — fallback to median over 3", async () => {
  const reports = [
    { usd: 200, path: "p0" }, // current
    { usd: 30, path: "p1" },
    { usd: 10, path: "p2" },
    { usd: 50, path: "p3" }
  ] as any[];
  const result = computeRollingMedian({ reports, window: 5 });
  // historical: 30, 10, 50 → sorted: 10, 30, 50 → median = 30
  assert.equal(result.sampleCount, 3);
  assert.equal(result.median, 30);
});

test("computeRollingMedian: 1 historical + 1 current — median over 1 (degenerate)", async () => {
  const reports = [
    { usd: 200, path: "p0" }, // current
    { usd: 50, path: "p1" } // only historical
  ] as any[];
  const result = computeRollingMedian({ reports, window: 5 });
  assert.equal(result.sampleCount, 1);
  assert.equal(result.median, 50);
});

test("computeRollingMedian: 0 historical + 1 current — single-report fallback returns null", async () => {
  const reports = [{ usd: 200, path: "p0" }] as any[]; // only current
  const result = computeRollingMedian({ reports, window: 5 });
  assert.equal(result.sampleCount, 0);
  assert.equal(result.median, null);
  assert.deepEqual(result.sampleValues, []);
});

test("computeRollingMedian: skips null USD entries in historical window", async () => {
  const reports = [
    { usd: 100, path: "p0" }, // current
    { usd: null, path: "p1" }, // null — excluded from median
    { usd: 40, path: "p2" },
    { usd: 60, path: "p3" }
  ] as any[];
  const result = computeRollingMedian({ reports, window: 5 });
  // Only 2 parseable values: 40, 60 → median = 50
  assert.equal(result.sampleCount, 2);
  assert.equal(result.median, 50);
});

// ---------------------------------------------------------------------------
// checkCostRegression threshold boundary tests
// ---------------------------------------------------------------------------

test("checkCostRegression: currentUsd === median × multiplier exactly — does NOT halt (>)", async () => {
  const repo = await tmpRepo("cr-exactly-");
  // Historical: 10, 20, 30, 40, 50 → sorted → median = 30. threshold = 90 (3×30).
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 90 exactly (= 3 × 30) — should NOT trigger
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 90);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "exact threshold should NOT halt (> not >=)");
});

test("checkCostRegression: sampleCount < minSamples — gate stays dormant (n=2 false-trip fix)", async () => {
  // Regression: with sampleCount=2, a single $1500 retro batch sets the
  // median and every subsequent normal slice trips the gate. Gate must
  // stay dormant until at least minSamples historical reports exist.
  const repo = await tmpRepo("cr-min-samples-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 1500);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 50);
  // current = 1000 — would trigger at 3 × 775 = 2325? No — 3 × ((1500+50)/2)=2325.
  // Drop to 200 to make halting obvious if gate were active.
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 1000);

  const config = {
    loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0, costRegressionMinSamples: 3 }
  };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "gate must stay dormant when sampleCount < minSamples");
});

test("checkCostRegression: sampleCount >= minSamples — gate active again", async () => {
  const repo = await tmpRepo("cr-min-samples-active-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 10);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 10);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 100);

  const config = {
    loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0, costRegressionMinSamples: 3 }
  };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "gate should fire once minSamples threshold met");
  assert.equal(signal!.sampleCount, 3);
});

test("checkCostRegression: default minSamples=3 — n=2 history skips the gate (regression)", async () => {
  // No config — falls back to DEFAULT_COST_REGRESSION_MIN_SAMPLES (3).
  const repo = await tmpRepo("cr-default-min-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 50);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 1500);

  const signal = await checkCostRegression(repo, null);
  assert.equal(signal, null, "default minSamples=3 should suppress gate with only 2 samples");
});

test("checkCostRegression: currentUsd slightly above threshold — halts", async () => {
  const repo = await tmpRepo("cr-above-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 90.01 (just over 3 × 30) — should trigger
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 90.01);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "should return signal when current > threshold");
  assert.equal(signal!.triggered, true);
  assert.ok(signal!.currentUsd > signal!.thresholdUsd, "current must be above threshold");
  assert.equal(signal!.medianUsd, 30);
  assert.equal(signal!.thresholdUsd, 90);
  assert.equal(signal!.multiplier, 3.0);
  assert.equal(signal!.sampleCount, 5);
});

test("checkCostRegression: currentUsd slightly below threshold — does NOT halt", async () => {
  const repo = await tmpRepo("cr-below-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 89.99 (just under 3 × 30) — should NOT trigger
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 89.99);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "just under threshold should NOT halt");
});

test("checkCostRegression: aggregate directory missing — returns null (fail-open)", async () => {
  const repo = await tmpRepo("cr-no-dir-");
  // Remove the cost dir so it doesn't exist
  await fs.rm(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true, force: true });

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "missing directory should fail-open");
});

test("checkCostRegression: current report usd frontmatter missing — returns null (fail-open)", async () => {
  const repo = await tmpRepo("cr-no-usd-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 30);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 40);
  // current report has no usd field
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", null);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "missing usd in current report should fail-open");
});

test("checkCostRegression: single-report fallback (no history) — returns null", async () => {
  const repo = await tmpRepo("cr-single-");
  // Only one report — current, no history
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 500);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "single-report state should fail-open");
});

test("checkCostRegression: uses default window=5 and multiplier=3.0 when config omits fields", async () => {
  const repo = await tmpRepo("cr-defaults-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 91 > 30 × 3.0 = 90 → should trigger with defaults
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 91);

  // config with no costRegressionWindow / costRegressionMultiplier
  const config = { loop: {} };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "should trigger with default window/multiplier");
  assert.equal(signal!.window, 5, "window default should be 5");
  assert.equal(signal!.multiplier, 3.0, "multiplier default should be 3.0");
});

test("checkCostRegression: non-aggregate reports are ignored (filename/frontmatter filter)", async () => {
  const repo = await tmpRepo("cr-ignore-non-agg-");
  const dir = path.join(repo, ".claude/artifacts/crew/cost");

  // Write a non-aggregate report (no aggregate_all frontmatter)
  await fs.writeFile(
    path.join(dir, "20260601T100000Z-cost-report-slice-slice-01.md"),
    `---\nkind: cost-report\nslice: SLICE-01\nusd: 500\n---\n`
  );
  // Write a proper aggregate report as current
  await writeAggregateReport(repo, "20260601T200000Z", "SLICE-02", 50);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const signal = await checkCostRegression(repo, config);
  // Only 1 aggregate report (current), no history → single-report fallback → null
  assert.equal(signal, null, "non-aggregate reports must not be included");
});

// ---------------------------------------------------------------------------
// loadAggregateCostReport unit tests
// ---------------------------------------------------------------------------

test("loadAggregateCostReport: returns empty set when cost dir missing", async () => {
  const repo = await tmpRepo("cr-load-empty-");
  await fs.rm(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true, force: true });

  const result = await loadAggregateCostReport(repo);
  assert.equal(result.current, null);
  assert.deepEqual(result.reports, []);
});

test("loadAggregateCostReport: returns most-recent report as current", async () => {
  const repo = await tmpRepo("cr-load-current-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 20);
  await writeAggregateReport(repo, "20260602T100000Z", "SLICE-02", 40);

  const result = await loadAggregateCostReport(repo);
  assert.ok(result.current, "should have a current report");
  assert.equal(result.current!.slice, "SLICE-02");
  assert.equal(result.current!.usd, 40);
  assert.equal(result.current!.aggregateAll, true);
});

test("loadAggregateCostReport: sorts reports newest-first", async () => {
  const repo = await tmpRepo("cr-load-sort-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260603T100000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260602T100000Z", "SLICE-02", 20);

  const result = await loadAggregateCostReport(repo);
  assert.equal(result.reports.length, 3);
  assert.equal(result.reports[0].slice, "SLICE-03");
  assert.equal(result.reports[1].slice, "SLICE-02");
  assert.equal(result.reports[2].slice, "SLICE-01");
});

test("loadAggregateCostReport: respects limit option", async () => {
  const repo = await tmpRepo("cr-load-limit-");
  for (let i = 1; i <= 8; i++) {
    const ts = `20260601T${String(i).padStart(2, "0")}0000Z`;
    await writeAggregateReport(repo, ts, `SLICE-${String(i).padStart(2, "0")}`, i * 10);
  }

  const result = await loadAggregateCostReport(repo, { limit: 4 });
  assert.equal(result.reports.length, 4);
});

// ---------------------------------------------------------------------------
// checkStopConditions integration: cost_regression_stop in reasons[]
// ---------------------------------------------------------------------------

test("checkStopConditions: stops with cost_regression_stop when regression triggered", async () => {
  const repo = await tmpRepo("cr-stop-check-");
  // Historical: median = 30 (values: 10, 20, 30, 40, 50)
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 91 (> 3 × 30 = 90)
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 91);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const result = await checkStopConditions(repo, { config });

  assert.equal(result.shouldStop, true, "should stop on cost regression");
  const regressionReason = result.reasons.find((r: string) => r.includes("cost_regression_stop"));
  assert.ok(regressionReason, "should include cost_regression_stop in reasons");
  assert.match(regressionReason as string, /\$91/);
  assert.match(regressionReason as string, /\$30/); // median
  assert.ok(
    result.blockers.some((b: any) => b.category === "cost-regression"),
    "should add cost-regression blocker"
  );
  assert.ok(
    result.snapshot.costRegression !== null && result.snapshot.costRegression !== undefined,
    "snapshot.costRegression should be non-null"
  );
  assert.equal(result.snapshot.costRegression?.triggered, true);
  assert.equal(result.snapshot.costRegression?.currentUsd, 91);
  assert.equal(result.snapshot.costRegression?.medianUsd, 30);
  assert.equal(result.snapshot.costRegression?.thresholdUsd, 90);
});

test("checkStopConditions: does NOT stop on cost regression when below threshold", async () => {
  const repo = await tmpRepo("cr-stop-check-no-");
  await writeAggregateReport(repo, "20260601T100000Z", "SLICE-01", 10);
  await writeAggregateReport(repo, "20260601T110000Z", "SLICE-02", 20);
  await writeAggregateReport(repo, "20260601T120000Z", "SLICE-03", 30);
  await writeAggregateReport(repo, "20260601T130000Z", "SLICE-04", 40);
  await writeAggregateReport(repo, "20260601T140000Z", "SLICE-05", 50);
  // current = 89 (< 3 × 30 = 90) → no trigger
  await writeAggregateReport(repo, "20260601T150000Z", "SLICE-06", 89);

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const result = await checkStopConditions(repo, { config });

  const hasRegressionReason = result.reasons.some((r: string) =>
    r.includes("cost_regression_stop")
  );
  assert.equal(hasRegressionReason, false, "should not have cost_regression_stop reason");
  assert.equal(result.snapshot.costRegression, null, "snapshot.costRegression should be null");
});

test("checkStopConditions: fail-open when no aggregate reports — does not stop", async () => {
  const repo = await tmpRepo("cr-stop-check-fail-open-");
  // No aggregate reports written

  const config = { loop: { costRegressionWindow: 5, costRegressionMultiplier: 3.0 } };
  const result = await checkStopConditions(repo, { config });

  const hasRegressionReason = result.reasons.some((r: string) =>
    r.includes("cost_regression_stop")
  );
  assert.equal(hasRegressionReason, false, "should not stop when no aggregate reports");
  assert.equal(result.snapshot.costRegression, null, "snapshot.costRegression should be null");
});
