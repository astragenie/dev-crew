import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./paths.mjs";

// Feeds repeated grade lessons to the operator for promotion consideration.
// Foundation for FEAT-179 decay-ranked learnings injection.

export interface LessonEntry {
  slug: string; // slugified first ~6 words of lesson text
  text: string; // original lesson text
  count: number; // occurrences across scanned grades
  gradeFiles: string[]; // which grade files it appeared in
}

export interface RatchetResult {
  repeated: LessonEntry[]; // count >= minRepeats (default 2)
  singleton: LessonEntry[]; // count === 1
  scannedCount: number; // number of grade files scanned
}

/**
 * Slugify the first 6 words of a lesson text.
 * Lowercase, replace non-alphanumeric runs with a dash, trim leading/trailing dashes.
 * Note: two distinct lessons sharing the same first 6 words map to the same slug — counts
 * are merged intentionally (treat as the same lesson). This is a known design tradeoff.
 */
export function slugifyLesson(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 6).join(" ");
  return words
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseListSection(body: string, sectionHeader: string): string[] {
  const items: string[] = [];
  const lines = body.split("\n");
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (new RegExp(`^##\\s+${sectionHeader}\\b`, "i").test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(trimmed)) break;
    if (!inSection) continue;
    const m = trimmed.match(/^-\s+(.+)$/);
    if (m && m[1]!.trim()) items.push(m[1]!.trim());
  }
  return items;
}

const GRADE_FILE_RE_LEGACY = /^SLICE-(\d+)-grade\.md$/i;
const GRADE_FILE_RE_NEW = /^\d{8}T\d{6}Z-.*-grade\.md$/i;

function isGradeFile(filename: string): boolean {
  return GRADE_FILE_RE_LEGACY.test(filename) || GRADE_FILE_RE_NEW.test(filename);
}

/**
 * Scan grade files and collect repeated lessons/followups.
 *
 * @param gradesDir - Absolute path to the grades directory.
 * @param opts.maxGrades - Maximum number of most-recent grade files to read (default 20).
 * @param opts.minRepeats - Minimum occurrences to count as "repeated" (default 2).
 */
export async function scanGradeLessons(
  gradesDir: string,
  opts?: { maxGrades?: number; minRepeats?: number }
): Promise<RatchetResult> {
  const maxGrades = opts?.maxGrades ?? 20;
  const minRepeats = opts?.minRepeats ?? 2;

  if (!(await pathExists(gradesDir))) {
    return { repeated: [], singleton: [], scannedCount: 0 };
  }

  const allFiles = await fs.readdir(gradesDir);
  const gradeFiles = allFiles
    .filter((f) => f.endsWith(".md") && isGradeFile(f))
    .sort() // ISO timestamp prefix sorts chronologically
    .slice(-maxGrades); // take most-recent N

  // slug -> LessonEntry accumulator
  const bySlug = new Map<string, LessonEntry>();

  for (const filename of gradeFiles) {
    const filePath = path.join(gradesDir, filename);
    let body: string;
    try {
      body = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    // Strip frontmatter before parsing sections
    const bodyContent = body.startsWith("---") ? body.replace(/^---[\s\S]*?---\n?/, "") : body;

    const items = [
      ...parseListSection(bodyContent, "Lessons"),
      ...parseListSection(bodyContent, "Followups")
    ];

    for (const text of items) {
      const slug = slugifyLesson(text);
      if (!slug) continue;
      const existing = bySlug.get(slug);
      if (existing) {
        existing.count += 1;
        if (!existing.gradeFiles.includes(filename)) {
          existing.gradeFiles.push(filename);
        }
      } else {
        bySlug.set(slug, { slug, text, count: 1, gradeFiles: [filename] });
      }
    }
  }

  const allEntries = [...bySlug.values()];
  const repeated = allEntries.filter((e) => e.count >= minRepeats);
  const singleton = allEntries.filter((e) => e.count === 1);

  // Sort repeated by count desc, then slug asc for determinism
  repeated.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  singleton.sort((a, b) => a.slug.localeCompare(b.slug));

  return { repeated, singleton, scannedCount: gradeFiles.length };
}
