const COARSE_PREFIXES = [".claude/loop.json", ".claude/artifacts/loop/backlog/"];

const CASE_FOLD = process.platform === "win32";

export function normalizePath(p: string): string {
  const base = p.replace(/\\/g, "/").replace(/^\.\//, "");
  return CASE_FOLD ? base.toLowerCase() : base;
}

const SENTINEL_DOUBLESTAR_SLASH = "@@GLOB_DOUBLE_SLASH@@";
const SENTINEL_DOUBLESTAR = "@@GLOB_DOUBLE@@";
const SENTINEL_SINGLESTAR = "@@GLOB_SINGLE@@";

function globToRegex(glob: string): RegExp {
  // Tokenize in priority order so each form gets its own pattern:
  //   `**/`  → "(?:.*/)?"   (zero or more directories — matches root too)
  //   `**`   → ".*"         (match across `/`)
  //   `*`    → "[^/]*"      (match within one segment)
  const tokenized = glob
    .replaceAll("**/", SENTINEL_DOUBLESTAR_SLASH)
    .replaceAll("**", SENTINEL_DOUBLESTAR)
    .replaceAll("*", SENTINEL_SINGLESTAR);
  const escaped = tokenized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const restored = escaped
    .replaceAll(SENTINEL_DOUBLESTAR_SLASH, "(?:.*/)?")
    .replaceAll(SENTINEL_DOUBLESTAR, ".*")
    .replaceAll(SENTINEL_SINGLESTAR, "[^/]*");
  return new RegExp(`^${restored}$`);
}

function isGlob(p: string): boolean {
  return p.includes("*");
}

function inCoarsePrefix(p: string): string | null {
  const np = normalizePath(p);
  for (const prefix of COARSE_PREFIXES) {
    const lowerPrefix = prefix.toLowerCase();
    if (np === lowerPrefix || np.startsWith(lowerPrefix)) {
      return prefix;
    }
  }
  return null;
}

export function pathsConflict(a: string, b: string): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);

  if (na === nb) return true;

  const aPrefix = inCoarsePrefix(a);
  const bPrefix = inCoarsePrefix(b);
  if (aPrefix !== null && aPrefix === bPrefix) return true;

  if (isGlob(na) && globToRegex(na).test(nb)) return true;
  if (isGlob(nb) && globToRegex(nb).test(na)) return true;

  return false;
}

export class PathSet {
  private paths: string[] = [];

  addAll(paths: string[]): void {
    for (const p of paths) {
      this.paths.push(p);
    }
  }

  conflictsWith(candidate: string[]): boolean {
    return this.conflictingPath(candidate) !== null;
  }

  conflictingPath(candidate: string[]): string | null {
    for (const c of candidate) {
      for (const existing of this.paths) {
        if (pathsConflict(c, existing)) return existing;
      }
    }
    return null;
  }
}
