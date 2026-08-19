---
id: SLICE-32
title: Implement FEAT-009
status: completed
feature: FEAT-009
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-32: Implement FEAT-009

Implements FEAT-009. See [feature file](../../../backlog/in-progress/FEAT-009.md) for product context.

## Objective

Carried from runner-plugin FEAT-284 (git-anchored slice completion silently drops planned work on prose-only commit matches) after P0 parent-estate settlement. 5 of 7 slices already shipped in runner-plugin (src/scripts/lib/slice-linker/git-anchored-completion.mts, src/scripts/lib/proposed-slices.mts): SLICE-188 (real file-touching test fixtures replacing --allow-empty), SLICE-189 (diff-level evidence requirement + AC-7 subject-only token-pair matching), SLICE-190 (downgrade text-only matches to operator-visible warnings), SLICE-192 (materializeProposedSlices rewritten to key off id_suffix identity instead of an existingSlices.length prefix index), and SLICE-194 (AC-8 squash-merge bullet-line matching). Remaining scope: SLICE-191 (migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape so stale legacy stamps are re-derived under the new rules rather than trusted) and SLICE-193 (CLI escape hatch to force-materialize one named proposed slice by id_suffix, so a gapped FEAT can be repaired without calling BacklogStore directly, as the original live repro required). Both are internal backlog-data-model logic, not crew-seam-dependent. Explicitly carry forward an open caveat from runner-plugin's FEAT-284.md 'AC-8b status' section: live-HEAD recognition of real squash-merge evidence (e.g. commit 859be561) is NOT yet satisfied -- commits.find() selects a newer narration commit and never continues to the qualifying one -- and that gap is tracked as a separate defect (runner-plugin's FEAT-294, itself triaged but not yet in-flight) rather than part of SLICE-191/193's scope. Do not treat AC-8b as closed when scoping this carried FEAT.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given a FEAT whose proposed_slices_shipped frontmatter uses the old index-prefix shape, When the migration runs, Then it is rewritten to a per-id_suffix keyed shape and the FEAT's shipped/unshipped status for every existing entry is preserved exactly (no false-positive or false-negative re-flags).
- [x] AC-2: Given a FEAT with a gap in its materialized proposed_slices (one named entry never created), When an operator runs the new CLI escape hatch with that FEAT id and the target id_suffix, Then exactly that one slice is force-materialized without requiring direct BacklogStore access.
- [x] AC-3: Given the AC-8b squash-merge live-HEAD recognition gap (commits.find() selecting a newer narration commit over the qualifying one), When this FEAT's slices are graded/closed, Then the grade/close artifact explicitly notes AC-8b remains open and tracked under runner-plugin FEAT-294, not silently marked satisfied.
- [x] AC-4: Given repeated reruns of slice-from-feature against the same FEAT after the migration lands, When the regression test suite runs, Then it asserts zero growth in duplicate or orphaned proposed-slice entries across at least 3 simulated reruns.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-009 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## AC evidence (close-time, lead)

- AC-1: proposed-slices-shipped.test.mts 9 tests (shape migration, status preservation, desync contract); reviewer live-proved object-map silently nulls and array-of-mappings round-trips (review 20260819T213000Z).
- AC-2: reviewer ran the real CLI 3x as subprocesses on a temp fixture — one slice materialized with correct stamp; second run refused (ProposedSliceAlreadyMaterializedError); bogus suffix refused with no partial write.
- AC-3: satisfied AT CLOSE — the grade artifact for this slice records AC-8b as OPEN, tracked under runner-plugin FEAT-294 (grade lessons, first entry); in-code caveat at git-anchored-completion.mts commits.find().
- AC-4: git-anchored-completion.test.mts 3-rerun zero-growth regression; neuter round-trip proved it bites (6 fails when migrateShippedFrontmatter neutered).
