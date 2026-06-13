/**
 * backlog-auditor — scans pending and triaged FEATs for AC keywords that
 * already appear in the codebase and flags items that may already be satisfied.
 *
 * FEAT-182 / SLICE-126
 */

import fs from "node:fs/promises";
import path from "node:path";

export type AuditVerdict = "likely_satisfied" | "partially" | "open";

export interface AuditResult {
  id: string; // FEAT id
  title: string; // FEAT title
  verdict: AuditVerdict;
  evidence: string[]; // file:line pairs where AC keyword found
}

export interface AuditOptions {
  states?: ("pending" | "triaged")[]; // default: both
  srcDir?: string; // default: src/
}

// Module-scope regex constants.
const CRLF_SPLIT_RE = /\r?\n/;
const FEAT_FILE_RE = /^FEAT-(\d+)([a-z])?(?:-.*)?\.md$/;
const FRONTMATTER_SPLIT_RE = /^---\s*\r?\n/m;
const AC_SECTION_RE = /^##\s+Acceptance\s+criteria\s*$/im;
const SECTION_HEADING_RE = /^##\s+/;
const AC_BULLET_RE = /^\s*-\s+(?:\[[ x]\]\s+)?(?:AC-\d+[.:]\s*)?/i;
const ID_HEADING_RE = /^#\s+/;
const MIN_KEYWORD_LEN = 6;
const MAX_KEYWORDS = 3;
const MAX_EVIDENCE_PER_FEAT = 3;
const LIKELY_THRESHOLD = 2;

/** Extract FEAT id and title from raw file content. */
function extractIdAndTitle(content: string, filename: string): { id: string; title: string } {
  // Try frontmatter id field first
  const parts = content.split(FRONTMATTER_SPLIT_RE);
  let id = "";
  let title = "";

  if (parts.length >= 3) {
    // parts[0] is empty string before first ---, parts[1] is frontmatter body, parts[2+] is body
    const fm = parts[1] ?? "";
    const idMatch = fm.match(/^id:\s*(.+)$/m);
    if (idMatch) id = (idMatch[1] ?? "").trim();
    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = (titleMatch[1] ?? "").trim();
  }

  if (!id) {
    const m = filename.match(FEAT_FILE_RE);
    if (m) {
      const num = String(Number(m[1]!)).padStart(3, "0");
      const suffix = m[2] ?? "";
      id = `FEAT-${num}${suffix}`;
    } else {
      id = filename.replace(/\.md$/, "");
    }
  }

  if (!title) {
    // Fallback: find first H1 in body
    const lines = content.split(CRLF_SPLIT_RE);
    for (const line of lines) {
      if (ID_HEADING_RE.test(line)) {
        title = line.replace(ID_HEADING_RE, "").trim();
        break;
      }
    }
  }

  return { id, title };
}

/** Extract AC section bullets from FEAT body and derive top keywords. */
function extractKeywords(content: string): string[] {
  const lines = content.split(CRLF_SPLIT_RE);
  const acStart = lines.findIndex((l) => AC_SECTION_RE.test(l));
  if (acStart === -1) return [];

  const bullets: string[] = [];
  for (let i = acStart + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (SECTION_HEADING_RE.test(line) && !AC_SECTION_RE.test(line)) break;
    if (AC_BULLET_RE.test(line)) {
      // Strip bullet/checkbox/AC prefix then collect the text
      const stripped = line.replace(AC_BULLET_RE, "").trim();
      bullets.push(stripped);
    }
  }

  // Build unique keyword set: words >= MIN_KEYWORD_LEN chars, lowercased
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const bullet of bullets) {
    const words = bullet.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      if (clean.length >= MIN_KEYWORD_LEN && !seen.has(clean)) {
        seen.add(clean);
        keywords.push(clean);
        if (keywords.length >= MAX_KEYWORDS) return keywords;
      }
    }
  }
  return keywords;
}

/** Recursively collect all .mts / .ts / .js / .mjs files under srcDir. */
async function collectSourceFiles(srcDir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: import("node:fs").Dirent<string>[];
  try {
    entries = (await fs.readdir(srcDir, { withFileTypes: true })) as import("node:fs").Dirent<string>[];
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectSourceFiles(full);
      results.push(...sub);
    } else if (/\.(mts|mjs|ts|js)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** Search a single file for keyword, returning "relPath:lineNumber" hits (up to limit). */
async function searchFileForKeyword(
  filePath: string,
  repoPath: string,
  keyword: string,
  limit: number
): Promise<string[]> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return [];
  }
  const lines = content.split(CRLF_SPLIT_RE);
  const kw = keyword.toLowerCase();
  const hits: string[] = [];
  for (let i = 0; i < lines.length && hits.length < limit; i++) {
    if ((lines[i] ?? "").toLowerCase().includes(kw)) {
      const rel = path.relative(repoPath, filePath).replace(/\\/g, "/");
      hits.push(`${rel}:${i + 1}`);
    }
  }
  return hits;
}

async function searchKeywords(
  keywords: string[],
  sourceFiles: string[],
  repoPath: string
): Promise<{ foundCount: number; evidence: string[] }> {
  let foundCount = 0;
  const evidence: string[] = [];
  for (const keyword of keywords) {
    let keywordHit = false;
    for (const srcFile of sourceFiles) {
      if (evidence.length >= MAX_EVIDENCE_PER_FEAT) break;
      const hits = await searchFileForKeyword(srcFile, repoPath, keyword, MAX_EVIDENCE_PER_FEAT - evidence.length);
      if (hits.length > 0) {
        evidence.push(...hits);
        keywordHit = true;
      }
    }
    if (keywordHit) foundCount++;
    if (evidence.length >= MAX_EVIDENCE_PER_FEAT) break;
  }
  return { foundCount, evidence };
}

async function auditFeatFile(
  filePath: string,
  filename: string,
  repoPath: string,
  sourceFiles: string[]
): Promise<AuditResult | null> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const { id, title } = extractIdAndTitle(content, filename);
  const keywords = extractKeywords(content);
  if (keywords.length === 0) return { id, title, verdict: "open", evidence: [] };
  const { foundCount, evidence } = await searchKeywords(keywords, sourceFiles, repoPath);
  const verdict: AuditVerdict = foundCount >= LIKELY_THRESHOLD ? "likely_satisfied" : foundCount === 1 ? "partially" : "open";
  return { id, title, verdict, evidence };
}

/**
 * Audit the backlog for FEATs whose AC keywords already appear in the
 * source tree, suggesting they may already be implemented.
 */
export async function auditBacklog(repoPath: string, opts?: AuditOptions): Promise<AuditResult[]> {
  const states = opts?.states ?? ["pending", "triaged"];
  const srcDir = path.resolve(repoPath, opts?.srcDir ?? "src");
  const sourceFiles = await collectSourceFiles(srcDir);
  const results: AuditResult[] = [];

  for (const state of states) {
    const stateDir = path.join(repoPath, ".claude", "artifacts", "loop", "backlog", state);
    let entries: string[];
    try {
      entries = (await fs.readdir(stateDir)) as string[];
    } catch {
      continue;
    }
    for (const filename of (entries as string[]).filter((f: string) => FEAT_FILE_RE.test(f)).sort()) {
      const result = await auditFeatFile(path.join(stateDir, filename), filename, repoPath, sourceFiles);
      if (result) results.push(result);
    }
  }

  return results;
}
