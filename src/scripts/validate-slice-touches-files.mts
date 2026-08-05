import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTouchesFiles } from "./lib/wave/touches-files.mjs";

export type ValidateResult = {
  errors: string[];
  warnings: string[];
  filesScanned: number;
};

const SLICES_ROOT = ".claude/artifacts/loop/ai-loop/slices";
const STATES = ["pending", "in-progress", "needs-review"];
const FRONTMATTER_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const TOUCHES_FILES_KEY_RE = /^touches_files:\s*/m;

function listSlices(repoRoot: string): string[] {
  const out: string[] = [];
  for (const state of STATES) {
    const dir = join(repoRoot, SLICES_ROOT, state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".md")) out.push(join(dir, name));
    }
  }
  return out;
}

function extractCreated(slicePath: string): string | null {
  const raw = readFileSync(slicePath, "utf8");
  const m = raw.match(/^created:\s*(\d{4}-\d{2}-\d{2})/m);
  return m?.[1] ? m[1] : null;
}

// Distinguishes "the field was never written" (the overwhelmingly common
// case pre-FEAT-292 — stays a WARN below) from "the field was written but
// still resolves to confidence: missing" (empty inline/block array, a
// non-array scalar, or any other unparseable shape). Reads raw frontmatter
// text directly rather than trusting readTouchesFiles's parsed value, since
// that function only reports the resolved confidence tier, not whether the
// key was present on disk. Post-SLICE-203 (inline-array parsing fixed), a
// declared-but-still-missing result for real writer output should not
// happen — which is exactly why it's promoted to an error below instead of
// tolerated as a warning.
function declaresTouchesFiles(slicePath: string): boolean {
  const raw = readFileSync(slicePath, "utf8");
  const m = raw.match(FRONTMATTER_BLOCK_RE);
  if (!m?.[1]) return false;
  return TOUCHES_FILES_KEY_RE.test(m[1]);
}

// Extracted from validateRepo's "missing confidence" branch (Biome cognitive
// complexity cap) — decides whether a confidence: "missing" result is a
// tolerated omission (WARN, gated by creation date) or a promoted defect
// (ERROR, when the slice actually declared the field). Returns null when
// neither applies (e.g. an old slice below warnCutoff that omitted the
// field — silently fine, matching pre-SLICE-204 behavior).
function classifyMissingConfidence(
  slicePath: string,
  sliceId: string,
  opts: { warnCutoff: string }
): { kind: "error" | "warn"; message: string } | null {
  if (declaresTouchesFiles(slicePath)) {
    return {
      kind: "error",
      message: `${sliceId}: touches_files declared but resolves to confidence "missing" (empty or unparseable value)`
    };
  }
  const created = extractCreated(slicePath);
  if (created !== null && created >= opts.warnCutoff) {
    return { kind: "warn", message: `${sliceId}: touches_files missing (created ${created})` };
  }
  return null;
}

// Validates one declared/inferred path, returning an error message or null.
// A missing immediate parent dir is not itself an error — a slice
// legitimately plans to create ONE new subdirectory level under an
// existing area (e.g. "docs/architecture/foo.md" when "docs/architecture"
// doesn't exist yet but "docs" does). The grandparent dir (dirname twice)
// must already exist, so at most one fabricated level is tolerated —
// deeper fabrications like "src/made/up/nested/foo.mts" are rejected even
// though "src" itself exists.
function checkPath(p: string, repoRoot: string): string | null {
  if (isAbsolute(p)) return `path "${p}" outside repo (absolute)`;
  if (p.includes("..")) return `path "${p}" outside repo (parent traversal)`;
  if (p.includes("*")) return null;
  const parent = dirname(p);
  if (existsSync(join(repoRoot, parent))) return null;
  const grandparent = dirname(parent);
  if (existsSync(join(repoRoot, grandparent))) return null;
  return `parent dir "${parent}" does not exist for "${p}" (more than one new directory level)`;
}

export function validateRepo(repoRoot: string, opts: { warnCutoff: string }): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slicePaths = listSlices(repoRoot);

  for (const slicePath of slicePaths) {
    const r = readTouchesFiles(slicePath, repoRoot);
    const sliceId = slicePath.split(/[\\/]/).pop() ?? slicePath;

    if (r.confidence === "missing") {
      const verdict = classifyMissingConfidence(slicePath, sliceId, opts);
      if (verdict?.kind === "error") errors.push(verdict.message);
      else if (verdict?.kind === "warn") warnings.push(verdict.message);
      continue;
    }

    for (const p of r.paths) {
      const problem = checkPath(p, repoRoot);
      if (problem !== null) errors.push(`${sliceId}: ${problem}`);
    }
  }

  return { errors, warnings, filesScanned: slicePaths.length };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  const entryPath = resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const repoRoot = repoIdx >= 0 && args[repoIdx + 1] ? args[repoIdx + 1]! : process.cwd();
  const cutoffIdx = args.indexOf("--warn-cutoff");
  const cutoff = cutoffIdx >= 0 && args[cutoffIdx + 1] ? args[cutoffIdx + 1]! : "2026-06-15";

  const r = validateRepo(repoRoot, { warnCutoff: cutoff });
  for (const w of r.warnings) console.warn(`WARN ${w}`);
  for (const e of r.errors) console.error(`ERROR ${e}`);
  console.log(
    `Scanned ${r.filesScanned} slice files; ${r.warnings.length} warnings, ${r.errors.length} errors`
  );
  if (r.errors.length > 0) process.exitCode = 1;
}

if (isMainEntry()) {
  void main();
}
