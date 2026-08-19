// FEAT-009 (carried from runner-plugin FEAT-284) SLICE-191 — the
// `proposed_slices_shipped` FEAT-frontmatter shape and its migration off the
// legacy index-prefix pairing.
//
// Legacy ("index-prefix") shape — two parallel top-level arrays, correlated
// only by array index:
//   proposed_slices_shipped: ["-SLICE-1", "-SLICE-2"]
//   proposed_slices_shipped_commits: ["<sha1>", "<sha2>"]
// Nothing re-validates that index i of both arrays still refers to the same
// slice — an independent append, reorder, or dedup of either array silently
// desyncs the pairing (the class of bug this migration exists to retire).
//
// New (per-id_suffix keyed) shape — a single array of self-identifying
// mappings, each entry carrying its own `id_suffix`:
//   proposed_slices_shipped:
//     - id_suffix: -SLICE-1
//       commit_sha: <sha1>
//     - id_suffix: -SLICE-2
//       commit_sha: <sha2>
// This mirrors the array-of-mappings convention `proposed_slices` itself
// already uses (proposed-slices.mts) rather than a `{ [id_suffix]: ... }`
// object map: this repo's hand-rolled frontmatter parser requires a mapping
// key's first character to be a letter or underscore (frontmatter.mts's
// NESTED_KV_RE), and every id_suffix starts with a literal "-"
// (ID_SUFFIX_RE = /^-SLICE-\d+$/ in proposed-slices.mts) — a value that can
// never itself be used as a YAML mapping key under this parser. Keying each
// entry by its own field, not by array position, is what makes this shape
// immune to the desync class above.
//
// `proposed_slices_shipped_commits` is retired by this migration — every
// consumer of shipped-evidence going forward reads `commit_sha` off the
// entry itself. Nothing in this repo currently reads `proposed_slices_shipped`
// back as a trust signal (see feature-lifecycle.mts's fail-open contract —
// it is a durable audit trail, not a gate), so a legacy-shaped FEAT is only
// migrated lazily, the next time evidence is stamped for it (mergeShippedEvidence,
// called from feature-lifecycle.mts's reconcileProposedSlicesStartIndex) —
// there is no separate backfill sweep over the whole backlog.

import type { ShippedOrdinalEvidence } from "./git-anchored-completion.mjs";

export interface ShippedEntry {
  id_suffix: string;
  commit_sha: string;
}

function isShippedEntry(v: unknown): v is ShippedEntry {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.id_suffix === "string" &&
    obj.id_suffix.length > 0 &&
    typeof obj.commit_sha === "string"
  );
}

/**
 * FEAT-009 AC-1: normalize a FEAT's `proposed_slices_shipped` (+ the legacy
 * sibling `proposed_slices_shipped_commits`) frontmatter into the
 * per-id_suffix keyed `ShippedEntry[]` shape, preserving every existing
 * entry's shipped status exactly — no id_suffix is added, dropped, or
 * silently reassigned to a different commit.
 *
 * Recognized input shapes, in the order a caller may encounter them:
 *   - `undefined`/`null` raw          -> [] (nothing shipped yet)
 *   - already `ShippedEntry[]`        -> returned as-is (new shape, idempotent
 *                                        re-migration is a no-op)
 *   - legacy `string[]` id_suffix list, zipped by index against the parallel
 *     `commitsRaw` string[]           -> `ShippedEntry[]`. A commit missing
 *     at an index (arrays already desynced pre-migration) maps to
 *     `commit_sha: ""` rather than dropping the id_suffix — an unknown
 *     commit is a different claim than "never shipped", and AC-1 requires
 *     shipped/unshipped STATUS to survive exactly; only the corroborating
 *     sha is best-effort under a pre-existing desync.
 *   - any other shape (hand-edited / corrupted frontmatter) -> [], fail-open
 *     to "nothing shipped" — this field is an audit trail, not a gate (same
 *     fail-open contract as the git-anchored reconcile pass itself).
 */
export function migrateShippedFrontmatter(raw: unknown, commitsRaw: unknown): ShippedEntry[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return [];
  if (raw.every(isShippedEntry)) return raw as ShippedEntry[];
  if (!raw.every((v) => typeof v === "string")) return [];

  const commits = Array.isArray(commitsRaw) ? commitsRaw : [];
  return (raw as string[]).map((idSuffix, i) => ({
    id_suffix: idSuffix,
    commit_sha: typeof commits[i] === "string" ? (commits[i] as string) : ""
  }));
}

/**
 * FEAT-009 AC-1: merge freshly-found git evidence (`newEvidence`, from
 * `reconcileProposedSlicesAgainstGit`) into a FEAT's existing (possibly
 * legacy-shaped) `proposed_slices_shipped` frontmatter, migrating it to the
 * keyed shape in the same pass. A re-observed id_suffix's `commit_sha` is
 * overwritten by the newer evidence (last-write-wins); every other existing
 * entry carries through unchanged — this is the "no false-positive or
 * false-negative re-flags" invariant AC-1 requires.
 */
export function mergeShippedEvidence(
  existingRaw: unknown,
  existingCommitsRaw: unknown,
  newEvidence: ShippedOrdinalEvidence[]
): ShippedEntry[] {
  const migrated = migrateShippedFrontmatter(existingRaw, existingCommitsRaw);
  const byId = new Map(migrated.map((e) => [e.id_suffix, e]));
  for (const e of newEvidence) {
    byId.set(e.idSuffix, { id_suffix: e.idSuffix, commit_sha: e.commitSha });
  }
  return [...byId.values()];
}
