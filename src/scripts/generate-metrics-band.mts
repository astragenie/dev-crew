#!/usr/bin/env node
// generate-metrics-band.mts — README dogfood metrics band (W4.2,
// docs/superpowers/plans/2026-07-18-improvement-plan-audit-wave.md).
//
// Renders a machine-generated markdown block between
// `<!-- metrics-band:start -->` / `<!-- metrics-band:end -->` markers in
// README.md. Every number traces to an on-disk artifact — the plan's hard
// rule — and each row carries a footnote naming its source file. Pure
// aggregation, no LLM, mirrors src/scripts/lib/memory-snapshot.mts's
// "durable snapshot" approach.
//
// Freshness checking is FOLDED INTO THIS FILE (no separate
// validate-metrics-band.mts) via `--check`: it mirrors
// validate-snapshot-freshness.mts's approach of regenerating in-memory and
// diffing against the on-disk band, anchored to the band's own recorded
// generated-date so a checkout on a later calendar day doesn't false-positive
// on pure date rollover.
//
// Modes:
//   (default)  print the rendered band to stdout.
//   --write    regenerate and write the band into README.md in place
//              (inserts after the intro paragraph on first run; replaces the
//              marker-bracketed block on subsequent runs).
//   --check    regenerate in memory and diff against the on-disk README
//              band; exit 1 on drift.
//
// Read patterns are copied from src/scripts/lib/memory-snapshot.mts's
// EXPORTED surface only (listBacklog/filterBacklog, listGrades/averageScore,
// loadCostReportUSDValues) — no private-internal imports.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listBacklog, filterBacklog } from "./lib/backlog-parser.mjs";
import { listGrades, averageScore } from "./lib/grade-parser.mjs";
import { loadCostReportUSDValues } from "./lib/memory-snapshot.mjs";

export const METRICS_BAND_START = "<!-- metrics-band:start -->";
export const METRICS_BAND_END = "<!-- metrics-band:end -->";
export const DEMO_RECORDING_PLACEHOLDER = "<!-- demo-recording: pending W4.1 asciinema asset -->";

// Mirrors loop-snapshot.md's "Last 5 averages" convention (memory-snapshot.mts).
const GRADE_WINDOW = 5;
// Mirrors memory-snapshot.mts's loadCostReportUSDValues default window.
const COST_REPORT_WINDOW = 20;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const REGENERATE_HINT = "Run: bun src/scripts/generate-metrics-band.mts --write --repo <path>";

// README anchor: end of the intro's second paragraph, right before the
// "Marketplace history" blockquote / "## Install" section. Insertion targets
// "near the top (after intro)" per the W4.2 requirement.
const INSERT_ANCHOR = "artifacts through `crew write-validation-result`.";

// Exported so tests can assert this matches loadCostReportUSDValues's own
// array semantics directly, without re-deriving median math independently.
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Sums each done FEAT's `slices` frontmatter array for FEATs whose
// `completed_at` falls within the last `windowMs` — the same backlog done/
// frontmatter listBacklog/filterBacklog already parse, no separate read path.
function countSlicesClosedRecently(
  doneFeats: Record<string, any>[],
  todayMs: number,
  windowMs: number
): number {
  let total = 0;
  for (const f of doneFeats) {
    const completedAt = f.frontmatter.completed_at;
    if (typeof completedAt !== "string") continue;
    const ts = new Date(completedAt).getTime();
    if (Number.isNaN(ts) || ts > todayMs || todayMs - ts > windowMs) continue;
    const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
    total += slices.length;
  }
  return total;
}

// docs/halt-badges.md registry count: every backtick-led H3 section
// (`### `snapshot.xxx`` under "## Registry", `### `qaGradeGate`` under
// "## Close-time gate badges", and any future non-snapshot.* badge section
// following the same per-badge template) plus the "## Wave-mode badges"
// table's data rows (badges emitted outside the H3-per-badge template
// entirely). Deliberately NOT scoped to a `snapshot.` prefix — the registry
// has grown a second badge family (close-time gate badges, FEAT-264
// SLICE-5) that shares the same H3-per-badge shape without the prefix.
async function countHaltBadges(repoRoot: string): Promise<number> {
  const text = await fs.readFile(path.join(repoRoot, "docs", "halt-badges.md"), "utf8");
  const badgeHeaders = (text.match(/^### `/gm) || []).length;
  let waveRows = 0;
  let inWaveSection = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("## Wave-mode badges")) {
      inWaveSection = true;
      continue;
    }
    if (!inWaveSection) continue;
    if (line.startsWith("## ")) break;
    if (/^\|\s*`/.test(line)) waveRows++;
  }
  return badgeHeaders + waveRows;
}

// CLAUDE.md's numbered "## CI gates" list — counts top-level `N. ` items
// until the next `## ` heading.
async function countCiGates(repoRoot: string): Promise<number> {
  const text = await fs.readFile(path.join(repoRoot, "CLAUDE.md"), "utf8");
  let inSection = false;
  let count = 0;
  for (const line of text.split("\n")) {
    if (/^## CI gates/.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (/^## /.test(line)) break;
    if (/^\d+\.\s/.test(line)) count++;
  }
  return count;
}

export interface MetricsBandData {
  today: string;
  doneFeatCount: number;
  slicesClosedLast90d: number;
  gradeWindow: number;
  gradeAverage: number | null;
  gradeCount: number;
  costReportWindow: number;
  costReportCount: number;
  medianCostUsd: number | null;
  meanCostUsd: number | null;
  costDivergencePct: number | null;
  haltBadgeCount: number;
  ciGateCount: number;
}

function round3(v: number): number {
  return Number(v.toFixed(3));
}

export async function collectMetricsBandData(
  repoRoot: string,
  {
    today = new Date().toISOString().slice(0, 10),
    config = null
  }: { today?: string; config?: Record<string, any> | null } = {}
): Promise<MetricsBandData> {
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();

  const [backlog, grades, costUsdValues, haltBadgeCount, ciGateCount] = await Promise.all([
    listBacklog(repoRoot, { config }),
    listGrades(repoRoot, { config }),
    loadCostReportUSDValues(repoRoot, COST_REPORT_WINDOW),
    countHaltBadges(repoRoot),
    countCiGates(repoRoot)
  ]);

  const doneFeats = filterBacklog(backlog, { status: "done" });
  const recentGrades = grades.slice(-GRADE_WINDOW);
  const gradeScores = recentGrades
    .map((g: Record<string, any>) => averageScore(g.scores))
    .filter((v: number | null): v is number => v !== null);
  const gradeAverageRaw = mean(gradeScores);

  const medianCostUsd = median(costUsdValues);
  const meanCostUsd = mean(costUsdValues);
  const costDivergencePct =
    medianCostUsd !== null && meanCostUsd !== null && medianCostUsd !== 0
      ? Number((((meanCostUsd - medianCostUsd) / medianCostUsd) * 100).toFixed(1))
      : null;

  return {
    today,
    doneFeatCount: doneFeats.length,
    slicesClosedLast90d: countSlicesClosedRecently(doneFeats, todayMs, NINETY_DAYS_MS),
    gradeWindow: GRADE_WINDOW,
    gradeAverage: gradeAverageRaw === null ? null : round3(gradeAverageRaw),
    gradeCount: grades.length,
    costReportWindow: COST_REPORT_WINDOW,
    costReportCount: costUsdValues.length,
    medianCostUsd: medianCostUsd === null ? null : round3(medianCostUsd),
    meanCostUsd: meanCostUsd === null ? null : round3(meanCostUsd),
    costDivergencePct,
    haltBadgeCount,
    ciGateCount
  };
}

function fmtUsd(v: number | null): string {
  return v === null ? "n/a" : `$${v.toFixed(3)}`;
}

function costCellText(data: MetricsBandData): string {
  const median_ = fmtUsd(data.medianCostUsd);
  if (data.meanCostUsd === null) return median_;
  const sign = data.costDivergencePct !== null && data.costDivergencePct > 0 ? "+" : "";
  const divergence =
    data.costDivergencePct === null ? "" : `, ${sign}${data.costDivergencePct}% divergence`;
  return `${median_} (mean ${fmtUsd(data.meanCostUsd)}${divergence})`;
}

export function renderMetricsBand(data: MetricsBandData): string {
  const gradeCell =
    data.gradeAverage === null ? "n/a" : `${data.gradeAverage} (n=${data.gradeCount} total)`;
  const lines = [
    METRICS_BAND_START,
    `_Dogfood metrics — generated ${data.today}. Every number below is computed from this repo's own artifacts; regenerate with \`bun src/scripts/generate-metrics-band.mts --write\`._`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| FEATs shipped (done) | ${data.doneFeatCount} |`,
    `| Slices closed, last 90 days | ${data.slicesClosedLast90d} |`,
    `| Grade average, last ${data.gradeWindow} slice closes | ${gradeCell} |`,
    `| median per slice-close session scan | ${costCellText(data)} |`,
    `| Halt badges documented | ${data.haltBadgeCount} |`,
    `| CI gates enforced | ${data.ciGateCount} |`,
    "",
    "Sources:",
    "- FEATs shipped / slices closed: `.claude/artifacts/loop/backlog/done/*.md` frontmatter (`completed_at`, `slices`).",
    `- Grade average: \`.claude/artifacts/loop/grades/*.md\` — composite of the last ${data.gradeWindow} grade files.`,
    `- Cost scan: \`.claude/artifacts/crew/cost/*-cost-report-*.md\` \`usd\` field, last ${data.costReportWindow} reports (\`loadCostReportUSDValues\`).`,
    "- Halt badges: `docs/halt-badges.md` registry (every per-badge `### ` section + wave-mode badges table).",
    '- CI gates: `CLAUDE.md` § "CI gates" numbered list.',
    METRICS_BAND_END
  ];
  return lines.join("\n");
}

export async function generateMetricsBandContent(
  repoRoot: string,
  opts: { config?: Record<string, any> | null; today?: string } = {}
): Promise<string> {
  const data = await collectMetricsBandData(repoRoot, opts);
  return renderMetricsBand(data);
}

function extractBand(readmeText: string): string | null {
  const startIdx = readmeText.indexOf(METRICS_BAND_START);
  const endIdx = readmeText.indexOf(METRICS_BAND_END);
  if (startIdx === -1 || endIdx === -1) return null;
  return readmeText.slice(startIdx, endIdx + METRICS_BAND_END.length);
}

function extractGeneratedDate(band: string): string | null {
  const m = band.match(/generated (\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

// Inserts the band after the intro (first `--write` run), or replaces the
// existing marker-bracketed block in place (subsequent runs). Throws on a
// malformed on-disk state (start marker with no matching end marker) or a
// missing insertion anchor rather than silently corrupting README.md.
export function insertBandIntoReadme(readmeText: string, bandContent: string): string {
  const startIdx = readmeText.indexOf(METRICS_BAND_START);
  if (startIdx !== -1) {
    const endIdx = readmeText.indexOf(METRICS_BAND_END);
    if (endIdx === -1) {
      throw new Error(`README.md has ${METRICS_BAND_START} without a matching ${METRICS_BAND_END}`);
    }
    const before = readmeText.slice(0, startIdx);
    const after = readmeText.slice(endIdx + METRICS_BAND_END.length);
    return `${before}${bandContent}${after}`;
  }

  const anchorIdx = readmeText.indexOf(INSERT_ANCHOR);
  if (anchorIdx === -1) {
    throw new Error(`README.md insertion anchor not found: ${JSON.stringify(INSERT_ANCHOR)}`);
  }
  const anchorEnd = anchorIdx + INSERT_ANCHOR.length;
  const restFromAnchor = readmeText.slice(anchorEnd);
  const blankLineOffset = restFromAnchor.indexOf("\n\n");
  const insertAt = blankLineOffset === -1 ? anchorEnd : anchorEnd + blankLineOffset + 1;
  const before = readmeText.slice(0, insertAt);
  const after = readmeText.slice(insertAt);
  return `${before}\n${DEMO_RECORDING_PLACEHOLDER}\n\n${bandContent}\n${after}`;
}

export async function writeMetricsBand(
  repoRoot: string,
  opts: { config?: Record<string, any> | null; today?: string } = {}
): Promise<{ readmePath: string; band: string }> {
  const readmePath = path.join(repoRoot, "README.md");
  const readmeText = await fs.readFile(readmePath, "utf8");
  const band = await generateMetricsBandContent(repoRoot, opts);
  const updated = insertBandIntoReadme(readmeText, band);
  await fs.writeFile(readmePath, updated);
  return { readmePath, band };
}

export interface MetricsBandFreshnessResult {
  ok: boolean;
  errors: string[];
}

// Mirrors validate-snapshot-freshness.mts: regenerate in-memory, diff
// against the on-disk band, anchored to the band's OWN recorded
// generated-date (not "real today") so a checkout on a later calendar day
// never false-positives on pure date rollover — only genuine data drift
// fails the gate.
export async function checkMetricsBandFreshness(
  repoRoot: string,
  opts: { config?: Record<string, any> | null; today?: string } = {}
): Promise<MetricsBandFreshnessResult> {
  const readmePath = path.join(repoRoot, "README.md");
  let readmeText: string;
  try {
    readmeText = await fs.readFile(readmePath, "utf8");
  } catch {
    return { ok: false, errors: [`README.md not found at ${readmePath}`] };
  }

  const onDiskBand = extractBand(readmeText);
  if (!onDiskBand) {
    return {
      ok: false,
      errors: [
        `README.md is missing the metrics band (${METRICS_BAND_START} / ${METRICS_BAND_END}). ${REGENERATE_HINT}`
      ]
    };
  }

  const today =
    opts.today ?? extractGeneratedDate(onDiskBand) ?? new Date().toISOString().slice(0, 10);
  const expectedBand = await generateMetricsBandContent(repoRoot, {
    config: opts.config ?? null,
    today
  });

  if (onDiskBand === expectedBand) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: [
      "README.md metrics band is out of date — regenerated content does not match the on-disk band.",
      REGENERATE_HINT
    ]
  };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function parseArgs(argv: string[]): { repo: string; mode: "print" | "write" | "check" } {
  let repo = process.cwd();
  let mode: "print" | "write" | "check" = "print";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo" && argv[i + 1]) {
      repo = path.resolve(argv[i + 1] ?? ".");
      i++;
    } else if (argv[i] === "--write") {
      mode = "write";
    } else if (argv[i] === "--check") {
      mode = "check";
    }
  }
  return { repo, mode };
}

if (isMainEntry()) {
  const { repo, mode } = parseArgs(process.argv.slice(2));
  if (mode === "check") {
    const result = await checkMetricsBandFreshness(repo);
    if (!result.ok) {
      console.error("Metrics-band freshness validation failed:");
      for (const e of result.errors) console.error(`  - ${e}`);
      process.exitCode = 1;
    } else {
      console.log("README.md metrics band is up to date");
    }
  } else if (mode === "write") {
    const { readmePath } = await writeMetricsBand(repo);
    console.log(`Wrote metrics band to ${readmePath}`);
  } else {
    console.log(await generateMetricsBandContent(repo));
  }
}
