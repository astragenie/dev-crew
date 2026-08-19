// FEAT-009 (carried from runner-plugin FEAT-284) SLICE-191 — unit coverage
// for the proposed_slices_shipped legacy-index-prefix -> per-id_suffix-keyed
// migration.

import { test } from "bun:test";
import { strict as assert } from "node:assert";

import {
  migrateShippedFrontmatter,
  mergeShippedEvidence,
  type ShippedEntry
} from "../scripts/lib/slice-linker/proposed-slices-shipped.mjs";
import type { ShippedOrdinalEvidence } from "../scripts/lib/slice-linker/git-anchored-completion.mjs";

function evidence(
  idSuffix: string,
  ordinal: number,
  commitSha: string,
  title = "T"
): ShippedOrdinalEvidence {
  return { ordinal, idSuffix, title, commitSha, commitSubject: `feat: ${idSuffix}` };
}

// --- migrateShippedFrontmatter -----------------------------------------

test("AC-1: undefined/null raw migrates to an empty array", () => {
  assert.deepEqual(migrateShippedFrontmatter(undefined, undefined), []);
  assert.deepEqual(migrateShippedFrontmatter(null, null), []);
});

test("AC-1: legacy index-prefix shape (two parallel arrays) is rewritten to per-id_suffix keyed entries, preserving status exactly", () => {
  const legacyIds = ["-SLICE-1", "-SLICE-2", "-SLICE-3"];
  const legacyCommits = ["aaa111", "bbb222", "ccc333"];
  const migrated = migrateShippedFrontmatter(legacyIds, legacyCommits);
  assert.deepEqual(migrated, [
    { id_suffix: "-SLICE-1", commit_sha: "aaa111" },
    { id_suffix: "-SLICE-2", commit_sha: "bbb222" },
    { id_suffix: "-SLICE-3", commit_sha: "ccc333" }
  ]);
  // Every id_suffix that was shipped under the legacy shape is still shipped
  // (present) after migration — no false-negative re-flag.
  const shippedSet = new Set(migrated.map((e) => e.id_suffix));
  for (const id of legacyIds) assert.ok(shippedSet.has(id), `${id} must survive migration`);
  // No id_suffix appears that wasn't in the legacy list — no false-positive.
  assert.equal(migrated.length, legacyIds.length);
});

test("AC-1: an already-keyed ShippedEntry[] is returned unchanged (idempotent re-migration)", () => {
  const keyed: ShippedEntry[] = [
    { id_suffix: "-SLICE-1", commit_sha: "deadbeef" },
    { id_suffix: "-SLICE-2", commit_sha: "cafef00d" }
  ];
  assert.deepEqual(migrateShippedFrontmatter(keyed, undefined), keyed);
});

test("AC-1: a pre-existing desync (commits array shorter than the id_suffix array) preserves shipped STATUS for every id_suffix, defaulting the unresolvable commit_sha to empty rather than dropping the entry", () => {
  const migrated = migrateShippedFrontmatter(["-SLICE-1", "-SLICE-2"], ["onlyOneSha"]);
  assert.deepEqual(migrated, [
    { id_suffix: "-SLICE-1", commit_sha: "onlyOneSha" },
    { id_suffix: "-SLICE-2", commit_sha: "" }
  ]);
  assert.equal(migrated.length, 2, "both id_suffixes must still be present as shipped");
});

test("AC-1: an unrecognized/corrupted shape fails open to an empty array rather than throwing", () => {
  assert.deepEqual(migrateShippedFrontmatter({ not: "an array" }, undefined), []);
  assert.deepEqual(migrateShippedFrontmatter([1, 2, 3], undefined), []);
  assert.deepEqual(migrateShippedFrontmatter("not-even-an-array", undefined), []);
});

// --- mergeShippedEvidence -----------------------------------------------

test("AC-1: merging fresh evidence into a legacy-shaped stamp migrates it and adds the new entries in one pass", () => {
  const merged = mergeShippedEvidence(
    ["-SLICE-1"],
    ["aaa111"],
    [evidence("-SLICE-2", 2, "bbb222")]
  );
  assert.deepEqual(merged, [
    { id_suffix: "-SLICE-1", commit_sha: "aaa111" },
    { id_suffix: "-SLICE-2", commit_sha: "bbb222" }
  ]);
});

test("AC-1: re-observed evidence for an id_suffix already on the (migrated) stamp overwrites its commit_sha (last-write-wins), never duplicates the entry", () => {
  const merged = mergeShippedEvidence(
    ["-SLICE-1"],
    ["stale-sha"],
    [evidence("-SLICE-1", 1, "fresh-sha")]
  );
  assert.deepEqual(merged, [{ id_suffix: "-SLICE-1", commit_sha: "fresh-sha" }]);
});

test("AC-1: every pre-existing entry not re-observed by this pass carries through unchanged (no false-negative re-flag)", () => {
  const merged = mergeShippedEvidence(
    ["-SLICE-1", "-SLICE-2", "-SLICE-3"],
    ["a", "b", "c"],
    [evidence("-SLICE-4", 4, "d")]
  );
  assert.deepEqual(merged, [
    { id_suffix: "-SLICE-1", commit_sha: "a" },
    { id_suffix: "-SLICE-2", commit_sha: "b" },
    { id_suffix: "-SLICE-3", commit_sha: "c" },
    { id_suffix: "-SLICE-4", commit_sha: "d" }
  ]);
});

test("AC-1: no new evidence against an already-keyed stamp is a pure migration no-op", () => {
  const keyed: ShippedEntry[] = [{ id_suffix: "-SLICE-1", commit_sha: "abc" }];
  assert.deepEqual(mergeShippedEvidence(keyed, undefined, []), keyed);
});
