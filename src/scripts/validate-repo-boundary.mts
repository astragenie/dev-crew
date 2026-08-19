#!/usr/bin/env node
/**
 * Enforces the root<->crew/ import direction boundary (FEAT-013, SLICE-34).
 * See docs/planning/feat-013-boundary-contract.md for the design writeup.
 *
 * This is a NEW validator, not an extension of validate-imports.mts — that
 * script enforces a different concern (sub-module barrel boundaries INSIDE
 * src/scripts/: slice-linker/, watch/, backlog-store/). It says nothing
 * about crew/.
 *
 * Two rules, both driven by real path resolution (not string matching —
 * `crew/tests/../hooks/lib/x.mjs` string-matches "hooks/" but resolves back
 * inside crew/, and must not be flagged):
 *
 *   1. root-to-crew: a file under src/** or hooks/** (i.e. outside crew/)
 *      importing a module whose resolved path lands inside crew/ must be on
 *      ALLOWED_CROSS_IMPORTS below, or it fails.
 *   2. crew-to-root: a file under crew/** importing a module whose resolved
 *      path lands outside crew/ always fails — zero-entry allowlist. A
 *      repo-wide sweep of every relative import in crew/'s .mts tree
 *      (2026-08-19, this slice) found no genuine escape once resolved for real, so the
 *      empty allowlist reflects current ground truth, not an aspiration.
 *
 * ALLOWED_CROSS_IMPORTS ground truth vs. the contract doc: the contract's
 * evidence section only grepped hooks/pre-push-gate.mts and named it as
 * "the one sanctioned cross-import" (4 modules), flagging its own evidence
 * budget as non-exhaustive. This slice's repo-wide grep found two more
 * files already shipping legitimate root->crew imports —
 * src/scripts/lib/slice-linker/crew-bridge.mts (5 modules) and
 * src/scripts/lib/phase-gate.mts (1 module) — for 10 entries total across 3
 * files, not 4 across 1. Both are kept on the allowlist here (not touched
 * or moved — out of this slice's scope) so this gate reflects what the repo
 * actually does today; see the slice's final synthesis for the full
 * discrepancy writeup against the contract doc.
 *
 * hooks.json crew-path inventory: `checkInventoryDrift`/`writeInventory`
 * below regenerate docs/planning/hooksjson-crew-path-inventory.json from
 * .claude-plugin/hooks/hooks.json via a structural JSON walk (not regex —
 * the contract doc's own note: regex over the raw file undercounts). The
 * default CLI invocation runs both the boundary check and the inventory
 * drift check; `--write-inventory` regenerates the inventory file instead.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface BoundaryFinding {
  file: string;
  line: number;
  importSpec: string;
  resolvedImport: string;
  direction: "root-to-crew" | "crew-to-root";
}

interface AllowedCrossImport {
  file: string;
  crewModule: string;
}

export const ALLOWED_CROSS_IMPORTS: ReadonlyArray<AllowedCrossImport> = [
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/hooks/hook-error.mjs" },
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/scripts/lib/features-service.mjs" },
  {
    file: "hooks/pre-push-gate.mts",
    crewModule: "crew/scripts/lib/briefing/collect-cost-parser.mjs"
  },
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/scripts/lib/docs-only.mjs" },
  {
    file: "src/scripts/lib/slice-linker/crew-bridge.mts",
    crewModule: "crew/scripts/lib/artifacts/write.mjs"
  },
  {
    file: "src/scripts/lib/slice-linker/crew-bridge.mts",
    crewModule: "crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs"
  },
  {
    file: "src/scripts/lib/slice-linker/crew-bridge.mts",
    crewModule: "crew/scripts/lib/cost-hygiene/cost-advise-writer.mjs"
  },
  {
    file: "src/scripts/lib/slice-linker/crew-bridge.mts",
    crewModule: "crew/scripts/lib/cost-advisor.mjs"
  },
  {
    file: "src/scripts/lib/slice-linker/crew-bridge.mts",
    crewModule: "crew/scripts/lib/workflow-state.mjs"
  },
  {
    file: "src/scripts/lib/phase-gate.mts",
    crewModule: "crew/scripts/lib/artifacts/validation-result-writer.mjs"
  }
];

const SCAN_ROOTS_OUTSIDE_CREW = ["src", "hooks"];
const CREW_ROOT = "crew";
const HOOKS_JSON_REL = ".claude-plugin/hooks/hooks.json";
const INVENTORY_OUTPUT_REL = "docs/planning/hooksjson-crew-path-inventory.json";

async function collectSourceFiles(dir: string): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await collectSourceFiles(full)));
    else if (e.name.endsWith(".mts") || e.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

interface RawImport {
  line: number;
  spec: string;
}

// Matches the module specifier on a `from "..."` clause regardless of
// whether the import/export bindings span multiple lines above it (e.g.
// `import {\n  a,\n  b\n} from "../x.mjs";` — the "from" line is what
// matters, not whether the literal word "import" appears on that line).
function extractRelativeImports(content: string): RawImport[] {
  const found: RawImport[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null = re.exec(content);
  while (m !== null) {
    const spec = m[1];
    if (spec?.startsWith(".")) {
      const line = content.slice(0, m.index).split("\n").length;
      found.push({ line, spec });
    }
    m = re.exec(content);
  }
  return found;
}

function resolveSpec(fileAbs: string, spec: string, repoRoot: string): string {
  const resolved = path.resolve(path.dirname(fileAbs), spec);
  return path.relative(repoRoot, resolved).replace(/\\/g, "/");
}

function isInsideCrew(resolvedRel: string): boolean {
  return resolvedRel === CREW_ROOT || resolvedRel.startsWith(`${CREW_ROOT}/`);
}

function isAllowed(fileRel: string, resolvedRel: string): boolean {
  return ALLOWED_CROSS_IMPORTS.some(
    (entry) => entry.file === fileRel && entry.crewModule === resolvedRel
  );
}

async function scanDirection(
  repoRoot: string,
  scanDirs: string[],
  direction: BoundaryFinding["direction"],
  isViolation: (resolvedRel: string) => boolean,
  fileFilter: (fileRel: string, resolvedRel: string) => boolean
): Promise<BoundaryFinding[]> {
  const violations: BoundaryFinding[] = [];
  for (const scanDir of scanDirs) {
    const files = await collectSourceFiles(path.join(repoRoot, scanDir));
    for (const file of files) {
      const fileRel = path.relative(repoRoot, file).replace(/\\/g, "/");
      const content = await readFile(file, "utf8");
      for (const { line, spec } of extractRelativeImports(content)) {
        const resolvedRel = resolveSpec(file, spec, repoRoot);
        if (!isViolation(resolvedRel)) continue;
        if (!fileFilter(fileRel, resolvedRel)) continue;
        violations.push({
          file: fileRel,
          line,
          importSpec: spec,
          resolvedImport: resolvedRel,
          direction
        });
      }
    }
  }
  return violations;
}

export async function validateRepoBoundary(
  repoRoot: string
): Promise<{ ok: boolean; violations: BoundaryFinding[] }> {
  const rootToCrew = await scanDirection(
    repoRoot,
    SCAN_ROOTS_OUTSIDE_CREW,
    "root-to-crew",
    isInsideCrew,
    (fileRel, resolvedRel) => !isAllowed(fileRel, resolvedRel)
  );
  const crewToRoot = await scanDirection(
    repoRoot,
    [CREW_ROOT],
    "crew-to-root",
    (resolvedRel) => !isInsideCrew(resolvedRel),
    () => true
  );
  const violations = [...rootToCrew, ...crewToRoot];
  return { ok: violations.length === 0, violations };
}

interface InventoryEntry {
  path: string;
  command: string;
  matcherIndex: number;
}

type CrewPathInventory = Record<string, InventoryEntry[]>;

// Structural JSON walk (hooks[event][].hooks[].command), not regex over the
// raw file — matches the contract doc's own inventory-production method, so
// this stays reproducible against a re-parse rather than hand-transcription.
export function extractCrewPathInventory(hooksJson: unknown): CrewPathInventory {
  const inventory: CrewPathInventory = {};
  const events = (hooksJson as { hooks?: Record<string, unknown> })?.hooks ?? {};
  for (const [eventName, matcherBlocks] of Object.entries(events)) {
    if (!Array.isArray(matcherBlocks)) continue;
    matcherBlocks.forEach((matcherBlock, matcherIndex) => {
      const hooksArr = (matcherBlock as { hooks?: unknown })?.hooks;
      if (!Array.isArray(hooksArr)) return;
      for (const hook of hooksArr) {
        const command = (hook as { command?: unknown })?.command;
        if (typeof command !== "string") continue;
        const match = command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/(crew\/\S+?)["'\s]/);
        if (!match?.[1]) continue;
        const entries = inventory[eventName] ?? [];
        entries.push({ path: match[1], command, matcherIndex });
        inventory[eventName] = entries;
      }
    });
  }
  return inventory;
}

async function readHooksJson(repoRoot: string): Promise<unknown> {
  const raw = await readFile(path.join(repoRoot, HOOKS_JSON_REL), "utf8");
  return JSON.parse(raw);
}

function inventoryText(inventory: CrewPathInventory): string {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export async function checkInventoryDrift(
  repoRoot: string
): Promise<{ ok: boolean; detail?: string }> {
  const expected = inventoryText(extractCrewPathInventory(await readHooksJson(repoRoot)));
  const outputPath = path.join(repoRoot, INVENTORY_OUTPUT_REL);
  let onDisk: string;
  try {
    onDisk = await readFile(outputPath, "utf8");
  } catch {
    return {
      ok: false,
      detail: `${INVENTORY_OUTPUT_REL} is missing — run with --write-inventory to generate it`
    };
  }
  if (onDisk !== expected) {
    return {
      ok: false,
      detail: `${INVENTORY_OUTPUT_REL} is stale relative to ${HOOKS_JSON_REL} — regenerate with --write-inventory`
    };
  }
  return { ok: true };
}

export async function writeInventory(repoRoot: string): Promise<void> {
  const expected = inventoryText(extractCrewPathInventory(await readHooksJson(repoRoot)));
  await writeFile(path.join(repoRoot, INVENTORY_OUTPUT_REL), expected, "utf8");
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const args = process.argv.slice(2);
  if (args.includes("--write-inventory")) {
    await writeInventory(repoRoot);
    console.log(`validate-repo-boundary: wrote ${INVENTORY_OUTPUT_REL}`);
  } else {
    const boundaryResult = await validateRepoBoundary(repoRoot);
    const inventoryResult = await checkInventoryDrift(repoRoot);
    const problems: string[] = [];
    if (!boundaryResult.ok) {
      problems.push(
        ...boundaryResult.violations.map(
          (v) =>
            `${v.file}:${v.line}: disallowed cross-import from "${v.importSpec}" — not on the root↔crew/ allowlist`
        )
      );
    }
    if (!inventoryResult.ok && inventoryResult.detail) {
      problems.push(inventoryResult.detail);
    }
    if (problems.length > 0) {
      console.error(`Repo-boundary violations:\n${problems.join("\n")}`);
      process.exitCode = 1;
    } else {
      console.log("validate-repo-boundary: OK");
    }
  }
}
