---
decision: approved
reviewer: crew:reviewer
slice: SLICE-32
reviewed_commits: [b4c27ef5]
---

# Review — SLICE-32 (FEAT-009): proposed_slices_shipped shape migration + force-materialize escape hatch

## Summary

Commit `b4c27ef5` implements FEAT-009 AC-1 (SLICE-191, migrate
`proposed_slices_shipped` off the legacy index-prefix two-array shape to a
per-id_suffix keyed array of `{id_suffix, commit_sha}` mappings), AC-2
(SLICE-193, `forceMaterializeProposedSlice` CLI escape hatch), and AC-4
(3-rerun no-growth regression coverage). AC-3 is explicitly out of scope for
this slice per FEAT-009.md's carry-forward note and is represented as an
in-code caveat rather than a fix. I independently verified the load-bearing
frontmatter-parser claim, reproduced both requested neuterings (both hit the
intended named test failures, both restored clean), attacked the migration
with array-length-mismatch and mixed-shape adversarial inputs, and ran the
CLI escape hatch against a fresh temp fixture built outside the test harness.
**Decision: approved.**

## 1. Frontmatter round-trip claim — independently verified, not trusted

The commit message and module header (`proposed-slices-shipped.mts`) claim
the array-of-mappings shape is required because this repo's hand-rolled
frontmatter parser (`frontmatter.mts`'s `NESTED_KV_RE`) rejects mapping keys
that don't start with a letter/underscore, and every `id_suffix` starts with
`"-"`. Read the regex directly:

```
const NESTED_KV_RE = /^\s+([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;
```

Confirmed the key-group requires a leading letter/underscore. Then
reproduced live rather than trusting the regex reading alone — wrote a
throwaway script (deleted after, not part of the diff) that:

- Parsed a hand-written YAML block with `proposed_slices_shipped` as an
  object map keyed by `-SLICE-1`/`-SLICE-2` → **result: `null`**, not an
  error. This is silent data loss on read, worse than the module doc's
  framing of "rejects" — a future author who tried the object-map shape
  would get no signal at all that it failed.
- Round-tripped the actual array-of-mappings shape through
  `mergeFrontmatter` (write) + `parseFrontmatter` (read) →
  byte-for-byte-equal to the original structure. The load-bearing design
  justification holds.

## 2. Neuter-proof — both reproduced, both restored clean

**Neuter 1** — `if (already)` → `if (false && already)` in
`forceMaterializeProposedSlice` (feature-lifecycle.mts): ran
`force-materialize-proposed-slice.test.mts` — **6 pass, 1 fail**, and the
one failure is exactly `AC-2: refuses with ProposedSliceAlreadyMaterializedError
rather than duplicate an already-materialized entry`. Restored; `git diff`
on the file came back empty (byte-identical to HEAD).

**Neuter 2** — `migrateShippedFrontmatter` forced to always `return [];`
(proposed-slices-shipped.mts): ran `proposed-slices-shipped.test.mts` +
`git-anchored-completion.test.mts` together — **32 pass, 6 fail**, all 6
failures inside `proposed-slices-shipped.test.mts`'s direct unit coverage of
`migrateShippedFrontmatter`/`mergeShippedEvidence` (legacy-shape rewrite,
idempotent re-migration, desync-preserving, merge-with-fresh-evidence,
carry-through, no-new-evidence no-op). Restored; `git diff` on the file came
back empty.

*Worth noting, not a defect*: none of the higher-level
`git-anchored-completion.test.mts` integration tests (including the new
FEAT-009 AC-1 migration test and the AC-4 rerun test) failed under this
neuter. Their fixtures always have live git evidence for every relevant
`id_suffix` re-derivable on every run, so the specific "carry an
un-re-observed prior entry through unchanged" behavior this neuter breaks
never gets exercised at the integration layer — only at the direct unit
level. The unit coverage is thorough and specific enough that I don't
consider this a gap, but the reviewer after me should know the integration
suite alone would not have caught this class of regression.

After restoring both files, ran the full targeted suite (45 tests across
the 3 relevant files) — **45 pass, 0 fail** — confirming the restore did not
leave either file in a different-but-still-passing state.

## 3. Attacking the migration

- **Legacy arrays-length mismatch** (3 id_suffixes, 2 SHAs), called
  directly against `migrateShippedFrontmatter`: all 3 id_suffixes survive
  with shipped status preserved; the unresolvable third `commit_sha`
  defaults to `""` rather than dropping the entry. Matches the documented
  contract and the existing "pre-existing desync" unit test. **Handled
  correctly.**
- **Partial migration — a single array mixing legacy id_suffix strings AND
  already-migrated `{id_suffix, commit_sha}` objects**: `migrateShippedFrontmatter`
  fails neither `raw.every(isShippedEntry)` cleanly nor
  `raw.every(v => typeof v === "string")` cleanly (mixed), so it falls
  through to the final fail-open branch and returns `[]` — **dropping every
  entry, including the already-migrated ones, not just the malformed
  strings**. This is a real gap in isolation. But I checked reachability
  before calling it a defect: grepped every writer of `proposed_slices_shipped`
  in `src/scripts/` — the only write site is `mergeShippedEvidence` inside
  `reconcileProposedSlicesStartIndex`, and `mergeShippedEvidence` always
  writes back a homogeneous `ShippedEntry[]` (built from `Map.values()`).
  There is no code path in this repo that could produce a mixed array
  through normal operation — only a hand-edited/corrupted frontmatter file
  could. The module's own header explicitly designs the fail-open branch
  for exactly that case ("any other shape (hand-edited / corrupted
  frontmatter) -> [], fail-open to 'nothing shipped'"), and separately
  confirmed via the module header + `feature-lifecycle.mts` comment that
  `proposed_slices_shipped` is a durable audit trail that nothing reads back
  as a gating signal — so even a hand-corrupted instance self-heals
  (re-populated) on the very next reconcile write, it doesn't block or
  mis-skip anything. **Assessed as working-as-documented, not a defect** —
  demanded and got the evidence (single write path, non-gating field,
  explicit fail-open design intent) before accepting the claim.

## 4. CLI escape hatch — independently verified against a fresh fixture

Built a temp fixture repo from scratch (outside the test harness, using
`addFeature`/`updateFeatureFrontmatter` directly, then deleted after) with a
FEAT carrying two `proposed_slices` entries, and ran the real CLI three
times as actual subprocesses:

1. `slice force-materialize --id FEAT-001 --id-suffix -SLICE-1` → exit 0.
   Verified on disk: exactly one slice file created (`SLICE-01`), correct
   `proposed_slice_id_suffix: -SLICE-1` stamp, correct `title`/`effort_points`,
   and the FEAT frontmatter correctly shows `status: in-progress` and
   `slices: [SLICE-01]`.
2. Same command again → exit 1, stderr:
   `FEAT-001: proposed_slices entry -SLICE-1 is already materialized as
   SLICE-01 — refusing to create a duplicate`. Confirmed on disk: `slices`
   field still `[SLICE-01]`, no second slice file created.
3. `--id-suffix -SLICE-99` (bogus) → exit 1, stderr:
   `FEAT-001: no proposed_slices entry with id_suffix "-SLICE-99"`.
   Confirmed no partial write — slices count and FEAT state unchanged from
   after step 2.

All three match the documented contract exactly; no partial writes on
either refusal path.

## 5. AC-3 deviation — in-code comment accuracy only (close-artifact caveat is lead's job)

Per instruction, assessed only the in-code caveat's accuracy against
FEAT-009.md's AC-3/"AC-8b status" wording, not whether the close ceremony
records it. The comment landed at the exact `commits.find()` line in
`git-anchored-completion.mts` states: `commits` is ordered newest-first, so
`.find()` locks onto the first (most recent) commit whose subject+body
mention the FEAT/SLICE pair; on a live squash-merge history a newer commit
can separately narrate the same pair in prose without being the actual
implementing squash-merge, producing a false "not shipped" result; tracked
separately as runner-plugin FEAT-294; out of scope for SLICE-191/193. This
matches FEAT-009.md's carried-forward caveat precisely (same failure
mechanism, same tracking issue, same explicit non-closure). **Accurate.**

## 6. Targeted gates

- `bun test src/tests/proposed-slices-shipped.test.mts
  src/tests/force-materialize-proposed-slice.test.mts
  src/tests/git-anchored-completion.test.mts`: **45 pass, 0 fail**.
- `bun ./src/scripts/validate-backlog-writes.mts`: `OK — no raw
  backlog-state writers outside BacklogStore/allowlist.`
- `bun ./src/scripts/validate-imports.mts`: `OK`.
- `bunx tsc --project tsconfig.json --noEmit`: clean, no output.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean, no output.

Full suite skipped per the lead's instruction (builder already ran
3376/0 twice; lead reruns at close).

## Decision rationale

`approved`. The load-bearing frontmatter-parser design claim is real
(independently reproduced, not just read), both requested neuterings hit
their intended named test failures and restored byte-identical, the
migration correctly handles the documented desync case and fails open (not
unsafely) on a shape that is unreachable through any real write path in
this repo, the force-materialize CLI escape hatch behaves exactly as
documented against a fresh independently-built fixture (happy path,
duplicate refusal, unknown-suffix refusal, no partial writes on either
refusal), and the AC-3 in-code caveat accurately mirrors FEAT-009.md's
carried-forward AC-8b gap without overclaiming a fix. All targeted gates are
green. One observation for future readers (not a blocker): the mixed-shape
migration gap and the "integration tests don't independently catch the
migrateShippedFrontmatter neuter" note above are both flagged in this
artifact so a later change to the write path doesn't silently reopen either
edge.
