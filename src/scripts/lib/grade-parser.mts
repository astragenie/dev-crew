import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { gradesRoot, pathExists } from "./paths.mjs";
import { cached } from "./cache.mjs";

export { gradesRoot };

// Matches the legacy bare format:  SLICE-NN-grade.md
const GRADE_FILE_RE_LEGACY = /^SLICE-(\d+)-grade\.md$/i;

// Matches the new timestamped format: YYYYMMDDTHHMMSSZ-*-grade.md
const GRADE_FILE_RE_NEW = /^\d{8}T\d{6}Z-.*-grade\.md$/i;

// Combined check lives in isGradeFile() below.

export const SCORE_DIMENSIONS = [
  "architecture_quality",
  "reliability",
  "observability",
  "production_readiness",
  "security",
  "test_confidence",
  "product_completeness"
];

// Patterns that identify placeholder/unfilled content in grade templates.
// Mirrored from ac-linter's approach (FEAT-145).
export const GRADE_PLACEHOLDER_PATTERNS = [
  /^\s*-\s+bullet\s*$/i, // Plain "- bullet" (standalone)
  /^\s*-\s+bullet\s+\d+\s*$/i, // "- bullet 1", "- bullet 2", etc.
  /^\s*###\s+DEC-TBD\s*:\s*Short\s+decision\s+title\s*$/i, // "### DEC-TBD: Short decision title"
  // FEAT-025: any unreplaced `<fill ...>` scaffold token (e.g. the H1
  // `<fill title>` stub createGradeFile injects) — audit #44, grade writer
  // previously accepted these as real content. Unanchored: the token can
  // appear mid-line (e.g. `# SLICE-NN: <fill title> — Grade`).
  /<fill\s+[^>]+>/i
];

// Parse the "## Scores" section out of the markdown body. Returns
// { dimension: value } object. Used because the simple frontmatter parser
// doesn't handle nested mappings.
export function parseScoresFromBody(body: string) {
  const scores: Record<string, number> = {};
  const lines = body.split("\n");
  let inScores = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Scores\b/i.test(trimmed)) {
      inScores = true;
      continue;
    }
    if (inScores && /^##\s+/.test(trimmed)) break;
    if (!inScores) continue;
    const m = trimmed.match(/^-\s+([a-z_]+)\s*:\s*([0-9]*\.?[0-9]+)/i);
    if (m) {
      scores[m[1]!] = Number(m[2]!);
    }
  }
  return scores;
}

export function averageScore(scores: Record<string, number> | null | undefined) {
  if (!scores) return null;
  const values = SCORE_DIMENSIONS.map((d) => scores[d]).filter((v) => typeof v === "number");
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function validateScores(scores: Record<string, unknown>) {
  const errors: any[] = [];
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

/**
 * Detect if all score dimensions are exactly 0 (indicates unfilled template).
 * A grade is considered all-zero only if EVERY dimension is 0.
 * A grade with some 0s and some non-zero values is considered filled.
 */
export function isAllZeroScores(scores: Record<string, unknown>) {
  return SCORE_DIMENSIONS.every((dim) => {
    const v = scores[dim];
    return typeof v === "number" && v === 0;
  });
}

/**
 * Detect placeholder text patterns in grade body (unfilled template bullets, DEC-TBD titles).
 * Returns array of found placeholder lines.
 */
export function detectPlaceholders(body: string) {
  const lines = body.split("\n");
  const placeholders: string[] = [];
  for (const line of lines) {
    if (GRADE_PLACEHOLDER_PATTERNS.some((p) => p.test(line))) {
      placeholders.push(line.trim());
    }
  }
  return placeholders;
}

// Parse the "## Decisions" section out of the body. Returns array of
// { id, title, rationale, consequences } extracted from "### DEC-XXX: title"
// blocks. id is "TBD" for blocks not yet extracted.
export function parseDecisionsFromBody(body: string) {
  const decisions: any[] = [];
  const lines = body.split("\n");
  let inDecisions = false;
  let current: any = null;
  let buffer: string[] = [];

  function flush() {
    if (!current) return;
    const text = buffer.join("\n");
    const rationaleMatch = text.match(/\*\*Rationale\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i);
    current.rationale = rationaleMatch ? rationaleMatch[1]!.trim() : "";
    const consequencesMatch = text.match(
      /\*\*Consequences\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i
    );
    current.consequences = consequencesMatch ? consequencesMatch[1]!.trim() : "";
    decisions.push(current);
    current = null;
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Decisions\b/i.test(trimmed)) {
      inDecisions = true;
      continue;
    }
    if (inDecisions && /^##\s+/.test(trimmed)) {
      flush();
      break;
    }
    if (!inDecisions) continue;
    const heading = trimmed.match(/^###\s+(DEC-(?:TBD|\d+))\s*:\s*(.+)$/i);
    if (heading) {
      flush();
      current = { id: heading[1]!.toUpperCase(), title: heading[2]!.trim() };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return decisions;
}

export async function readGrade(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    filePath,
    frontmatter,
    body,
    scores: parseScoresFromBody(body),
    decisions: parseDecisionsFromBody(body),
    // FEAT-180 (issue #247): optional review-metadata fields. Every grade
    // artifact written before this feature shipped has NONE of these keys —
    // not even as empty values — so each read is tolerant of full absence
    // (mirrors the Array.isArray(...) ? ... : [] / ?? null precedent used
    // for other optional frontmatter fields elsewhere in this codebase, e.g.
    // brief.mts's autonomousSafe / dependsOnCount). Never throws, never
    // leaves `undefined` for a downstream consumer to explode on.
    notChecked: Array.isArray(frontmatter.not_checked) ? frontmatter.not_checked : [],
    authorId: typeof frontmatter.author_id === "string" ? frontmatter.author_id : null,
    judgeId: typeof frontmatter.judge_id === "string" ? frontmatter.judge_id : null,
    selfApproval: typeof frontmatter.self_approval === "boolean" ? frontmatter.self_approval : null
  };
}

function isGradeFile(filename: string) {
  return GRADE_FILE_RE_LEGACY.test(filename) || GRADE_FILE_RE_NEW.test(filename);
}

export async function listGrades(repoPath: string, options: Record<string, any> = {}) {
  const cacheKey = `listGrades:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = gradesRoot(repoPath, options.config);
    if (!(await pathExists(root))) return [];
    const files = await fs.readdir(root);
    const grades: any[] = [];
    for (const file of files) {
      if (!file.endsWith(".md") || !isGradeFile(file)) continue;
      const g = await readGrade(path.join(root, file));
      grades.push(g);
    }
    return grades.sort((a, b) =>
      (a.frontmatter.slice || "").localeCompare(b.frontmatter.slice || "")
    );
  });
}

// Scan the grades directory for any grade file that belongs to the given
// sliceId. Recognises both the legacy bare format (SLICE-NN-grade.md) and the
// new timestamped format (YYYYMMDDTHHMMSSZ-...-sliceNN-grade.md). Returns the
// full path of the first match, or null.
export async function findGradeFileForSlice(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  const root = gradesRoot(repoPath, config);
  if (!(await pathExists(root))) return null;
  // Legacy path — fast check before full scan.
  const legacyPath = path.join(root, `${sliceId}-grade.md`);
  if (await pathExists(legacyPath)) return legacyPath;
  // Scan for new timestamped format: any file ending in <sliceNN>-grade.md
  const sliceCompact = sliceId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = `${sliceCompact}-grade.md`;
  const files = await fs.readdir(root);
  for (const file of files) {
    if (GRADE_FILE_RE_NEW.test(file) && file.endsWith(suffix)) {
      return path.join(root, file);
    }
  }
  return null;
}

export async function findGradeForSlice(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  const filePath = await findGradeFileForSlice(repoPath, sliceId, config);
  if (!filePath) return null;
  return readGrade(filePath);
}

// Returns a deterministic (legacy-format) path for the given slice. Used as a
// fallback for callers that need a predictable write target when no existing
// file is found. Prefer findGradeFileForSlice when reading.
//
// TODO(2026-09-11): all new grades use the timestamped filename pattern
// (compactTs-feat<N>-slice<N>-grade.md) since FEAT-186 / SLICE-94. Once no
// pre-v0.40 grades remain in active grade-trend windows, remove this helper
// and its 5 consumers. Audit: `grep -rn "gradeFilePath" src/`.
export function gradeFilePath(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  return path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`);
}
