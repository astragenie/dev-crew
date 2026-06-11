// Classify a slice's changed-file set into an inline-friendly shape.
//
// Pure function: no I/O, no config, no side effects. The CLI handler in
// loop.mts is the only entry-point + I/O surface.
//
// Used by the slice ceremony to decide whether the inline path is
// appropriate. See docs/sop/inline-criteria.md for the rule set and the
// public-surface guard list rationale.

export type FileChange = {
  path: string;
  added: number;
  removed: number;
  exportDelta?: number;
};

export type Shape = "doc-update" | "config-tweak" | "single-module-edit" | "test-only" | "none";

export type ClassifyResult = { shape: Shape; rationale: string };

// Files that participate in the cross-plugin contract (SPEC-003) or carry
// behavior other modules consume directly. Edits to these MUST NOT take the
// inline path — review/validation rigor required regardless of size.
const PUBLIC_SURFACE = new Set<string>([
  "src/scripts/lib/auto-dispatch.mts",
  "src/scripts/lib/halt-badges.mts",
  "src/scripts/lib/auto-walker.mts"
]);

const SINGLE_MODULE_MAX_LOC = 50;

function isDoc(p: string): boolean {
  return p.endsWith(".md") || p.startsWith("docs/");
}

function isConfig(p: string): boolean {
  return (
    p === ".claude/loop.json" ||
    p.startsWith(".eslintrc") ||
    p.startsWith("prettier.config.") ||
    (p.startsWith("tsconfig") && p.endsWith(".json"))
  );
}

function isTest(p: string): boolean {
  return p.startsWith("src/tests/");
}

function isSource(p: string): boolean {
  return (p.endsWith(".mts") || p.endsWith(".mjs") || p.endsWith(".ts")) && !isTest(p);
}

function classifySingleSource(f: FileChange): ClassifyResult {
  if (PUBLIC_SURFACE.has(f.path)) {
    return { shape: "none", rationale: `public-surface file: ${f.path}` };
  }
  if ((f.exportDelta ?? 0) !== 0) {
    return { shape: "none", rationale: "exported symbols changed" };
  }
  const grossLoc = f.added + f.removed;
  if (grossLoc > SINGLE_MODULE_MAX_LOC) {
    return {
      shape: "none",
      rationale: `gross LOC delta ${grossLoc} > ${SINGLE_MODULE_MAX_LOC}`
    };
  }
  return {
    shape: "single-module-edit",
    rationale: "1 source file, small delta, no export change"
  };
}

export function classifySliceShape({ files }: { files: FileChange[] }): ClassifyResult {
  if (files.length === 0) {
    return { shape: "none", rationale: "no files" };
  }
  const paths = files.map((f) => f.path);
  if (paths.every(isDoc)) {
    return { shape: "doc-update", rationale: "all changed files are docs/markdown" };
  }
  if (paths.every(isConfig)) {
    return { shape: "config-tweak", rationale: "all changed files are config" };
  }
  if (paths.every(isTest)) {
    return { shape: "test-only", rationale: "all changed files under src/tests/" };
  }
  if (files.length === 1 && isSource(files[0]!.path)) {
    return classifySingleSource(files[0]!);
  }
  return { shape: "none", rationale: "mixed file types" };
}
