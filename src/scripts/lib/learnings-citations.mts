// Learning citations — append citation records and update utility scores.
// FEAT-179 / SLICE-130

import fs from "node:fs/promises";
import path from "node:path";

import type { LearningEntry } from "./learnings-decay.mjs";

// ---------------------------------------------------------------------------
// Internal I/O helpers (exported for test injection)
// ---------------------------------------------------------------------------

export const _internals = {
  readFile: (p: string) => fs.readFile(p, "utf8"),
  appendFile: (p: string, data: string) => fs.appendFile(p, data, "utf8"),
  writeFile: (p: string, data: string) => fs.writeFile(p, data, "utf8"),
  mkdir: (p: string) => fs.mkdir(p, { recursive: true })
};

// ---------------------------------------------------------------------------
// appendCitation
// ---------------------------------------------------------------------------

/**
 * Append one citation record to <artifactDir>/citations.jsonl.
 * Creates the file and its parent directory if absent.
 *
 * Record shape: { sliceId, learningIds, retrievedAt: ISO-8601 }
 */
export async function appendCitation(
  sliceId: string,
  learningIds: string[],
  artifactDir: string
): Promise<void> {
  await _internals.mkdir(artifactDir);
  const citationsFile = path.join(artifactDir, "citations.jsonl");
  const record = {
    sliceId,
    learningIds,
    retrievedAt: new Date().toISOString()
  };
  await _internals.appendFile(citationsFile, JSON.stringify(record) + "\n");
}

// ---------------------------------------------------------------------------
// updateUtilityScoreInStore
// ---------------------------------------------------------------------------

/**
 * Update the utility_score of a single learning entry in the JSONL store.
 *
 * - pass: +1 to utility_score (no floor)
 * - fail: -2 to utility_score, floored at 0
 * - unknown id: no-op (returns without error)
 *
 * Reads the entire file, mutates the matching entry in memory, then rewrites.
 * Entries that are not valid JSON objects or lack an `id` field are preserved
 * verbatim to avoid data loss.
 */
export async function updateUtilityScoreInStore(
  learningId: string,
  outcome: "pass" | "fail",
  storeFile: string
): Promise<void> {
  let raw: string;
  try {
    raw = await _internals.readFile(storeFile);
  } catch {
    // file absent — nothing to update
    return;
  }

  const lines = raw.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line; // preserve blank lines
    let entry: LearningEntry & Record<string, unknown>;
    try {
      entry = JSON.parse(trimmed) as LearningEntry & Record<string, unknown>;
    } catch {
      return line; // preserve malformed lines verbatim
    }
    if (String(entry.id) !== String(learningId)) return line;

    found = true;
    const current = typeof entry.utility_score === "number" ? entry.utility_score : 0;
    const delta = outcome === "pass" ? 1 : -2;
    entry.utility_score = Math.max(0, current + delta);
    return JSON.stringify(entry);
  });

  if (!found) return; // unknown id — no-op

  await _internals.writeFile(storeFile, updated.join("\n"));
}
