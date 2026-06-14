import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { WaveResult } from "./types.mjs";

const INDEX_CAP = 50;

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

export type IndexEntry = {
  waveId: string;
  size: number;
  passCount: number;
  failCount: number;
  postMergeTest: WaveResult["postMergeTest"]["status"];
  durationMs: number;
};

export function updateIndex(repoRoot: string, result: WaveResult, artifactsRoot: string): void {
  const dir = join(repoRoot, artifactsRoot);
  ensureDir(dir);
  const path = join(dir, "index.json");
  const existing: { entries: IndexEntry[] } = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { entries: [] };
  existing.entries.push({
    waveId: result.waveId,
    size: result.plan.size,
    passCount: result.mergedBranches.length,
    failCount: result.failedBranches.length,
    postMergeTest: result.postMergeTest.status,
    durationMs: result.durationMs
  });
  if (existing.entries.length > INDEX_CAP) {
    existing.entries = existing.entries.slice(-INDEX_CAP);
  }
  writeFileSync(path, JSON.stringify(existing, null, 2), "utf8");
}
