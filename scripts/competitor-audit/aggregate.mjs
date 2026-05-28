import fs from "node:fs/promises";

import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const AXES = Object.freeze([
  "Workflow phases",
  "Roles / dispatch",
  "Artifacts / state",
  "Memory / retention",
  "Model routing",
  "Cost / telemetry",
  "Backlog / spec",
  "Validation / gates",
  "Deployment",
  "Install / distribution"
]);

const REQUIRED_FRONTMATTER_FIELDS = Object.freeze([
  "competitor",
  "host",
  "language",
  "license",
  "version_observed"
]);

const SYMBOL_RE = /[●◐○]/;
const GAP_HEADER_RE = /^### (GAP-\d+):\s*(.+)$/;
const SCORE_RE = /^- (Impact|Effort|Fit) \(0-3\):\s*(\d)/i;
const COMPOSITE_RE = /^- Composite:.*?=\s*(\d+)/i;
const DESC_RE = /^- Description:\s*(.+)$/;
const SOURCE_RE = /^- Source:\s*(.+)$/;

function parseMatrixRow(line) {
  // | Axis name | symbol | note |
  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  if (cells.length < 3) return null;
  const [axis, symbolCell, ...noteParts] = cells;
  const m = symbolCell.match(SYMBOL_RE);
  if (!m) return null;
  return { axis, symbol: m[0], note: noteParts.join(" | ").trim() };
}

function extractMatrix(body) {
  const lines = body.split("\n");
  const matrix = {};
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const parsed = parseMatrixRow(line);
    if (!parsed) continue;
    if (AXES.includes(parsed.axis)) {
      if (parsed.axis in matrix) {
        throw new Error(`Brief has duplicate axis row: ${parsed.axis}`);
      }
      matrix[parsed.axis] = { symbol: parsed.symbol, note: parsed.note };
    }
  }
  for (const axis of AXES) {
    if (!(axis in matrix)) {
      throw new Error(`Brief missing axis: ${axis}`);
    }
  }
  return matrix;
}

function extractGaps(body) {
  const lines = body.split("\n");
  const gaps = [];
  let current = null;
  for (const raw of lines) {
    const headerMatch = raw.match(GAP_HEADER_RE);
    if (headerMatch) {
      if (current) gaps.push(current);
      current = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
        description: "",
        source: "",
        impact: null,
        effort: null,
        fit: null,
        composite: null
      };
      continue;
    }
    if (!current) continue;
    const descMatch = raw.match(DESC_RE);
    if (descMatch) current.description = descMatch[1].trim();
    const sourceMatch = raw.match(SOURCE_RE);
    if (sourceMatch) current.source = sourceMatch[1].trim();
    const scoreMatch = raw.match(SCORE_RE);
    if (scoreMatch) {
      current[scoreMatch[1].toLowerCase()] = Number(scoreMatch[2]);
    }
    const compositeMatch = raw.match(COMPOSITE_RE);
    if (compositeMatch) current.composite = Number(compositeMatch[1]);
  }
  if (current) gaps.push(current);
  return gaps;
}

export async function parseBrief(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    const value = frontmatter[field];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Brief missing required frontmatter field: ${field}`);
    }
  }
  const matrix = extractMatrix(body);
  const gaps = extractGaps(body);
  return {
    filePath,
    competitor: frontmatter.competitor,
    host: frontmatter.host,
    language: frontmatter.language,
    license: frontmatter.license,
    version_observed: frontmatter.version_observed,
    sources: frontmatter.sources || [],
    matrix,
    gaps
  };
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createMergedGap(gap) {
  return {
    key: normalizeTitle(gap.title),
    title: gap.title,
    description: gap.description || "",
    source_competitors: [],
    sources: [],
    impact: gap.impact ?? 0,
    effort: gap.effort ?? 3,
    fit: gap.fit ?? 0,
    composite: gap.composite ?? 0
  };
}

function mergeGapInto(merged, gap, competitor) {
  if (!merged.source_competitors.includes(competitor)) {
    merged.source_competitors.push(competitor);
  }
  if (gap.source && !merged.sources.includes(gap.source)) {
    merged.sources.push(gap.source);
  }
  // Take the most generous scores across duplicates so we don't
  // under-rate a gap that one researcher scored conservatively.
  merged.impact = Math.max(merged.impact, gap.impact ?? 0);
  merged.effort = Math.min(merged.effort, gap.effort ?? 3);
  merged.fit = Math.max(merged.fit, gap.fit ?? 0);
  merged.composite = Math.max(merged.composite, gap.composite ?? 0);
  // Keep the longest description we have seen.
  if ((gap.description || "").length > merged.description.length) {
    merged.description = gap.description;
  }
}

export function dedupeAndRank(briefs) {
  const bucket = new Map();
  for (const brief of briefs) {
    for (const gap of brief.gaps || []) {
      const key = normalizeTitle(gap.title);
      if (!key) continue;
      if (!bucket.has(key)) {
        bucket.set(key, createMergedGap(gap));
      }
      mergeGapInto(bucket.get(key), gap, brief.competitor);
    }
  }
  return [...bucket.values()].sort((a, b) => b.composite - a.composite);
}

export function renderMatrixMarkdown(briefs, { baseline, axes }) {
  const competitors = briefs.map((b) => b.competitor);
  const header = `| Axis                 | ${baseline.name} | ${competitors.join(" | ")} |`;
  const sep = `| -------------------- | ${"---".padEnd(baseline.name.length, "-")} | ${competitors
    .map((c) => "---".padEnd(c.length, "-"))
    .join(" | ")} |`;
  const rows = axes.map((axis) => {
    const baseCell = baseline.matrix[axis] || { symbol: "?", note: "" };
    const competitorCells = briefs.map((b) => {
      const cell = b.matrix[axis] || { symbol: "?", note: "" };
      return `${cell.symbol} ${cell.note}`.trim();
    });
    return `| ${axis} | ${baseCell.symbol} ${baseCell.note} | ${competitorCells.join(" | ")} |`;
  });
  return [header, sep, ...rows].join("\n");
}
