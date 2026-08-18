import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import {
  checkSliceCostCeiling,
  DEFAULT_SLICE_COST_CEILING_USD
} from "../scripts/lib/slice-cost-ceiling.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true });
  // Seed a pending FEAT so backlog-exhausted does not trip the test
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---
id: FEAT-001
status: pending
---
# Test Feature
`
  );
  return repo;
}

async function writeCostReport(
  repo: string,
  timestamp: string,
  slice: string,
  usd: number,
  { aggregate = false } = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const namePart = aggregate ? "cost-report-aggregate" : "cost-report-slice";
  const filename = `${timestamp}-${namePart}-${slice.toLowerCase()}.md`;
  const filepath = path.join(dir, filename);
  const fm = [
    "---",
    "kind: cost-report",
    `slice: ${slice}`,
    `run_title: "${slice} test run"`,
    `usd: ${usd}`,
    `aggregate_all: ${aggregate}`,
    "---",
    "",
    `# Cost Report: ${slice}`,
    `Total USD: $${usd}`,
    ""
  ].join("\n");
  await fs.writeFile(filepath, fm);
  return filepath;
}

// AC-6 path 1: exceeded — actual > ceiling → stop signal fires.
test("checkSliceCostCeiling flags exceeded when latest report USD > ceiling", async () => {
  const repo = await tmpRepo("scc-exceeded-");
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 400.21);

  const config = { loop: { costSliceCeiling: 75 } };
  const signal = await checkSliceCostCeiling(repo, config);

  assert.ok(signal, "should return signal when ceiling exceeded");
  assert.equal(signal!.exceeded, true);
  assert.equal(signal!.actualUsd, 400.21);
  assert.equal(signal!.ceilingUsd, 75);
  assert.equal(signal!.slice, "SLICE-36");
});

test("checkStopConditions stops with [HIGH] slice-cost-ceiling:exceeded reason", async () => {
  const repo = await tmpRepo("scc-stop-exceeded-");
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 400.21);

  const config = { loop: { costSliceCeiling: 75 } };
  const result = await checkStopConditions(repo, { config });

  assert.equal(result.shouldStop, true, "should stop when ceiling exceeded");
  const ceilingReason = result.reasons.find((r: string) =>
    r.includes("slice-cost-ceiling:exceeded")
  );
  assert.ok(ceilingReason, "should include slice-cost-ceiling:exceeded reason");
  assert.match(ceilingReason as string, /\$400\.21/);
  assert.match(ceilingReason as string, /\$75/);
  assert.ok(
    result.blockers.some((b: any) => b.category === "slice-cost-ceiling"),
    "should add slice-cost-ceiling blocker"
  );
  assert.equal(result.snapshot.sliceCostCeiling?.exceeded, true);
  assert.equal(result.snapshot.sliceCostCeiling?.actualUsd, 400.21);
  assert.equal(result.snapshot.sliceCostCeiling?.ceilingUsd, 75);
});

// AC-6 path 2: not exceeded — actual <= ceiling → no signal.
test("checkSliceCostCeiling returns null when latest report USD <= ceiling", async () => {
  const repo = await tmpRepo("scc-not-exceeded-");
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 42.5);

  const config = { loop: { costSliceCeiling: 75 } };
  const signal = await checkSliceCostCeiling(repo, config);

  assert.equal(signal, null, "should return null when actual <= ceiling");
});

test("checkStopConditions does not stop on cost-ceiling when latest report under ceiling", async () => {
  const repo = await tmpRepo("scc-under-ceiling-");
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 42.5);

  const config = { loop: { costSliceCeiling: 75 } };
  const result = await checkStopConditions(repo, { config });

  assert.equal(
    result.reasons.some((r: string) => r.includes("slice-cost-ceiling")),
    false,
    "should not include slice-cost-ceiling in reasons when under ceiling"
  );
  assert.equal(result.snapshot.sliceCostCeiling, null);
});

// AC-6 path 3: no ceiling config — default kicks in.
test("checkSliceCostCeiling uses DEFAULT_SLICE_COST_CEILING_USD when config omits costSliceCeiling", async () => {
  const repo = await tmpRepo("scc-default-ceiling-");
  // Under default ceiling ($75): no signal.
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 25.0);

  const config = { loop: {} };
  const signalUnder = await checkSliceCostCeiling(repo, config);
  assert.equal(signalUnder, null, "$25 spend should not breach $75 default ceiling");

  // Now seed a newer report that breaches the default ceiling.
  await writeCostReport(repo, "20260604T220000Z", "SLICE-37", 90.0);
  const signalOver = await checkSliceCostCeiling(repo, config);
  assert.ok(signalOver, "$90 spend should breach $75 default ceiling");
  assert.equal(signalOver!.ceilingUsd, DEFAULT_SLICE_COST_CEILING_USD);
  assert.equal(signalOver!.actualUsd, 90);
});

test("checkSliceCostCeiling ignores aggregate cost reports", async () => {
  const repo = await tmpRepo("scc-ignore-aggregate-");
  // Aggregate report (newer timestamp) should be skipped.
  await writeCostReport(repo, "20260604T220000Z", "SLICE-37", 999.99, { aggregate: true });
  // Per-slice report (older timestamp) under ceiling.
  await writeCostReport(repo, "20260604T201256Z", "SLICE-36", 42.5);

  const config = { loop: { costSliceCeiling: 75 } };
  const signal = await checkSliceCostCeiling(repo, config);
  assert.equal(
    signal,
    null,
    "should ignore aggregate report and check per-slice (which is under ceiling)"
  );
});

test("checkSliceCostCeiling returns null when no cost reports exist", async () => {
  const repo = await tmpRepo("scc-no-reports-");
  const config = { loop: { costSliceCeiling: 75 } };
  const signal = await checkSliceCostCeiling(repo, config);
  assert.equal(signal, null, "should return null when no reports exist");
});
