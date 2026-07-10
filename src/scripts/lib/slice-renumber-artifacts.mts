// Artifact-scanning helpers for the FEAT-257 SLICE-B renumber CLI
// (slice-renumber.mts). Split out to keep slice-renumber.mts under the
// repo's ~400-line convention — this half owns "which files on disk
// reference a slice id and what would their renamed basename be", the
// orchestrator owns "do the rename + update the rest of the state".
//
// Two independent id-encodings show up on disk (DEC-079 Context):
//   1. The KIND_REGISTRY tight token buildArtifactSlug produces today —
//      one dash-separated component, e.g. "slice148" (see artifact-naming.mts).
//   2. A legacy/crew-slugified kebab form that keeps "slice" and the number
//      as two adjacent dash components, e.g. "...-slice-147-review.md" —
//      observed on disk for crew-owned review-result files (including the
//      real FEAT-244/FEAT-247 SLICE-147 collision this DEC was filed from).
// Both are matched as exact dash-split components (never a substring), so
// slice37 can never accidentally match slice370's file.

import fs from "node:fs/promises";
import path from "node:path";

import { buildArtifactSlug } from "./artifact-naming.mjs";
import { pathExists } from "./paths.mjs";
import { TRAJECTORY_DIR } from "./trajectory-writer.mjs";
import { MARKER_DIR_PARTS } from "./shape-marker.mjs";

/** The KIND_REGISTRY tight-token form of a slice id — reuses buildArtifactSlug's own logic rather than hand-rolling the same transform. */
export function tightSliceToken(sliceId: string): string {
  return buildArtifactSlug({ sliceId });
}

function bareSliceNumber(sliceId: string): string {
  return sliceId.replace(/^SLICE-/i, "");
}

interface SliceIdComponentLocation {
  index: number;
  span: 1 | 2;
}

function locateSliceIdComponent(parts: string[], sliceId: string): SliceIdComponentLocation | null {
  const tight = tightSliceToken(sliceId);
  const tightIdx = parts.indexOf(tight);
  if (tightIdx !== -1) return { index: tightIdx, span: 1 };

  const num = bareSliceNumber(sliceId);
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "slice" && parts[i + 1] === num) return { index: i, span: 2 };
  }
  return null;
}

/** True when `basename` (a KIND_REGISTRY-style artifact filename) already carries `sliceId` in either encoding. */
export function basenameReferencesSliceId(basename: string, sliceId: string): boolean {
  const ext = path.extname(basename);
  const stem = basename.slice(0, basename.length - ext.length);
  return locateSliceIdComponent(stem.split("-"), sliceId) !== null;
}

/** Returns the renamed basename for `fromId` -> `toId`, or null when `basename` doesn't reference `fromId`. */
export function renameBasenameForSlice(
  basename: string,
  fromId: string,
  toId: string
): string | null {
  const ext = path.extname(basename);
  const stem = basename.slice(0, basename.length - ext.length);
  const parts = stem.split("-");
  const loc = locateSliceIdComponent(parts, fromId);
  if (!loc) return null;
  if (loc.span === 1) {
    parts[loc.index] = tightSliceToken(toId);
  } else {
    parts[loc.index + 1] = bareSliceNumber(toId);
  }
  return `${parts.join("-")}${ext}`;
}

/** Recursively lists every file under `rootDir`, skipping any directory under `excludeDirs`. */
export async function walkFiles(rootDir: string, excludeDirs: string[]): Promise<string[]> {
  if (!(await pathExists(rootDir))) return [];
  const excluded = excludeDirs.map((d) => path.resolve(d));
  const isExcluded = (dir: string) =>
    excluded.some((ex) => dir === ex || dir.startsWith(ex + path.sep));

  const files: string[] = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (isExcluded(path.resolve(current))) continue;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  return files;
}

export interface KindRegistryMatch {
  file: string;
  targetBasename: string;
}

/** Every KIND_REGISTRY-surface artifact under `artifactsRootDir` that references `fromId`, paired with its renamed basename. */
export async function findKindRegistryFiles(
  artifactsRootDir: string,
  excludeDirs: string[],
  fromId: string,
  toId: string
): Promise<KindRegistryMatch[]> {
  const files = await walkFiles(artifactsRootDir, excludeDirs);
  const matches: KindRegistryMatch[] = [];
  for (const file of files) {
    const targetBasename = renameBasenameForSlice(path.basename(file), fromId, toId);
    if (targetBasename) matches.push({ file, targetBasename });
  }
  return matches;
}

/** True when any KIND_REGISTRY-surface artifact under `artifactsRootDir` already references `sliceId`. */
export async function anyArtifactReferencesSliceId(
  artifactsRootDir: string,
  excludeDirs: string[],
  sliceId: string
): Promise<boolean> {
  const files = await walkFiles(artifactsRootDir, excludeDirs);
  return files.some((f) => basenameReferencesSliceId(path.basename(f), sliceId));
}

/**
 * The three bespoke-path families that bypass buildArtifactFilename
 * entirely and key straight off the raw sliceId (DEC-079 Context): the
 * per-slice trajectory + events JSONL under trajectories/, and the
 * shape-marker JSON. (The slice markdown file itself is the third bespoke
 * family — handled separately via BacklogStore's renameSliceId, not here.)
 */
export async function findBespokeFiles(repoPath: string, sliceId: string): Promise<string[]> {
  const trajDir = path.join(repoPath, TRAJECTORY_DIR);
  const shapeDir = path.join(repoPath, ...MARKER_DIR_PARTS);
  const found: string[] = [];

  if (await pathExists(trajDir)) {
    for (const name of await fs.readdir(trajDir)) {
      if (name.startsWith(`${sliceId}-`)) found.push(path.join(trajDir, name));
    }
  }
  const shapeFile = path.join(shapeDir, `${sliceId}.json`);
  if (await pathExists(shapeFile)) found.push(shapeFile);
  return found;
}
