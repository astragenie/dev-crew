// generate-metrics-band.test.mts — W4.2 README dogfood metrics band.
//
// Every number the generator emits must trace to an on-disk artifact (plan
// hard rule, docs/superpowers/plans/2026-07-18-improvement-plan-audit-wave.md
// W4.2). These tests build a small fixture repo with known backlog/grade/
// cost/halt-badge/CI-gate content and assert the generator's output is a
// deterministic function of that content — plus that `--check` (folded into
// this file's `checkMetricsBandFreshness`, see the module header for why
// there is no separate validate-metrics-band.mts) catches drift the same way
// validate-snapshot-freshness.mts does for loop-snapshot.md.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  METRICS_BAND_START,
  METRICS_BAND_END,
  DEMO_RECORDING_PLACEHOLDER,
  collectMetricsBandData,
  renderMetricsBand,
  generateMetricsBandContent,
  insertBandIntoReadme,
  writeMetricsBand,
  checkMetricsBandFreshness,
  median,
  mean
} from "../scripts/generate-metrics-band.mjs";
import { loadCostReportUSDValues } from "../scripts/lib/memory-snapshot.mjs";
import { clearAll } from "../scripts/lib/cache.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeDoneFeat(
  repo: string,
  id: string,
  { completedAt, slices }: { completedAt: string; slices: string[] }
): Promise<void> {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog/done");
  await fs.mkdir(dir, { recursive: true });
  const content = `---
id: ${id}
status: done
priority: P2
category: feature
slices: [${slices.join(", ")}]
completed_at: ${completedAt}
---

# ${id}: fixture
`;
  await fs.writeFile(path.join(dir, `${id}.md`), content);
}

async function writeGrade(
  repo: string,
  sliceId: string,
  featureId: string,
  composite: number
): Promise<void> {
  const dir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${sliceId}-grade.md`;
  const content = `---
slice: ${sliceId}
feature: ${featureId}
---

## Scores

- architecture_quality: ${composite}
- reliability: ${composite}
- observability: ${composite}
- production_readiness: ${composite}
- security: ${composite}
- test_confidence: ${composite}
- product_completeness: ${composite}
`;
  await fs.writeFile(path.join(dir, filename), content);
}

async function writeCostReport(repo: string, name: string, usd: number): Promise<void> {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const content = `---
kind: cost-report
usd: ${usd}
---

# Cost Report
`;
  await fs.writeFile(path.join(dir, `${name}-cost-report-${name}.md`), content);
}

async function writeHaltBadgesFixture(repo: string, registryCount: number, waveRowCount: number) {
  const lines = ["# Halt-badge registry", ""];
  for (let i = 0; i < registryCount; i++) {
    lines.push(`### \`snapshot.fixtureBadge${i}\``, "", "**Shape:** fixture", "");
  }
  lines.push("## Wave-mode badges", "", "| Badge | Severity | Description |", "|---|---|---|");
  for (let i = 0; i < waveRowCount; i++) {
    lines.push(`| \`fixture_wave_badge_${i}\` | info | fixture row |`);
  }
  lines.push("", "## References", "", "- fixture");
  await fs.mkdir(path.join(repo, "docs"), { recursive: true });
  await fs.writeFile(path.join(repo, "docs", "halt-badges.md"), lines.join("\n"));
}

async function writeClaudeMdFixture(repo: string, gateCount: number) {
  const lines = ["# fixture repo", "", "## CI gates", ""];
  for (let i = 1; i <= gateCount; i++) {
    lines.push(`${i}. \`bun ./src/scripts/fixture-gate-${i}.mts\``);
  }
  lines.push("", "## Repo conventions", "", "- fixture");
  await fs.writeFile(path.join(repo, "CLAUDE.md"), lines.join("\n"));
}

async function writeReadmeFixture(repo: string): Promise<void> {
  const content = [
    "# loop",
    "",
    "A Claude Code plugin that ships the Wiggin Loop methodology.",
    "",
    "Depends on the `crew` plugin for artifact writers — loop emits Crew",
    "`validation-result` artifacts through `crew write-validation-result`.",
    "",
    "## Install",
    "",
    "fixture install instructions"
  ].join("\n");
  await fs.writeFile(path.join(repo, "README.md"), content);
}

// Builds a small, fully-known fixture repo: 2 done FEATs inside the 90-day
// window (2 + 3 = 5 slices), 1 done FEAT outside the window (2 slices, must
// not count toward the 90-day bucket but DOES count toward the total done
// count), 6 grade files (window = last 5), 3 cost reports with a known
// median/mean divergence, a 2-registry-entry + 3-wave-row halt-badges
// fixture (5 total), and a 4-item CI-gates fixture.
async function buildFixtureRepo(prefix: string): Promise<string> {
  const repo = await tmpRepo(prefix);
  await writeDoneFeat(repo, "FEAT-001", {
    completedAt: "2026-07-01",
    slices: ["SLICE-1", "SLICE-2"]
  });
  await writeDoneFeat(repo, "FEAT-002", {
    completedAt: "2026-07-10",
    slices: ["SLICE-3", "SLICE-4", "SLICE-5"]
  });
  // Outside the 90-day window relative to `today` (2026-07-18) — 2026-01-01
  // is well over 90 days back.
  await writeDoneFeat(repo, "FEAT-003", {
    completedAt: "2026-01-01",
    slices: ["SLICE-6", "SLICE-7"]
  });

  for (let i = 1; i <= 6; i++) {
    await writeGrade(repo, `SLICE-${i}`, "FEAT-001", 0.9);
  }

  await writeCostReport(repo, "a1", 10);
  await writeCostReport(repo, "a2", 10);
  await writeCostReport(repo, "a3", 100);

  await writeHaltBadgesFixture(repo, 2, 3);
  await writeClaudeMdFixture(repo, 4);
  await writeReadmeFixture(repo);
  return repo;
}

const TODAY = "2026-07-18";

test("collectMetricsBandData computes deterministic numbers from a fixture repo", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-collect-");
  const data = await collectMetricsBandData(repo, { today: TODAY });

  assert.equal(data.doneFeatCount, 3, "counts all done FEATs regardless of window");
  assert.equal(
    data.slicesClosedLast90d,
    5,
    "sums slices[] only for FEATs completed within the last 90 days"
  );
  assert.equal(data.gradeCount, 6);
  assert.equal(data.gradeAverage, 0.9, "last-5-grade window average");
  assert.equal(data.costReportCount, 3);
  assert.equal(data.medianCostUsd, 10, "median of [10, 10, 100]");
  assert.equal(data.meanCostUsd, 40, "mean of [10, 10, 100]");
  assert.equal(data.costDivergencePct, 300, "(40 - 10) / 10 * 100");
  assert.equal(data.haltBadgeCount, 5, "2 registry entries + 3 wave-mode table rows");
  assert.equal(data.ciGateCount, 4);
});

test("collectMetricsBandData median/mean match loadCostReportUSDValues's own array semantics", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-median-");
  const rawValues = await loadCostReportUSDValues(repo);
  const data = await collectMetricsBandData(repo, { today: TODAY });

  assert.equal(data.medianCostUsd, median(rawValues));
  assert.equal(data.meanCostUsd, mean(rawValues));
  assert.equal(rawValues.length, data.costReportCount);
});

test("renderMetricsBand emits the exact median label and markers", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-render-");
  const data = await collectMetricsBandData(repo, { today: TODAY });
  const band = renderMetricsBand(data);

  assert.ok(band.startsWith(METRICS_BAND_START));
  assert.ok(band.endsWith(METRICS_BAND_END));
  assert.ok(
    band.includes("median per slice-close session scan"),
    "median row must carry the exact required label"
  );
  assert.ok(band.includes(`generated ${TODAY}`), "must carry a generated-date line");
  assert.ok(band.includes("Sources:"), "must carry per-number source annotations");
  assert.ok(band.includes(".claude/artifacts/loop/backlog/done"));
  assert.ok(band.includes("docs/halt-badges.md"));
  assert.ok(band.includes("CLAUDE.md"));
});

test("insertBandIntoReadme inserts after the intro anchor on first write", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-insert-");
  const readmeText = await fs.readFile(path.join(repo, "README.md"), "utf8");
  const band = await generateMetricsBandContent(repo, { today: TODAY });

  const updated = insertBandIntoReadme(readmeText, band);
  assert.ok(updated.includes(DEMO_RECORDING_PLACEHOLDER));
  assert.ok(updated.includes(band));
  const introIdx = updated.indexOf("crew write-validation-result");
  const installIdx = updated.indexOf("## Install");
  const bandIdx = updated.indexOf(METRICS_BAND_START);
  assert.ok(introIdx < bandIdx && bandIdx < installIdx, "band lands between intro and Install");
});

test("insertBandIntoReadme replaces an existing band in place on a second write", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-replace-");
  const readmeText = await fs.readFile(path.join(repo, "README.md"), "utf8");
  const firstBand = await generateMetricsBandContent(repo, { today: TODAY });
  const afterFirstWrite = insertBandIntoReadme(readmeText, firstBand);

  // Simulate drift, then regenerate with a different band and re-insert.
  const secondBand = firstBand.replace("FEATs shipped (done) | 3", "FEATs shipped (done) | 99");
  const afterSecondWrite = insertBandIntoReadme(afterFirstWrite, secondBand);

  const occurrences = afterSecondWrite.split(METRICS_BAND_START).length - 1;
  assert.equal(occurrences, 1, "must not duplicate the band on repeated writes");
  assert.ok(afterSecondWrite.includes("FEATs shipped (done) | 99"));
  assert.ok(afterSecondWrite.includes(DEMO_RECORDING_PLACEHOLDER), "placeholder is untouched");
});

test("writeMetricsBand + checkMetricsBandFreshness: fresh band passes", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-fresh-");
  await writeMetricsBand(repo, { today: TODAY });

  const result = await checkMetricsBandFreshness(repo, { today: TODAY });
  assert.equal(result.ok, true, `expected fresh band to pass: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

test("checkMetricsBandFreshness catches a stale README fixture (--check drift)", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-stale-");
  await writeMetricsBand(repo, { today: TODAY });

  // Real state changes: a new done FEAT lands inside the 90-day window.
  await writeDoneFeat(repo, "FEAT-004", {
    completedAt: "2026-07-15",
    slices: ["SLICE-8"]
  });
  clearAll();

  const result = await checkMetricsBandFreshness(repo, { today: TODAY });
  assert.equal(result.ok, false, "stale band must fail the freshness gate");
  assert.match(result.errors.join("\n"), /out of date/);

  // Regenerating clears the drift.
  await writeMetricsBand(repo, { today: TODAY });
  clearAll();
  const fixed = await checkMetricsBandFreshness(repo, { today: TODAY });
  assert.equal(fixed.ok, true, `expected regenerated band to pass: ${fixed.errors.join("; ")}`);
});

test("checkMetricsBandFreshness fails with a clear message when the band is missing", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-missing-");
  const result = await checkMetricsBandFreshness(repo, { today: TODAY });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing the metrics band/);
});

test("checkMetricsBandFreshness anchors to the band's own generated-date, not a later real-world today", async () => {
  const repo = await buildFixtureRepo("al-metrics-band-anchor-");
  await writeMetricsBand(repo, { today: TODAY });

  // No explicit `today` passed — the checker must read it back out of the
  // on-disk band (mirrors validate-snapshot-freshness.mts's header-date
  // anchor) instead of using `new Date()`, so a later calendar day doesn't
  // false-positive on pure date rollover.
  const result = await checkMetricsBandFreshness(repo);
  assert.equal(
    result.ok,
    true,
    `expected date-anchored check to pass: ${result.errors.join("; ")}`
  );
});
