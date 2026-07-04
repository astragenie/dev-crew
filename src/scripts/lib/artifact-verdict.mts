// P1.4 — shared verdict reader for gate derivation.
//
// Crew artifact writers (dev-team P1.3) emit a canonical enum in the artifact
// frontmatter `decision:` key: reviews use {approved, approved_with_notes,
// rejected}; validations use {pass, fail, skipped} (+ `skip_reason`).
// Artifacts written before P1.3 have no frontmatter decision — those are
// "legacy" and are grandfathered by callers (satisfied with a warning), per
// the plan's D3 cutoff.

import fs from "node:fs/promises";

import { parseFrontmatter } from "./frontmatter.mjs";

export interface ArtifactVerdict {
  /** Canonical decision string from frontmatter, or null when absent (legacy). */
  decision: string | null;
  /** skip_reason from frontmatter when present. */
  skipReason: string | null;
  /** Absolute path of the artifact the verdict came from. */
  file: string;
}

/**
 * Picks the newest artifact from `files` (mtime descending — filename
 * timestamp prefixes usually agree, but a minority of legacy artifacts have
 * no timestamp prefix, so mtime is the reliable ordering) and reads its
 * frontmatter verdict. Returns null when `files` is empty or nothing is
 * readable. Never throws.
 */
export async function readNewestArtifactVerdict(files: string[]): Promise<ArtifactVerdict | null> {
  if (files.length === 0) return null;
  const stats = await Promise.all(
    files.map(async (file) => {
      try {
        const s = await fs.stat(file);
        return { file, mtimeMs: s.mtimeMs };
      } catch {
        return null;
      }
    })
  );
  const ordered = stats
    .filter((s): s is { file: string; mtimeMs: number } => s !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
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
