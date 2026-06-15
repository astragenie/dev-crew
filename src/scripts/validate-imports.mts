/**
 * Enforces the slice-linker sub-module boundary:
 * files under src/scripts/ (excluding the barrel and sub-modules themselves)
 * must not import slice-linker sub-modules directly.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SRC_SCRIPTS = resolve("src/scripts");
const BARREL = resolve("src/scripts/lib/slice-linker.mts");
const LINKER_DIR = resolve("src/scripts/lib/slice-linker");

const BLOCKED_PATTERNS = [
  /slice-linker\/feature-lifecycle/,
  /slice-linker\/complete-slice/,
  /slice-linker\/start-slice/,
  /slice-linker\/dispatch/,
  /slice-linker\/crew-bridge/,
  /slice-linker\/slice-progress/,
  /slice-linker\/agent-report-writer/
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

async function main(): Promise<void> {
  const files = await collectMts(SRC_SCRIPTS);
  const violations: string[] = [];

  for (const file of files) {
    const abs = resolve(file);
    if (abs === BARREL) continue;
    if (abs.startsWith(LINKER_DIR + "\\") || abs.startsWith(LINKER_DIR + "/")) continue;

    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      if (!line.includes("import")) continue;
      for (const pat of BLOCKED_PATTERNS) {
        if (pat.test(line)) {
          violations.push(
            `${relative(".", file)}:${i + 1}: direct sub-module import blocked — use slice-linker barrel instead\n  ${line.trim()}`
          );
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("Slice-linker boundary violations:\n" + violations.join("\n"));
    process.exit(1);
  }
  console.log("validate-imports: OK");
}

main();
