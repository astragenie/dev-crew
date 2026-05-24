import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";

// Reads every FEAT-NNN.md under docs/backlog/<state>/ and returns a flat array
// of entries. State is inferred from the parent directory name; if frontmatter
// has a conflicting `status`, the directory wins because file-moves are the
// state-of-truth in this state-machine.

export const BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];

const FEATURE_FILE_RE = /^FEAT-(\d+)(?:-.*)?\.md$/;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function backlogRoot(repoPath, config) {
  return path.join(repoPath, config?.backlog?.root || "docs/backlog");
}

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
async function readEntry(filePath, state) {
  const filename = path.basename(filePath);
  const match = filename.match(FEATURE_FILE_RE);
  if (!match) return null;
  const idNumber = Number(match[1]);
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
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

export async function listBacklog(repoPath, options = {}) {
  const root = backlogRoot(repoPath, options.config);
  const entries = [];
  for (const state of BACKLOG_STATES) {
    const dir = path.join(root, state);
    if (!(await pathExists(dir))) continue;
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".md") || !FEATURE_FILE_RE.test(file)) continue;
      const entry = await readEntry(path.join(dir, file), state);
      if (entry) entries.push(entry);
    }
  }
  entries.sort((a, b) => a.idNumber - b.idNumber);
  return entries;
}

export async function nextFeatureId(repoPath, options = {}) {
  const entries = await listBacklog(repoPath, options);
  const max = entries.reduce((acc, e) => Math.max(acc, e.idNumber), 0);
  return `FEAT-${String(max + 1).padStart(3, "0")}`;
}

// Pick-order comparator for "next FEAT to work on" queries (brief topTriaged,
// memory-snapshot triagedTop, autonomous-loop Cross-Slice Continuation rule).
// Primary key: priority string ascending ("P0" < "P1" < "P2" < "P3"); missing
// priority sorts as "P3". Tiebreaker: lowest FEAT-NNN id ascending (oldest
// feature wins) — deterministic and independent of frontmatter timestamps,
// which batch triage collapses to a single value.
export function comparePickOrder(a, b) {
  const ap = a.frontmatter.priority || "P3";
  const bp = b.frontmatter.priority || "P3";
  if (ap !== bp) return ap.localeCompare(bp);
  return a.idNumber - b.idNumber;
}

export function filterBacklog(entries, filters = {}) {
  return entries.filter((entry) => {
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
