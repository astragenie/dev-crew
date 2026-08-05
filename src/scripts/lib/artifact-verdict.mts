// P1.4 — shared verdict reader for gate derivation.
//
// Crew artifact writers (dev-team P1.3) emit a canonical enum in the artifact
// frontmatter `decision:` key: reviews use {approved, approved_with_notes,
// rejected}; validations use {pass, fail, skipped} (+ `skip_reason`).
// Artifacts written before P1.3 have no frontmatter decision — those are
// "legacy" and are grandfathered by callers (satisfied with a warning), per
// the plan's D3 cutoff.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";

export interface ArtifactVerdict {
  /** Canonical decision string from frontmatter, or null when absent (legacy). */
  decision: string | null;
  /** skip_reason from frontmatter when present. */
  skipReason: string | null;
  /** Absolute path of the artifact the verdict came from. */
  file: string;
}

// Filename shapes observed in this repo's live review/validation artifact
// corpus (SLICE-201 / FEAT-283 defect 2), most-specific first:
//   - compact ISO datetime: 20260803T200500Z-review-result-slice-178-....md
//   - hyphenated date-only: 2026-08-04-review-slice-200.md
//   - compact date-only:    20260613-reviewer-a-slice125-feat175.md
// A basename matching none of these carries no parseable timestamp and the
// caller falls back to filesystem mtime for it.
const ISO_DATETIME_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-/;
const HYPHENATED_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})-/;
const COMPACT_DATE_RE = /^(\d{4})(\d{2})(\d{2})-/;

/**
 * Parses the leading timestamp out of an artifact basename, in epoch
 * milliseconds. Returns null when no recognized shape matches (see the
 * regexes above) — the caller must fall back to mtime for those files.
 */
function parseFilenameTimestamp(basename: string): number | null {
  const iso = basename.match(ISO_DATETIME_RE);
  if (iso) {
    const [, y, mo, d, h, mi, s] = iso;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  }
  const hyphenated = basename.match(HYPHENATED_DATE_RE);
  if (hyphenated) {
    const [, y, mo, d] = hyphenated;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d));
  }
  const compact = basename.match(COMPACT_DATE_RE);
  if (compact) {
    const [, y, mo, d] = compact;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d));
  }
  return null;
}

/**
 * Picks the newest artifact from `files` and reads its frontmatter verdict.
 * Ordering (SLICE-201 / FEAT-283 defect 2): sorts on the ISO timestamp
 * encoded in each filename, descending. mtime is NOT durable — git clone,
 * checkout, cherry-pick, and worktree materialization all assign arbitrary
 * mtimes, so it cannot be trusted as the primary signal (a superseded
 * rejection outranking its own later approval was reproduced this way).
 * Mixed-corpus rule: each file's sort key is its parsed filename timestamp
 * when the basename matches a recognized shape, else its mtimeMs — a single
 * numeric sort, not "timestamped always wins". An untimestamped artifact's
 * real mtime can legitimately outrank a timestamped one from further in the
 * past. Returns null when `files` is empty or nothing is readable. Never
 * throws.
 */
export async function readNewestArtifactVerdict(files: string[]): Promise<ArtifactVerdict | null> {
  if (files.length === 0) return null;
  const stats = await Promise.all(
    files.map(async (file) => {
      try {
        const s = await fs.stat(file);
        const filenameTimestamp = parseFilenameTimestamp(path.basename(file));
        const sortKey = filenameTimestamp ?? s.mtimeMs;
        return { file, sortKey };
      } catch {
        return null;
      }
    })
  );
  const ordered = stats
    .filter((s): s is { file: string; sortKey: number } => s !== null)
    .sort((a, b) => b.sortKey - a.sortKey);
  for (const { file } of ordered) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const { frontmatter } = parseFrontmatter(raw);
      const decision =
        typeof frontmatter?.decision === "string" && frontmatter.decision.trim().length > 0
          ? frontmatter.decision.trim()
          : null;
      const skipReason =
        typeof frontmatter?.skip_reason === "string" && frontmatter.skip_reason.trim().length > 0
          ? frontmatter.skip_reason.trim()
          : null;
      return { decision, skipReason, file };
    } catch {
      // unreadable — try the next-newest
    }
  }
  return null;
}
