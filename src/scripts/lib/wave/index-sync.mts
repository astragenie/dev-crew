// src/scripts/lib/wave/index-sync.mts
// Helper for `.claude/artifacts/loop/waves/index.json`. Appends a new
// rolling-50 entry, writes the file, and fans out `wave.index_updated`
// with the full updated array so the runner dashboard can refresh its
// wave list without scanning per-wave artifacts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fanoutEnvelope } from "../webhook-fanout.mjs";

const INDEX_CAP = 50;

export type WaveIndexEntry = {
  waveId: string;
  size: number;
  passCount: number;
  failCount: number;
  postMergeTest: "PASS" | "FAIL" | "skipped";
  durationMs: number;
};

/**
 * Append one entry to `.claude/artifacts/loop/waves/index.json`, capped at
 * 50 rolling entries. Writes the file, then fires `wave.index_updated`
 * webhook fanout with the full updated array as `payload.index`.
 *
 * Returns the entries written to disk after the append + cap.
 */
export async function appendWaveIndexEntry(
  repoRoot: string,
  artifactsRoot: string,
  entry: WaveIndexEntry
): Promise<WaveIndexEntry[]> {
  const dir = join(repoRoot, artifactsRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, "index.json");
  const existing: { entries: WaveIndexEntry[] } = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as { entries: WaveIndexEntry[] })
    : { entries: [] };
  existing.entries.push(entry);
  if (existing.entries.length > INDEX_CAP) {
    existing.entries = existing.entries.slice(-INDEX_CAP);
  }
  writeFileSync(path, JSON.stringify(existing, null, 2), "utf8");

  // M2 (L2-3): fan out the full updated array so runner dashboards can
  // refresh their wave-list view in one pass. Fail-silent.
  await fanoutEnvelope(repoRoot, "wave.index_updated", {
    waveId: entry.waveId,
    index: existing.entries
  });

  return existing.entries;
}
