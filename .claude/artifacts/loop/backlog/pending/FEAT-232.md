---
id: FEAT-232
status: pending
priority: P3
category: maintenance
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: [FEAT-231]
slices: []
derived_from: null
tags: [concern:memory, surface:plugin, stack:typescript]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Debt from v0.64.0 architect design review (2026-07-08, finding #2, latent-dead-code). After FEAT-188 S3b moved slice-start recall to formatRecallBlockV1, recall-injector.mts's formatRecallBlock (the old RecallResult formatter) appears to have no remaining caller. Mechanical dead-code removal — verify no callers, then delete. autonomous_safe: true (behavior-preserving cleanup). Depends on FEAT-231 (which may retire the last recallPrior/RecallResult consumers first) so removal is done once, cleanly."
---
# FEAT-232: remove now-unused legacy recall formatter (recall-injector.formatRecallBlock)

## Problem

FEAT-188 S3b (#366) moved slice-start recall onto `formatRecallBlockV1`
(`start-slice.mts`), leaving `recall-injector.mts`'s `formatRecallBlock` (the old
`RecallResult`-shape formatter) with no live caller found on a dispatch surface.
Latent dead code — carries a stale block format that no longer ships, and a
`RecallResult` type dependency on `memory-recall.mts`.

## Goal

Confirm `recall-injector.formatRecallBlock` (and any exports orphaned with it)
has zero callers, then remove the dead code. Behavior-preserving — nothing that
ships changes.

## Acceptance criteria

- AC-1: GIVEN a repo-wide grep for `formatRecallBlock` (excluding
  `formatRecallBlockV1`), WHEN checked, THEN the only match before removal is the
  definition itself + its test; after removal, zero matches.
- AC-2: GIVEN the removal, WHEN the suite runs, THEN it is green with no test
  referencing the removed symbol left dangling (delete/retarget its test too).
- AC-3: GIVEN `recall-injector.mts` becomes empty of live exports, THEN the module
  file is deleted (not left as an empty husk); any remaining live export stays and
  the file is kept.
- AC-4: Typecheck + lint + format clean; snapshot-freshness passes.

## Risks / open questions

- Order vs FEAT-231: if the reviewer/validator convergence (FEAT-231) still routes
  through `RecallResult`/`recall-injector` transiently, do the removal AFTER it, so
  the dead-code set is final. Depends_on FEAT-231.
- Confirm `memory-recall.mts`'s `RecallResult` type still has other consumers
  before assuming the whole module is dead — it is NOT (memory-context.mts uses
  `recallPrior` until FEAT-231 lands). Scope this FEAT to the FORMATTER only.

## Refs

- Architect review: `.claude/artifacts/crew/reviews/20260708T081707Z-...design...md` (finding #2, latent dead code).
- `src/scripts/lib/recall-injector.mts` (`formatRecallBlock`).
- FEAT-231 (recall convergence — the prerequisite that retires the last consumers).
