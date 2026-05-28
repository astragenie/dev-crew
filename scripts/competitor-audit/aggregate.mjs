import fs from "node:fs/promises";

import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const AXES = [
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
];

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
