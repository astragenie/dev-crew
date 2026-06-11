// Fanout marker: write/read a lightweight JSON marker file under
// .claude/artifacts/loop/fanout-markers/<sliceId>.json when the
// post-builder-fanout CLI subcommand is invoked.
//
// Both functions are best-effort — fs errors are caught and swallowed.
// No resolveConfig import. No process.exit.

import fs from "node:fs/promises";
import path from "node:path";

const MARKER_DIR_PARTS = [".claude", "artifacts", "loop", "fanout-markers"];

export type FanoutMarker = {
  sliceId: string;
  taskCount: number;
  ts: string;
};

export async function writeFanoutMarker(
  repoPath: string,
  sliceId: string,
  taskCount: number
): Promise<void> {
  try {
    const dir = path.join(repoPath, ...MARKER_DIR_PARTS);
    await fs.mkdir(dir, { recursive: true });
    const marker: FanoutMarker = { sliceId, taskCount, ts: new Date().toISOString() };
    await fs.writeFile(path.join(dir, `${sliceId}.json`), JSON.stringify(marker, null, 2), "utf8");
  } catch {
    // best-effort — never throws
  }
}

export async function readFanoutMarker(
  repoPath: string,
  sliceId: string
): Promise<FanoutMarker | null> {
  try {
    const file = path.join(repoPath, ...MARKER_DIR_PARTS, `${sliceId}.json`);
    const raw = await fs.readFile(file, "utf8");
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof obj.sliceId === "string" &&
      typeof obj.taskCount === "number" &&
      typeof obj.ts === "string"
    ) {
      return { sliceId: obj.sliceId, taskCount: obj.taskCount, ts: obj.ts };
    }
    return null;
  } catch {
    return null;
  }
}
