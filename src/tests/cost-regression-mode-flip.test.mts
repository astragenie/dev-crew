// FEAT-167 AC-4 — config-gated transition from median to expected_usd mode.
// Verifies: explicit config wins, auto-flip threshold = 3 done FEATs
// carrying effort_points, no flip below threshold.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  countDoneFeatsWithEffortPoints,
  resolveCostRegressionMode,
  resolveCostMedianUsdPerPoint,
  validateCostRegressionConfig,
  checkCostRegression
} from "../scripts/lib/cost-regression.mjs";

process.env.LOOP_DISABLE_COST_REGRESSION_LOG = "1";

const COST_DIR_REL = ".claude/artifacts/crew/cost";
const DONE_DIR_REL = ".claude/artifacts/loop/backlog/done";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, COST_DIR_REL), { recursive: true });
  await fs.mkdir(path.join(repo, DONE_DIR_REL), { recursive: true });
  return repo;
}

async function writeDoneFeat(
  repo: string,
  id: string,
  effortPoints: number | null
): Promise<void> {
  const fmLines = ["---", `id: ${id}`, "status: done"];
  if (effortPoints !== null) fmLines.push(`effort_points: ${effortPoints}`);
  fmLines.push("---", "", "# Done feat", "");
  await fs.writeFile(path.join(repo, DONE_DIR_REL, `${id}.md`), fmLines.join("\n"));
}

async function writeReport(
  repo: string,
  ts: string,
  slice: string,
  usd: number,
  extra: Record<string, string | number> = {}
): Promise<void> {
  const lines = [
    "---",
    "kind: cost-report",
    `slice: ${slice}`,
    `run_title: "${slice}"`,
    `usd: ${usd}`,
    "aggregate_all: true",
    "source_count: 1",
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`),
    "---",
    "",
    `# ${slice}`,
    ""
  ].join("\n");
  await fs.writeFile(
    path.join(repo, COST_DIR_REL, `${ts}-cost-report-aggregate-${slice.toLowerCase()}.md`),
    lines
  );
}

test("resolveCostRegressionMode: returns valid string or null", () => {
  assert.equal(resolveCostRegressionMode({ loop: { costRegressionMode: "median" } }), "median");
  assert.equal(
    resolveCostRegressionMode({ loop: { costRegressionMode: "expected_usd" } }),
    "expected_usd"
  );
  assert.equal(resolveCostRegressionMode({ loop: { costRegressionMode: "garbage" } }), null);
  assert.equal(resolveCostRegressionMode({ loop: {} }), null);
  assert.equal(resolveCostRegressionMode(null), null);
});

test("resolveCostMedianUsdPerPoint: numbers >= 0 only", () => {
  assert.equal(resolveCostMedianUsdPerPoint({ loop: { costMedianUsdPerPoint: 12.5 } }), 12.5);
  assert.equal(resolveCostMedianUsdPerPoint({ loop: { costMedianUsdPerPoint: 0 } }), 0);
  assert.equal(resolveCostMedianUsdPerPoint({ loop: { costMedianUsdPerPoint: -1 } }), null);
  assert.equal(resolveCostMedianUsdPerPoint({ loop: { costMedianUsdPerPoint: "5" } }), null);
  assert.equal(resolveCostMedianUsdPerPoint(null), null);
});

test("countDoneFeatsWithEffortPoints: returns 0 when backlog dir missing", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "cr-count-missing-"));
  assert.equal(await countDoneFeatsWithEffortPoints(repo), 0);
});

test("countDoneFeatsWithEffortPoints: counts only files with integer effort_points", async () => {
  const repo = await tmpRepo("cr-count-");
  await writeDoneFeat(repo, "FEAT-001", 5);
  await writeDoneFeat(repo, "FEAT-002", 8);
  await writeDoneFeat(repo, "FEAT-003", null);
  await fs.writeFile(path.join(repo, DONE_DIR_REL, "not-a-feat.md"), "---\nid: x\n---\n");
  assert.equal(await countDoneFeatsWithEffortPoints(repo), 2);
});

test("explicit-median-mode: never flips even with 3+ done FEATs carrying effort_points", async () => {
  const repo = await tmpRepo("cr-explicit-median-");
  for (const id of ["FEAT-001", "FEAT-002", "FEAT-003"]) await writeDoneFeat(repo, id, 5);
  // 3 historical + 1 current, all $10 USD. Median = $10. Current = $35.
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // Current carries effort_points: 8 -- if expected_usd kicked in with
  // median=$10 per point and multiplier=3, threshold = 8*10*3 = $240, no trip.
  // In explicit median mode threshold = $10*3 = $30; current $35 trips.
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 35, { effort_points: 8 });
  const config = { loop: { costRegressionMode: "median", costMedianUsdPerPoint: 10 } };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "explicit median should still trip when current > median*multiplier");
  assert.equal(signal!.mode, "median");
  assert.equal(signal!.expectedUsd, null);
  assert.equal(signal!.thresholdUsd, 30);
});

test("explicit-expected-mode: uses effort_points * median_usd_per_point * multiplier", async () => {
  const repo = await tmpRepo("cr-explicit-expected-");
  // 3 historical (no effort_points needed in expected mode).
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // Current: 5 points * $10/point * multiplier 3 = $150 threshold.
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 200, { effort_points: 5 });
  const config = { loop: { costRegressionMode: "expected_usd", costMedianUsdPerPoint: 10 } };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "expected_usd should trip when current > expected*multiplier");
  assert.equal(signal!.mode, "expected_usd");
  assert.equal(signal!.expectedUsd, 50);
  assert.equal(signal!.thresholdUsd, 150);
});

test("auto-flip-at-3-samples: stays median below threshold, flips at >= 3", async () => {
  const repo = await tmpRepo("cr-autoflip-");
  // 3 historical + 1 current.
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // Current at $40 with effort_points 5 + median_usd_per_point 10.
  //   median-mode threshold: 10*3 = 30 -> trips
  //   expected-mode threshold: 5*10*3 = 150 -> does NOT trip
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 40, { effort_points: 5 });
  const config = { loop: { costMedianUsdPerPoint: 10 } };

  // 0 done FEATs with effort_points -> stays median -> trips
  let signal = await checkCostRegression(repo, config);
  assert.ok(signal && signal.mode === "median", "no auto-flip with 0 samples");

  // 2 done FEATs with effort_points -> still below threshold of 3 -> stays median
  await writeDoneFeat(repo, "FEAT-001", 5);
  await writeDoneFeat(repo, "FEAT-002", 8);
  signal = await checkCostRegression(repo, config);
  assert.ok(signal && signal.mode === "median", "no auto-flip with 2 samples");

  // 3 done FEATs -> auto-flip to expected_usd -> no trip
  await writeDoneFeat(repo, "FEAT-003", 13);
  signal = await checkCostRegression(repo, config);
  assert.equal(signal, null, "expected_usd mode does not trip when actual < threshold");
});

test("expected mode falls back to median when current report lacks effort_points", async () => {
  const repo = await tmpRepo("cr-expected-no-effort-");
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // Current has no effort_points -> degrade gracefully.
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 35);
  const config = { loop: { costRegressionMode: "expected_usd", costMedianUsdPerPoint: 10 } };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "fallback to median should still trip when current > median*multiplier");
  assert.equal(signal!.mode, "median");
  assert.equal(signal!.expectedUsd, null);
});

test("validateCostRegressionConfig: accepts valid + missing values", () => {
  assert.deepEqual(validateCostRegressionConfig(null), []);
  assert.deepEqual(validateCostRegressionConfig({}), []);
  assert.deepEqual(validateCostRegressionConfig({ loop: {} }), []);
  assert.deepEqual(
    validateCostRegressionConfig({ loop: { costRegressionMode: "median" } }),
    []
  );
  assert.deepEqual(
    validateCostRegressionConfig({
      loop: { costRegressionMode: "expected_usd", costMedianUsdPerPoint: 12.5 }
    }),
    []
  );
  assert.deepEqual(
    validateCostRegressionConfig({ loop: { costRegressionMode: null, costMedianUsdPerPoint: null } }),
    []
  );
});

test("validateCostRegressionConfig: rejects bad mode", () => {
  const errs = validateCostRegressionConfig({ loop: { costRegressionMode: "garbage" } });
  assert.equal(errs.length, 1);
  assert.match(errs[0]!, /costRegressionMode/);
  assert.match(errs[0]!, /"garbage"/);
});

test("validateCostRegressionConfig: rejects negative bootstrap median", () => {
  const errs = validateCostRegressionConfig({ loop: { costMedianUsdPerPoint: -5 } });
  assert.equal(errs.length, 1);
  assert.match(errs[0]!, /costMedianUsdPerPoint/);
});

test("validateCostRegressionConfig: rejects non-number bootstrap median", () => {
  const errs = validateCostRegressionConfig({ loop: { costMedianUsdPerPoint: "10" } });
  assert.equal(errs.length, 1);
});

test("expected mode falls back to median when costMedianUsdPerPoint is missing", async () => {
  const repo = await tmpRepo("cr-expected-no-bootstrap-");
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 35, { effort_points: 5 });
  const config = { loop: { costRegressionMode: "expected_usd" } };
  const signal = await checkCostRegression(repo, config);
  assert.ok(signal, "no bootstrap median should fall back to median mode");
  assert.equal(signal!.mode, "median");
});
