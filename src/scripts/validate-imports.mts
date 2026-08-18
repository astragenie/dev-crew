#!/usr/bin/env node
/**
 * Enforces sub-module import boundaries: files under src/scripts/ (excluding
 * a barrel and its own sub-modules) must not import that barrel's
 * sub-modules directly — they must go through the barrel.
 *
 * Three boundaries are enforced today: slice-linker.mts / slice-linker/,
 * watch.mts / watch/ (FEAT-242 contract §3 — the watch/ boundary mirrors the
 * slice-linker precedent verbatim), and backlog-store.mts / backlog-store/
 * (FEAT-262 — same precedent again for the feature/slice-store split).
 *
 * blockedPatterns is an explicit per-module allowlist, NOT a glob over the
 * boundary directory — a new sub-module added under slice-linker/, watch/,
 * or backlog-store/ is silently unguarded until its pattern is added here
 * (rev-537 finding: qa-gate-preflight.mts and artifact-lock-writer.mts
 * shipped in FEAT-264 without a corresponding entry).
 */
import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ImportBoundaryFinding {
  file: string;
  line: number;
  barrel: string;
  detail: string;
}

interface ModuleBoundary {
  /** Barrel file, relative to repo root, POSIX-style. */
  barrelRel: string;
  /** Sub-module directory, relative to repo root, POSIX-style. */
  dirRel: string;
  blockedPatterns: RegExp[];
}

const BOUNDARIES: ModuleBoundary[] = [
  {
    barrelRel: "src/scripts/lib/slice-linker.mts",
    dirRel: "src/scripts/lib/slice-linker",
    blockedPatterns: [
      /slice-linker\/feature-lifecycle/,
      /slice-linker\/complete-slice/,
      /slice-linker\/start-slice/,
      /slice-linker\/dispatch/,
      /slice-linker\/crew-bridge/,
      /slice-linker\/slice-progress/,
      /slice-linker\/agent-report-writer/,
      /slice-linker\/artifact-lock-writer/,
      /slice-linker\/qa-gate-preflight/
    ]
  },
  {
    barrelRel: "src/scripts/lib/watch.mts",
    dirRel: "src/scripts/lib/watch",
    blockedPatterns: [
      /watch\/types/,
      /watch\/registry/,
      /watch\/state/,
      /watch\/claims/,
      /watch\/spawn-gate/,
      /watch\/envelopes/,
      /watch\/tick/,
      /watch\/sweep/,
      /watch\/ledger/,
      /watch\/config/,
      /watch\/reaction-spawn/
    ]
  },
  {
    barrelRel: "src/scripts/lib/backlog-store.mts",
    dirRel: "src/scripts/lib/backlog-store",
    blockedPatterns: [
      /backlog-store\/feature-store/,
      /backlog-store\/slice-store/,
      /backlog-store\/shared/
    ]
  }
];

async function collectMts(dir: string): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await collectMts(full)));
    else if (e.name.endsWith(".mts")) files.push(full);
  }
  return files;
}

function isInsideBoundary(fileRel: string, boundary: ModuleBoundary): boolean {
  return (
    fileRel === boundary.barrelRel ||
    fileRel === `${boundary.dirRel}/` ||
    fileRel.startsWith(`${boundary.dirRel}/`)
  );
}

function findBoundaryViolations(
  fileRel: string,
  content: string,
  boundary: ModuleBoundary
): ImportBoundaryFinding[] {
  const violations: ImportBoundaryFinding[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !line.includes("import")) continue;
    if (!boundary.blockedPatterns.some((pat) => pat.test(line))) continue;
    violations.push({
      file: fileRel,
      line: i + 1,
      barrel: boundary.barrelRel,
      detail: `direct sub-module import blocked — use ${boundary.barrelRel} barrel instead\n  ${line.trim()}`
    });
  }
  return violations;
}

function checkFileContent(fileRel: string, content: string): ImportBoundaryFinding[] {
  const applicableBoundaries = BOUNDARIES.filter(
    (boundary) => !isInsideBoundary(fileRel, boundary)
  );
  return applicableBoundaries.flatMap((boundary) =>
    findBoundaryViolations(fileRel, content, boundary)
  );
}

export async function validateImports(
  repoRoot: string
): Promise<{ ok: boolean; violations: ImportBoundaryFinding[] }> {
  const scriptsDir = path.join(repoRoot, "src/scripts");
  const files = await collectMts(scriptsDir);
  const findingLists = await Promise.all(
    files.map(async (file) => {
      const fileRel = path.relative(repoRoot, file).replace(/\\/g, "/");
      const content = await readFile(file, "utf8");
      return checkFileContent(fileRel, content);
    })
  );
  const violations = findingLists.flat();
  return { ok: violations.length === 0, violations };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateImports(repoRoot);
  if (!result.ok) {
    console.error(
      `Module boundary violations:\n${result.violations
        .map((v) => `${v.file}:${v.line}: ${v.detail}`)
        .join("\n")}`
    );
    process.exitCode = 1;
  } else {
    console.log("validate-imports: OK");
  }
}
