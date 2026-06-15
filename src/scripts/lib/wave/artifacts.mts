import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WaveResult } from "./types.mjs";
import { appendWaveIndexEntry, type WaveIndexEntry } from "./index-sync.mjs";

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeWaveArtifacts(
  repoRoot: string,
  result: WaveResult,
  artifactsRoot: string
): void {
  const baseDir = join(repoRoot, artifactsRoot, result.waveId);
  ensureDir(baseDir);
  writeFileSync(join(baseDir, "plan.json"), JSON.stringify(result.plan, null, 2), "utf8");
  writeFileSync(join(baseDir, "wave-result.json"), JSON.stringify(result, null, 2), "utf8");
  for (const wr of result.worktreeResults) {
    writeFileSync(join(baseDir, `${wr.sliceId}-marker.json`), JSON.stringify(wr, null, 2), "utf8");
  }
}

export type IndexEntry = WaveIndexEntry;

/**
 * Append a rolling index entry for the completed wave and trigger
 * `wave.index_updated` fanout. Fire-and-forget on the fanout — the JSONL
 * + index.json on disk are authoritative.
 */
export function updateIndex(repoRoot: string, result: WaveResult, artifactsRoot: string): void {
  void appendWaveIndexEntry(repoRoot, artifactsRoot, {
    waveId: result.waveId,
    size: result.plan.size,
    passCount: result.mergedBranches.length,
    failCount: result.failedBranches.length,
    postMergeTest: result.postMergeTest.status,
    durationMs: result.durationMs
  });
}
