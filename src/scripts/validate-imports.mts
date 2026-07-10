/**
 * Enforces sub-module import boundaries: files under src/scripts/ (excluding
 * a barrel and its own sub-modules) must not import that barrel's
 * sub-modules directly — they must go through the barrel.
 *
 * Three boundaries are enforced today: slice-linker.mts / slice-linker/,
 * watch.mts / watch/ (FEAT-242 contract §3 — the watch/ boundary mirrors the
 * slice-linker precedent verbatim), and backlog-store.mts / backlog-store/
 * (FEAT-262 — same precedent again for the feature/slice-store split).
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SRC_SCRIPTS = resolve("src/scripts");

interface ModuleBoundary {
  barrel: string;
  dir: string;
  blockedPatterns: RegExp[];
}

const BOUNDARIES: ModuleBoundary[] = [
  {
    barrel: resolve("src/scripts/lib/slice-linker.mts"),
    dir: resolve("src/scripts/lib/slice-linker"),
    blockedPatterns: [
      /slice-linker\/feature-lifecycle/,
      /slice-linker\/complete-slice/,
      /slice-linker\/start-slice/,
      /slice-linker\/dispatch/,
      /slice-linker\/crew-bridge/,
      /slice-linker\/slice-progress/,
      /slice-linker\/agent-report-writer/
    ]
  },
  {
    barrel: resolve("src/scripts/lib/watch.mts"),
    dir: resolve("src/scripts/lib/watch"),
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
    barrel: resolve("src/scripts/lib/backlog-store.mts"),
    dir: resolve("src/scripts/lib/backlog-store"),
    blockedPatterns: [
      /backlog-store\/feature-store/,
      /backlog-store\/slice-store/,
      /backlog-store\/shared/
    ]
  }
];

async function collectMts(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await collectMts(full)));
    else if (e.name.endsWith(".mts")) files.push(full);
  }
  return files;
}

function isInsideBoundary(abs: string, boundary: ModuleBoundary): boolean {
  return (
    abs === boundary.barrel ||
    abs.startsWith(`${boundary.dir}\\`) ||
    abs.startsWith(`${boundary.dir}/`)
  );
}

function findBoundaryViolations(file: string, content: string, boundary: ModuleBoundary): string[] {
  const violations: string[] = [];
  const barrelName = relative(".", boundary.barrel);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !line.includes("import")) continue;
    if (!boundary.blockedPatterns.some((pat) => pat.test(line))) continue;
    violations.push(
      `${relative(".", file)}:${i + 1}: direct sub-module import blocked — use ${barrelName} barrel instead\n  ${line.trim()}`
    );
  }
  return violations;
}

async function checkFile(file: string): Promise<string[]> {
  const abs = resolve(file);
  const applicableBoundaries = BOUNDARIES.filter((boundary) => !isInsideBoundary(abs, boundary));
  if (applicableBoundaries.length === 0) return [];

  const content = await readFile(file, "utf8");
  return applicableBoundaries.flatMap((boundary) =>
    findBoundaryViolations(file, content, boundary)
  );
}

async function main(): Promise<void> {
  const files = await collectMts(SRC_SCRIPTS);
  const violationLists = await Promise.all(files.map(checkFile));
  const violations = violationLists.flat();

  if (violations.length > 0) {
    console.error(`Module boundary violations:\n${violations.join("\n")}`);
    process.exit(1);
  }
  console.log("validate-imports: OK");
}

main();
