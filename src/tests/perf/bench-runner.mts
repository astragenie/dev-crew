#!/usr/bin/env node

// CLI bench-runner: records baseline or compares against it.
//
// Usage:
//   npm run bench
//
// Behaviour:
//   - If .claude/artifacts/loop/perf/baseline.json does NOT exist:
//       runs both benchmarks, writes baseline.json, exits 0.
//   - If baseline.json exists:
//       runs both benchmarks, checks that p50 <= baseline_p50 * 1.10.
//       exits 1 if either command regresses > 10%.

import fs from "node:fs";
import path from "node:path";
import { benchCommand } from "./bench.mjs";

const WARMUP = 5;
const RUNS = 20;

interface BaselineJson {
  brief_p50_ms: number;
  triage_p50_ms: number;
  recorded_at: string;
}

async function main() {
  const repoPath = process.cwd();
  const artifactDir = path.join(repoPath, ".claude", "artifacts", "loop", "perf");
  const baselinePath = path.join(artifactDir, "baseline.json");

  const briefResult = await benchCommand(
    "brief",
    "bun",
    ["src/scripts/loop.mts", "brief", "--repo", repoPath],
    { warmup: WARMUP, runs: RUNS }
  );

  const triageResult = await benchCommand(
    "triage",
    "bun",
    ["src/scripts/loop.mts", "backlog", "list", "--repo", repoPath],
    { warmup: WARMUP, runs: RUNS }
  );

  const results = {
    brief: briefResult,
    triage: triageResult
  };

  console.log(JSON.stringify(results, null, 2));

  // Check if baseline exists
  const baselineExists = fs.existsSync(baselinePath);

  if (!baselineExists) {
    // Record baseline
    fs.mkdirSync(artifactDir, { recursive: true });
    const baseline: BaselineJson = {
      brief_p50_ms: briefResult.p50_ms,
      triage_p50_ms: triageResult.p50_ms,
      recorded_at: new Date().toISOString()
    };
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", "utf8");
    console.log(`\nBaseline recorded at: ${baselinePath}`);
    console.log(`  brief p50: ${briefResult.p50_ms}ms`);
    console.log(`  triage p50: ${triageResult.p50_ms}ms`);
    process.exit(0);
  }

  // Compare against baseline
  const baseline: BaselineJson = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const briefThreshold = baseline.brief_p50_ms * 1.1;
  const triageThreshold = baseline.triage_p50_ms * 1.1;

  const briefPassed = briefResult.p50_ms <= briefThreshold;
  const triagePassed = triageResult.p50_ms <= triageThreshold;

  console.log(`\nRegression gate (baseline × 1.10):`);
  console.log(
    `  brief:  ${briefResult.p50_ms}ms vs ${briefThreshold.toFixed(1)}ms threshold → ${briefPassed ? "PASS" : "FAIL"}`
  );
  console.log(
    `  triage: ${triageResult.p50_ms}ms vs ${triageThreshold.toFixed(1)}ms threshold → ${triagePassed ? "PASS" : "FAIL"}`
  );

  if (!briefPassed || !triagePassed) {
    console.error("\nBench regression gate FAILED — p50 exceeds baseline * 1.10");
    process.exit(1);
  }

  console.log("\nBench gate PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
