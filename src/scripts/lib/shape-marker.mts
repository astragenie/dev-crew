// Shape marker: write/read a lightweight JSON marker file under
// .claude/artifacts/loop/shape-markers/<sliceId>.json when the
// classify-slice-shape step runs during slice-start ceremony.
//
// Both functions are best-effort — fs errors are caught and swallowed.
// No resolveConfig import. No process.exit.

import fs from "node:fs/promises";
import path from "node:path";

import { safeSliceId } from "./slice-id-guard.mjs";

const MARKER_DIR_PARTS = [".claude", "artifacts", "loop", "shape-markers"];

export type ShapeMarker = {
  sliceId: string;
  shape: string;
  rationale: string;
  inlinePath: boolean;
  ts: string;
};

export async function writeShapeMarker(
  repoPath: string,
  sliceId: string,
  shape: string,
  rationale: string,
  inlinePath: boolean
): Promise<void> {
  try {
    const id = safeSliceId(sliceId);
    const dir = path.join(repoPath, ...MARKER_DIR_PARTS);
    await fs.mkdir(dir, { recursive: true });
    const payload: ShapeMarker = {
      sliceId: id,
      shape,
      rationale,
      inlinePath,
      ts: new Date().toISOString()
    };
    await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // best-effort — never throws
  }
}

export async function readShapeMarker(
  repoPath: string,
  sliceId: string
): Promise<ShapeMarker | null> {
  try {
    const id = safeSliceId(sliceId);
    const file = path.join(repoPath, ...MARKER_DIR_PARTS, `${id}.json`);
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed?.sliceId !== "string" ||
      typeof parsed?.shape !== "string" ||
      typeof parsed?.rationale !== "string" ||
      typeof parsed?.inlinePath !== "boolean" ||
      typeof parsed?.ts !== "string"
    ) {
      return null;
    }
    return parsed as ShapeMarker;
  } catch {
    return null;
  }
}
