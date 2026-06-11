// Acceptance-criteria detection helper.
//
// Used by slice-start.mts to count AC bullets in slice bodies.
//
// History: this file used to be `backlog-triage.mts` and hosted a
// regex-based triage scorer (`triagePending`, `triageEntry`,
// category/priority inference) used as a PM-failure fallback. The regex
// path was deleted on 2026-06-11; triage is PM-only. The file was
// renamed on the same day after only the AC counter remained.

const AC_HEADING_RE = /^##\s+acceptance\s+criteria/i;
const INLINE_AC_PREFIX_RE = /acceptance\s+criteria\s*:/i;
const INLINE_AC_LABELS_RE = /\bAC-\d+:/gi;
const SECTION_HEADING_RE = /^##/;
const AC_BULLET_RE = /^- (\[[ x]\] )?\S/;

/**
 * detectAcceptanceCriteria — scan `body` for an AC section and count items.
 *
 * Recognizes two section-opener patterns (case-insensitive):
 *   1. `## Acceptance criteria` — ATX heading (original)
 *   2. `Acceptance criteria:` — bare line-prefix (inline style used by /loop:backlog add)
 *
 * After the opener, counts:
 *   - Bullet lines: `^- (\[[ x]\] )?\S`
 *   - Inline AC labels on the opener line itself: `AC-\d+:` occurrences
 *
 * Stops counting at the next `##` heading.
 *
 * Returns { count, hasMin } where hasMin is count >= 3.
 */
export function detectAcceptanceCriteria(body: string): { count: number; hasMin: boolean } {
  const lines = body.split("\n");
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    if (AC_HEADING_RE.test(line)) {
      inSection = true;
      continue;
    }
    if (INLINE_AC_PREFIX_RE.test(line)) {
      inSection = true;
      const inlineMatches = line.match(INLINE_AC_LABELS_RE);
      if (inlineMatches) count += inlineMatches.length;
      continue;
    }
    if (inSection) {
      if (SECTION_HEADING_RE.test(line)) break;
      if (AC_BULLET_RE.test(line)) count++;
    }
  }

  return { count, hasMin: count >= 3 };
}
