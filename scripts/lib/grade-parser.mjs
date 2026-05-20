import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";

const GRADE_FILE_RE = /^SLICE-(\d+)-grade\.md$/i;

export const SCORE_DIMENSIONS = [
  "architecture_quality",
  "reliability",
  "observability",
  "production_readiness",
  "security",
  "test_confidence",
  "product_completeness"
];

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export function gradesRoot(repoPath, config = null) {
  return path.join(repoPath, config?.grades?.root || "docs/grades");
}

function parseScoresFromBlock(frontmatter) {
  const raw = frontmatter.scores;
  if (raw === null || raw === undefined) return null;
  // The current frontmatter parser handles only flat keys + inline arrays.
  // For `scores:` we expect a block-mapping which the parser leaves as
  // `null` (empty value) with the children NOT captured. So we must
  // re-extract the score block from the raw text. Workaround: caller
  // passes raw content to parseScoresFromBody; this stub returns null
  // when only frontmatter is available.
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
}

// Parse the "## Scores" section out of the markdown body. Returns
// { dimension: value } object. Used because the simple frontmatter parser
// doesn't handle nested mappings.
export function parseScoresFromBody(body) {
  const scores = {};
  const lines = body.split("\n");
  let inScores = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Scores\b/i.test(trimmed)) { inScores = true; continue; }
    if (inScores && /^##\s+/.test(trimmed)) break;
    if (!inScores) continue;
    const m = trimmed.match(/^-\s+([a-z_]+)\s*:\s*([0-9]*\.?[0-9]+)/i);
    if (m) {
      scores[m[1]] = Number(m[2]);
    }
  }
  return scores;
}

export function averageScore(scores) {
  if (!scores) return null;
  const values = SCORE_DIMENSIONS.map((d) => scores[d]).filter((v) => typeof v === "number");
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function validateScores(scores) {
  const errors = [];
  for (const dim of SCORE_DIMENSIONS) {
    const v = scores[dim];
    if (v === undefined || v === null) {
      errors.push(`missing dimension: ${dim}`);
      continue;
    }
    if (typeof v !== "number" || Number.isNaN(v)) {
      errors.push(`${dim} must be a number, got ${typeof v}`);
      continue;
    }
    if (v < 0 || v > 1) {
      errors.push(`${dim} = ${v} out of range [0, 1]`);
    }
  }
  return errors;
}

// Parse the "## Decisions" section out of the body. Returns array of
// { id, title, rationale, consequences } extracted from "### DEC-XXX: title"
// blocks. id is "TBD" for blocks not yet extracted.
export function parseDecisionsFromBody(body) {
  const decisions = [];
  const lines = body.split("\n");
  let inDecisions = false;
  let current = null;
  let buffer = [];

  function flush() {
    if (!current) return;
    const text = buffer.join("\n");
    const rationaleMatch = text.match(/\*\*Rationale\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i);
    current.rationale = rationaleMatch ? rationaleMatch[1].trim() : "";
    const consequencesMatch = text.match(/\*\*Consequences\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i);
    current.consequences = consequencesMatch ? consequencesMatch[1].trim() : "";
    decisions.push(current);
    current = null;
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Decisions\b/i.test(trimmed)) { inDecisions = true; continue; }
    if (inDecisions && /^##\s+/.test(trimmed)) {
      flush();
      break;
    }
    if (!inDecisions) continue;
    const heading = trimmed.match(/^###\s+(DEC-(?:TBD|\d+))\s*:\s*(.+)$/i);
    if (heading) {
      flush();
      current = { id: heading[1].toUpperCase(), title: heading[2].trim() };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return decisions;
}

export async function readGrade(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    filePath,
    frontmatter,
    body,
    scores: parseScoresFromBody(body),
    decisions: parseDecisionsFromBody(body)
  };
}

export async function listGrades(repoPath, options = {}) {
  const root = gradesRoot(repoPath, options.config);
  if (!(await pathExists(root))) return [];
  const files = await fs.readdir(root);
  const grades = [];
  for (const file of files) {
    if (!file.endsWith(".md") || !GRADE_FILE_RE.test(file)) continue;
    const g = await readGrade(path.join(root, file));
    grades.push(g);
  }
  return grades.sort((a, b) => (a.frontmatter.slice || "").localeCompare(b.frontmatter.slice || ""));
}

export async function findGradeForSlice(repoPath, sliceId, config = null) {
  const root = gradesRoot(repoPath, config);
  const filename = `${sliceId}-grade.md`;
  const filePath = path.join(root, filename);
  if (!(await pathExists(filePath))) return null;
  return readGrade(filePath);
}

export function gradeFilePath(repoPath, sliceId, config = null) {
  return path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`);
}
