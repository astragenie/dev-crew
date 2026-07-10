#!/usr/bin/env node
// validate-backlog-writes.mts — CI allowlist guard for backlog-state raw
// filesystem writes (SLICE-153 / FEAT-250 AC-5, COND-D).
//
// BacklogStore (src/scripts/lib/backlog-store.mts, DEC-076) is the sole
// sanctioned writer for backlog lifecycle state: FEAT files under
// `.claude/artifacts/loop/backlog/**` (createFeature/updateFeatureFrontmatter/
// moveFeature) and SLICE files under `.claude/artifacts/loop/ai-loop/slices/**`
// (createSlice/updateSliceFrontmatter/moveSlice). Every other caller migrated
// onto that API in FEAT-250 SLICE-2/3 (see src/scripts/lib/backlog-writer.mts's
// thin-delegate re-exports and backlog-store.mts's module doc comment).
//
// This is an explicit ALLOWLIST gate (validate-imports.mts BOUNDARIES style),
// not a bare "no fs on backlog paths" rule (COND-D) — two modules perform
// legitimate raw writes against backlog-shaped paths for reasons structurally
// outside BacklogStore's frontmatter-merge/move API, and are named exceptions
// with a one-line rationale each (DEC-076 up-front classification) rather
// than ported:
//
//   - doctor.mts: cross-tree stray-backlog reconciliation (merging/archiving
//     whole FEAT files found in a legacy root into the authoritative one) —
//     structural repair, not a frontmatter-lifecycle operation.
//   - pm-apply.mts: body-section content editor (AC append / rescope rewrites
//     FEAT body markdown) — a body-content concern, not the frontmatter-only
//     merge BacklogStore provides. Its frontmatter writes already delegate to
//     updateFeatureFrontmatter/moveFeature.
//
// Detection is a per-line heuristic, deliberately narrow: a raw fs write/
// rename/unlink call whose argument is one of the identifier names this
// codebase actually uses for a backlog FEAT/SLICE file path (sliceFile,
// slicePath, featureFile, featureFilePath — see the BacklogStore call sites
// migrated in FEAT-250). Generic path variable names (filePath, target,
// etc.) are deliberately excluded to avoid false positives against grade/
// spec/state writers that reuse the same generic name for unrelated
// artifacts — the tradeoff for that precision is the explicit allowlist
// above rather than a blanket "no fs.writeFile" rule.
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface BacklogWriteFinding {
  file: string;
  line: number;
  detail: string;
}

// Relative (POSIX-style) paths permitted to raw-write backlog-shaped paths
// outside BacklogStore. Every entry carries its DEC-076 classification
// rationale inline.
const ALLOWLIST: Record<string, string> = {
  "src/scripts/lib/backlog-store.mts":
    "the BacklogStore module itself — sole sanctioned writer (DEC-076).",
  "src/scripts/lib/doctor.mts":
    "cross-tree stray-backlog reconciliation (merges/archives whole FEAT " +
    "files between trees) — structural repair, not a frontmatter-lifecycle " +
    "operation BacklogStore covers; named exception, not ported (DEC-076).",
  "src/scripts/lib/pm-apply.mts":
    "body-section content editor (AC append / rescope rewrites FEAT body " +
    "markdown) — a body-content concern outside BacklogStore's frontmatter-" +
    "only merge API; its frontmatter writes already delegate to " +
    "updateFeatureFrontmatter/moveFeature (DEC-076)."
};

const SCAN_ROOT = "src/scripts";

const WRITE_CALL_RE =
  /\bfs\.(writeFile|writeFileSync|rename|renameSync|unlink|unlinkSync)\s*\(\s*([A-Za-z_$][\w.]*)/g;

const BACKLOG_PATH_ARG_RE = /\b(sliceFile|slicePath|featureFile|featureFilePath)\b/;

async function collectMts(dir: string): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
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

function findViolationsInFile(rel: string, content: string): BacklogWriteFinding[] {
  const findings: BacklogWriteFinding[] = [];
  WRITE_CALL_RE.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = WRITE_CALL_RE.exec(content)) !== null) {
    const arg = match[2] ?? "";
    if (!BACKLOG_PATH_ARG_RE.test(arg)) continue;
    const line = content.slice(0, match.index).split("\n").length;
    findings.push({
      file: rel,
      line,
      detail:
        `raw fs write against a backlog-shaped path (\`${arg}\`) outside BacklogStore — ` +
        "use updateFeatureFrontmatter/updateSliceFrontmatter/moveFeature/moveSlice instead."
    });
  }
  return findings;
}

export async function validateBacklogWrites(
  repoRoot: string
): Promise<{ ok: boolean; findings: BacklogWriteFinding[] }> {
  const scanDir = path.join(repoRoot, SCAN_ROOT);
  const files = await collectMts(scanDir);
  const findings: BacklogWriteFinding[] = [];

  for (const file of files) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    if (ALLOWLIST[rel]) continue;
    const content = await fs.readFile(file, "utf8");
    findings.push(...findViolationsInFile(rel, content));
  }

  return { ok: findings.length === 0, findings };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateBacklogWrites(repoRoot);
  if (!result.ok) {
    console.error(
      `Backlog-write validation failed: ${result.findings.length} disallowed raw writer(s)`
    );
    for (const f of result.findings) {
      console.error(`  - ${f.file}:${f.line}: ${f.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      "validate-backlog-writes: OK — no raw backlog-state writers outside BacklogStore/allowlist."
    );
  }
}
