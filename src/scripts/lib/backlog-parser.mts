import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { readFrontmatterCached } from "./frontmatter-cache.mjs";
import { backlogRoot, pathExists } from "./paths.mjs";
import { cached } from "./cache.mjs";

export { backlogRoot };

export const BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];

const FEATURE_FILE_RE = /^FEAT-(\d+)(?:-.*)?\.md$/;

/**
 * @typedef {object} BacklogEntry
 * @property {string} id
 * @property {number} idNumber
 * @property {string} state
 * @property {string} filePath
 * @property {string} filename
 * @property {import("./frontmatter.mjs").Frontmatter} frontmatter
 * @property {string} body
 */

/**
 * @param {string} filePath
 * @param {string} state
 * @returns {Promise<BacklogEntry | null>}
 */
async function readEntry(filePath: string, state: string) {
  const filename = path.basename(filePath);
  const match = filename.match(FEATURE_FILE_RE);
  if (!match) return null;
  const idNumber = Number(match[1]);
  const mtime = (await fs.stat(filePath)).mtimeMs;
  const result = readFrontmatterCached(filePath, mtime, parseFrontmatter, (p) =>
    readFileSync(p, "utf8")
  );
  const { frontmatter, body } = result;
  return {
    id: frontmatter.id || `FEAT-${String(idNumber).padStart(3, "0")}`,
    idNumber,
    state,
    filePath,
    filename,
    frontmatter: { ...frontmatter, status: state },
    body
  };
}

async function readStateEntries(
  root: string,
  state: string
): Promise<Array<Awaited<ReturnType<typeof readEntry>>>> {
  const dir = path.join(root, state);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir);
  const results = await Promise.all(
    files
      .filter((file) => file.endsWith(".md") && FEATURE_FILE_RE.test(file))
      .map((file) => readEntry(path.join(dir, file), state))
  );
  return results.filter((e): e is NonNullable<typeof e> => e !== null);
}

export async function listBacklog(repoPath: string, options: Record<string, any> = {}) {
  const cacheKey = `listBacklog:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = backlogRoot(repoPath, options.config);
    // Win 2 + Win 5: read all backlog state dirs in parallel (single snapshot
    // per invocation via cache; parallel readdir across states).
    const perStateBatches = await Promise.all(
      BACKLOG_STATES.map((state) => readStateEntries(root, state))
    );
    const entries: any[] = perStateBatches.flat();
    entries.sort((a, b) => a.idNumber - b.idNumber);
    return entries;
  });
}

export async function nextFeatureId(repoPath: string, options: Record<string, any> = {}) {
  const entries = await listBacklog(repoPath, options);
  const max = entries.reduce(
    (acc: number, e: { idNumber: number }) => Math.max(acc, e.idNumber),
    0
  );
  return `FEAT-${String(max + 1).padStart(3, "0")}`;
}

// Pick-order comparator for "next FEAT to work on" queries (brief topTriaged,
// memory-snapshot triagedTop, autonomous-loop Cross-Slice Continuation rule).
// Primary key: priority string ascending ("P0" < "P1" < "P2" < "P3"); missing
// priority sorts as "P3". Tiebreaker: lowest FEAT-NNN id ascending (oldest
// feature wins) — deterministic and independent of frontmatter timestamps,
// which batch triage collapses to a single value.
export function comparePickOrder(a: Record<string, any>, b: Record<string, any>) {
  const ap = a.frontmatter.priority || "P3";
  const bp = b.frontmatter.priority || "P3";
  if (ap !== bp) return ap.localeCompare(bp);
  return a.idNumber - b.idNumber;
}

export function filterBacklog(entries: Record<string, any>[], filters: Record<string, any> = {}) {
  return entries.filter((entry: Record<string, any>) => {
    if (filters.status && entry.state !== filters.status) return false;
    if (filters.priority && entry.frontmatter.priority !== filters.priority) return false;
    if (filters.category && entry.frontmatter.category !== filters.category) return false;
    if (filters.target_release && entry.frontmatter.target_release !== filters.target_release)
      return false;
    if (filters.derived_from) {
      const df = entry.frontmatter.derived_from;
      const list = Array.isArray(df) ? df : df ? [df] : [];
      if (!list.includes(filters.derived_from)) return false;
    }
    return true;
  });
}
