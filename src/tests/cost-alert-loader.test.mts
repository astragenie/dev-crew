// Tests for the FEAT-166 / SLICE-91 per-project USD parser extension
// on `loadAggregateCostReport`. Covers AC-2 of SLICE-91 — the
// `perProjectUsd` field is parsed defensively from aggregate cost
// report frontmatter, returning Record<string, number> when present
// and null when absent or every entry is unparseable.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { loadAggregateCostReport } from "../scripts/lib/cost-alert-loader.mjs";

const FM_KIND_LINE = "kind: cost-report";
const FM_SLICE_LINE = "slice: SLICE-01";
const FM_AGG_LINE = "aggregate_all: true";
const FM_USD_10 = "usd: 10";
const PROJECT_LOOP = "C--work-mega-loop";
const PROJECT_HERO = "C--work-mega-hero-crew";
const TS = "20260601T120000Z";
const FM_PPU_HEADER = "per_project_usd:";

async function tmpRepoWithCostDir(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true });
  return repo;
}

async function writeReportRaw(repo: string, timestamp: string, slice: string, fmBody: string) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  const filename = `${timestamp}-cost-report-aggregate-${slice.toLowerCase()}.md`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, `---\n${fmBody}\n---\n\n# ${slice}\n`);
  return filepath;
}

test("perProjectUsd: present in frontmatter — parsed as Record<string, number>", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-present-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [
      FM_KIND_LINE,
      FM_SLICE_LINE,
      "usd: 41.39",
      FM_AGG_LINE,
      "source_count: 2",
      FM_PPU_HEADER,
      `  ${PROJECT_LOOP}: 16.0366`,
      `  ${PROJECT_HERO}: 25.3521`
    ].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.deepEqual(current!.perProjectUsd, {
    [PROJECT_LOOP]: 16.0366,
    [PROJECT_HERO]: 25.3521
  });
});

test("perProjectUsd: absent from frontmatter — returns null (back-compat)", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-absent-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [FM_KIND_LINE, FM_SLICE_LINE, "usd: 41.39", FM_AGG_LINE].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.equal(current!.perProjectUsd, null);
});

test("perProjectUsd: non-numeric entries are skipped, valid ones kept", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-partial-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [
      FM_KIND_LINE,
      FM_SLICE_LINE,
      FM_USD_10,
      FM_AGG_LINE,
      FM_PPU_HEADER,
      "  C--work-mega-loop: 5.5",
      "  C--work-mega-hero-crew: not-a-number",
      "  C--work-mega-other: NaN"
    ].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.deepEqual(current!.perProjectUsd, { "C--work-mega-loop": 5.5 });
});

test("perProjectUsd: every entry unparseable — returns null", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-all-bad-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [
      FM_KIND_LINE,
      FM_SLICE_LINE,
      FM_USD_10,
      FM_AGG_LINE,
      FM_PPU_HEADER,
      "  C--work-mega-loop: not-a-number",
      "  C--work-mega-hero-crew: NaN"
    ].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.equal(current!.perProjectUsd, null);
});

test("perProjectUsd: nested block ends at next top-level frontmatter key", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-terminator-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [
      FM_KIND_LINE,
      FM_SLICE_LINE,
      FM_USD_10,
      FM_AGG_LINE,
      FM_PPU_HEADER,
      "  C--work-mega-loop: 7",
      "source_count: 2",
      "created_at: 2026-06-01T12:00:00.000Z"
    ].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.deepEqual(current!.perProjectUsd, { "C--work-mega-loop": 7 });
  assert.equal(current!.sourceCount, 2);
  assert.equal(current!.createdAt, "2026-06-01T12:00:00.000Z");
});

test("perProjectUsd: keys with dots and underscores parse correctly", async () => {
  const repo = await tmpRepoWithCostDir("cl-ppu-keys-");
  await writeReportRaw(
    repo,
    TS,
    "SLICE-01",
    [
      FM_KIND_LINE,
      FM_SLICE_LINE,
      FM_USD_10,
      FM_AGG_LINE,
      FM_PPU_HEADER,
      "  some.dotted.key: 1.0",
      "  underscored_key: 2.0",
      "  hyphen-key: 3.0"
    ].join("\n")
  );
  const { current } = await loadAggregateCostReport(repo);
  assert.ok(current);
  assert.deepEqual(current!.perProjectUsd, {
    "some.dotted.key": 1.0,
    underscored_key: 2.0,
    "hyphen-key": 3.0
  });
});
