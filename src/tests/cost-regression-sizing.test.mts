// FEAT-167 AC-5 — sizing scenarios. Verbatim from the FEAT spec:
// (1) effort_points=1, median=10, multiplier=3, actual=100 -> threshold=30 -> TRIPS
// (2) effort_points=13, median=10, multiplier=3, actual=150 -> threshold=390 -> NO trip
// Comparison MUST be `>` (not `>=`).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkCostRegression } from "../scripts/lib/cost-regression.mjs";

process.env.LOOP_DISABLE_COST_REGRESSION_LOG = "1";

const COST_DIR_REL = ".claude/artifacts/crew/cost";

async function setupRepo(
  prefix: string,
  currentUsd: number,
  effortPoints: number
): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, COST_DIR_REL), { recursive: true });
  // 3 historical reports, $10 each. Median = $10. (Median doesn't drive
  // expected_usd-mode threshold but sampleCount must >= minSamples=3.)
  for (let i = 0; i < 3; i += 1) {
    const ts = `2026010${i + 1}T000000Z`;
    const slice = `SLICE-${i + 1}`;
    await fs.writeFile(
      path.join(repo, COST_DIR_REL, `${ts}-cost-report-aggregate-${slice.toLowerCase()}.md`),
      [
        "---",
        "kind: cost-report",
        `slice: ${slice}`,
        `run_title: "${slice}"`,
        "usd: 10",
        "aggregate_all: true",
        "source_count: 1",
        "---",
        ""
      ].join("\n")
    );
  }
  // Current report.
  await fs.writeFile(
    path.join(repo, COST_DIR_REL, "20260104T000000Z-cost-report-aggregate-slice-current.md"),
    [
      "---",
      "kind: cost-report",
      "slice: SLICE-current",
      'run_title: "current"',
      `usd: ${currentUsd}`,
      "aggregate_all: true",
      "source_count: 1",
      `effort_points: ${effortPoints}`,
      "---",
      ""
    ].join("\n")
  );
  return repo;
}

const EXPECTED_MODE_CONFIG = {
  loop: { costRegressionMode: "expected_usd", costMedianUsdPerPoint: 10 }
};

test("1-point-hot: effort=1, expected=$10, threshold=$30, actual=$100 -> TRIPS", async () => {
  const repo = await setupRepo("cr-sizing-1pt-", 100, 1);
  const signal = await checkCostRegression(repo, EXPECTED_MODE_CONFIG);
  assert.ok(signal, "must trip when current > threshold");
  assert.equal(signal!.mode, "expected_usd");
  assert.equal(signal!.expectedUsd, 10);
  assert.equal(signal!.thresholdUsd, 30);
  assert.equal(signal!.currentUsd, 100);
});

test("13-point-safe: effort=13, expected=$130, threshold=$390, actual=$150 -> NO trip", async () => {
  const repo = await setupRepo("cr-sizing-13pt-", 150, 13);
  const signal = await checkCostRegression(repo, EXPECTED_MODE_CONFIG);
  assert.equal(signal, null, "large FEAT under expected*multiplier must NOT trip");
});

test("comparison is strict > not >=: actual=$30 exactly equals threshold=$30 -> NO trip", async () => {
  const repo = await setupRepo("cr-sizing-boundary-", 30, 1);
  const signal = await checkCostRegression(repo, EXPECTED_MODE_CONFIG);
  assert.equal(signal, null, "exact-equal to threshold must NOT trip per > comparison");
});
