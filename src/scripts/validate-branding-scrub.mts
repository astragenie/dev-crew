#!/usr/bin/env node
// validate-branding-scrub.mts — SLICE-24 (FEAT-005 AC-2): continuous branding
// sweep for the retired "wiggin" product name.
//
// SLICE-08 did the one-time scrub (27 files, dev-crew rename) but that was a
// point-in-time pass over the P1 import diff, not a standing gate — nothing
// stopped a fresh "wiggin" reference from creeping back in (a copy-pasted
// doc snippet, a stale template, a new agent prompt cloned from an old one).
// This gate runs the same sweep on every push/PR against the FULL merged
// tree and fails on any hit outside the documented exclusion buckets below.
//
// Exclusion buckets (SLICE-08's original 4-bucket taxonomy, collapsed to 3
// after the P3 surface merge folded "crew/ subtree pending P3 consolidation"
// into ordinary crew/.claude/artifacts/** history — see SLICE-08 AC-A for
// the original taxonomy and docs/planning/unification-plan.md SS7 for the
// P4 gate requirement):
//
//   A. `.claude/artifacts/**` (root and crew/) — frozen ceremony history
//      (bundles, handoffs, reviews, runs, grades) AND live backlog/slice
//      state that legitimately narrates the rename itself (FEAT-002,
//      SLICE-08's own slice file, this slice's own file). Rewriting these
//      would falsify the record of what actually happened.
//   B. `crew/.claude/loop/**`, `crew/CLAUDE.md`, `crew/CHANGELOG.md` —
//      crew/'s own pre-Phase-5 legacy live docs. validate-agent-refs.mts
//      already documents crew/CLAUDE.md as "still live-read... until the
//      Phase-5 docs cutover" (SLICE-20); same rationale applies to its
//      sibling dogfood-scaffold files. Phase 5 (cutover) retires this
//      bucket, not this slice.
//   C. `docs/parents/**`, `docs/planning/**` — byte-verified frozen parent
//      snapshots (SLICE-04 subtree import) and the planning archive that
//      documents the migration itself (unification-plan.md and friends) —
//      both necessarily name the old product to describe the change.
//
// A hit anywhere else (product surface: agents/, commands/, skills/,
// templates/, src/, README.md, ADOPTION.md, CLAUDE.md, live docs/ outside
// the two archived subtrees) fails the gate.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BANNED_RE = /wiggin/i;

// Directories/files skipped everywhere (vendored, generated, VCS internals).
const SKIP_DIR_NAMES = new Set(["node_modules", ".git", "dist", "3rdparty"]);
const SCAN_EXTENSIONS = new Set([".md", ".mts", ".mjs", ".ts", ".js", ".json", ".yml", ".yaml"]);

// Bucket A/B/C directory prefixes (relative to repo root, POSIX-joined).
const EXCLUDED_DIR_PREFIXES = [
  ".claude/artifacts/",
  "crew/.claude/artifacts/",
  "crew/.claude/loop/",
  "docs/parents/",
  "docs/planning/"
];

// Individual excluded files (bucket B's non-directory members).
const EXCLUDED_FILES = new Set(["crew/CLAUDE.md", "crew/CHANGELOG.md"]);

// This guard's own source + test must name the banned token to do their job.
// migrate-adopter is in the same boat (SLICE-26): its whole purpose is
// collapsing the legacy-branded `loop:` marker blocks out of adopter repos,
// so its fixtures must CONTAIN the legacy branding and its assertions must
// name it to prove removal (`assert.ok(!onDisk.includes(...))`).
const ALLOWLIST = new Set([
  path.join("src", "scripts", "validate-branding-scrub.mts"),
  path.join("src", "tests", "validate-branding-scrub.test.mts"),
  path.join("src", "scripts", "lib", "migrate-adopter-markers.mts"),
  path.join("src", "tests", "migrate-adopter.test.mts")
]);

export interface BrandingScrubFinding {
  file: string;
  line: number;
  text: string;
}

function isExcluded(relPath: string): boolean {
  const posix = relPath.replaceAll("\\", "/");
  if (EXCLUDED_FILES.has(posix)) return true;
  return EXCLUDED_DIR_PREFIXES.some((prefix) => posix.startsWith(prefix));
}

async function collectFiles(absPath: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    const s = await stat(absPath);
    if (s.isFile()) return [absPath];
    entries = await readdir(absPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name)) continue;
    const full = path.join(absPath, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full)));
    else if (SCAN_EXTENSIONS.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

export async function validateBrandingScrub(
  repoRoot: string
): Promise<{ ok: boolean; findings: BrandingScrubFinding[] }> {
  const findings: BrandingScrubFinding[] = [];
  const files = await collectFiles(repoRoot);
  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    if (isExcluded(rel)) continue;
    if (ALLOWLIST.has(rel)) continue;
    const content = await readFile(file, "utf8");
    if (!BANNED_RE.test(content)) continue;
    content.split("\n").forEach((line, idx) => {
      if (BANNED_RE.test(line)) {
        findings.push({
          file: rel.replaceAll("\\", "/"),
          line: idx + 1,
          text: line.trim().slice(0, 160)
        });
      }
    });
  }
  return { ok: findings.length === 0, findings };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateBrandingScrub(repoRoot);
  if (!result.ok) {
    console.error(
      `Wiggin-scrub validation failed: ${result.findings.length} hit(s) outside the documented exclusion buckets ` +
        "(.claude/artifacts/**, crew/.claude/artifacts/**, crew/.claude/loop/**, crew/CLAUDE.md, crew/CHANGELOG.md, docs/parents/**, docs/planning/**)."
    );
    for (const f of result.findings) {
      console.error(`  - ${f.file}:${f.line}: ${f.text}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Wiggin-scrub validation OK: no residual "wiggin" hits outside archived buckets.');
  }
}
