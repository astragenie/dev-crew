---
id: SLICE-28
title: Implement FEAT-010
status: pending
feature: FEAT-010
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
---
# SLICE-28: Implement FEAT-010

Implements FEAT-010. See [feature file](../../../backlog/in-progress/FEAT-010.md) for product context.

## Objective

Carried from runner-plugin FEAT-299 (proposed-slices.mts validation gaps made load-bearing by SLICE-192's identity keying) after P0 parent-estate settlement, full scope -- SLICE-207 was never built in runner-plugin (verified: no worktree, no branch, no dispatch result, no merge commit on main), per dev-crew's own DEC-001 ('SLICE-207/FEAT-299 disposition is carry, not build'). Two gaps in src/scripts/lib/proposed-slices.mts, both now load-bearing because SLICE-192 (shipped, see FEAT-284) replaced count-based slice materialization with identity keying via a proposed_slice_id_suffix frontmatter stamp, with the ~200 pre-existing slices falling back to an exact title-match against proposed_slices[].title. Gap A: no uniqueness validation on proposed_slices[].title or id_suffix within a FEAT -- a duplicate title makes matchProposedIdSuffix's .find() collapse two legacy slices onto one id_suffix (recreating a FEAT-284-class duplicate-slice bug through a different door), while a duplicate id_suffix silently swallows one proposed entry so it is never created at all. Gap B (worse): clampSliceTitle trims whitespace before storing a slice's title, but proposed-slices.mts validates the raw untrimmed string, so a proposed title with leading/trailing whitespace can never === match its own stored entry on the legacy fallback -- causing an UNBOUNDED duplicate-recreation loop on every rerun of slice from-feature, each iteration publishing a fresh tracker issue (loop.mts:1567-1574), the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Acceptance direction: trim before validating/storing (or compare trimmed on the fallback path) plus a regression test asserting no growth across repeated reruns; add uniqueness validation on both title and id_suffix within a FEAT's proposed_slices, rejecting with a message naming the duplicate; scan the existing backlog for pre-existing duplicates before enabling the check so it does not fail CI on historical data unannounced.

## In scope

- src/scripts/lib/proposed-slices.mts: trim title at parse time (validateOne); add assertUniqueProposedSlices (title + id_suffix)
- src/scripts/lib/slice-linker/feature-lifecycle.mts: matchProposedIdSuffix trims both sides on the legacy title-match fallback
- Regression + unit tests in src/tests/proposed-slices.test.mts and src/tests/slice-from-feature-proposed-slices.test.mts

## Out of scope

- Retroactively rewriting FEAT-005's on-disk proposed_slices frontmatter (historical duplicate; FEAT-005 is done and fully materialized, not re-parsed by any live codepath)

## Acceptance criteria

- [x] AC-1: Given a proposed slice title with leading/trailing whitespace (e.g. ' Library core'), When it is validated against its own stored (trimmed) entry via the legacy title-match fallback, Then the trimmed comparison succeeds and the slice is recognized as already-materialized instead of being recreated. Evidence: `sliceFromFeature: a whitespace-padded proposed title matches its own legacy (unstamped) slice by trimmed title across repeated reruns` (src/tests/slice-from-feature-proposed-slices.test.mts) — fails on pre-fix code (proven via stash round-trip), passes with the fix (title trimmed in validateOne + matchProposedIdSuffix compares trimmed on both sides).
- [x] AC-2: Given a FEAT's proposed_slices containing two entries with the same title (or the same id_suffix), When materializeProposedSlices validates the array, Then it rejects with an error message naming the specific duplicate title or id_suffix, rather than silently collapsing them via .find() or silently swallowing the second entry. Evidence: `assertUniqueProposedSlices` in proposed-slices.mts, called from parseProposedSlices; unit tests `FEAT-010 Gap A: duplicate title...`/`duplicate id_suffix...` in src/tests/proposed-slices.test.mts assert the error names both indices and the duplicate value.
- [x] AC-3: Given the existing backlog corpus, When the pre-existing-duplicate scan runs BEFORE the uniqueness check is enabled, Then it reports any historical duplicates found so they can be resolved or explicitly grandfathered, and CI does not fail unannounced on historical data. Evidence: manual grep scan of all 7 backlog files carrying `proposed_slices:` (triaged/FEAT-014, in-progress/FEAT-006, done/FEAT-001..005) found ONE pre-existing duplicate — `.claude/artifacts/loop/backlog/done/FEAT-005.md` reuses `id_suffix: -SLICE-2` on two entries (lines 27-34, different titles). Gated safely: parseProposedSlices' two callers (pm-apply.mts at PM-decomposition time, feature-lifecycle.mts at slice-from-feature dispatch time) never re-parse a `done` FEAT's frontmatter in normal flow, and no CI validate-*.mts gate scans the whole backlog through parseProposedSlices — confirmed via grep, only those two callers exist. FEAT-005 is done + fully materialized (slices_complete has all 6 ids), so the new check does not fire on it and does not fail CI unannounced.
- [x] AC-4: Given a regression test that reruns slice-from-feature 3+ times against the same FEAT with a deliberately-untrimmed proposed title, When the test asserts on proposed-slice count, Then it shows zero growth across reruns (closing the GitHub-issue-598-class unbounded loop). Evidence: same test as AC-1, loops 3 reruns asserting `idempotent: true` and an unchanged `slices` array each time.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-010 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
