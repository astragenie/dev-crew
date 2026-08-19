// Scans a slice file's ## Acceptance criteria section and detects placeholder
// bullets that were never replaced by the author. Enforced at /devcrew:slice start
// to prevent the autonomous loop from self-certifying vague work as complete.

// Patterns that identify a placeholder (unfilled) acceptance criterion.
const PLACEHOLDER_PATTERNS = [
  /^\s*-\s+\[[x\s]\]\s+AC-\d+:\s*\.{2,}\s*$/, // AC-1: ...
  /^\s*-\s+\[[x\s]\]\s+AC-\d+:\s*<[^>]*>\s*$/, // AC-1: <describe...>
  /^\s*-\s+\[[x\s]\]\s+AC-\d+:\s*TBD\s*$/i, // AC-1: TBD
  /^\s*-\s+\[[x\s]\]\s+AC-\d+:\s*$/ // AC-1: (empty)
];

// Module-scope regex constants for hot-path functions (Win 6 — perf).
const CRLF_SPLIT_RE = /\r?\n/;
const AC_HEADING_RE = /^##\s+Acceptance\s+criteria\s*$/i;
const SECTION_HEADING_RE = /^##\s+/;
const AC_BULLET_RE = /^\s*-\s+\[[x\s]\]/;

function isPlaceholder(line: string) {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(line));
}

/**
 * Lint acceptance criteria in a slice's markdown content.
 *
 * @param {string} content - full slice file text
 * @returns {{ ok: boolean, violations: string[], error?: string }}
 */
export function lintAcceptanceCriteria(content: string) {
  const lines = content.split(CRLF_SPLIT_RE);
  const startIdx = lines.findIndex((l: string) => AC_HEADING_RE.test(l));
  if (startIdx === -1) {
    return {
      ok: false,
      violations: [] as string[],
      error: "No '## Acceptance criteria' section found"
    };
  }

  const acBullets: any[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (SECTION_HEADING_RE.test(line)) break;
    if (AC_BULLET_RE.test(line)) acBullets.push(line);
  }

  if (acBullets.length === 0) {
    return { ok: false, violations: [], error: "No acceptance-criteria bullets found" };
  }

  const violations = acBullets.filter(isPlaceholder);
  return { ok: violations.length === 0, violations };
}
