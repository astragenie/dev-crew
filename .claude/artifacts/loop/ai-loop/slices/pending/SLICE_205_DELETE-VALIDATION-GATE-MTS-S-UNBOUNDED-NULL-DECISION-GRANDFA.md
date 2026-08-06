---
id: SLICE-205
title: "Delete validation-gate.mts's unbounded null-decision grandfather clause"
status: pending
feature: FEAT-295
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-06
updated: 2026-08-06
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
touches_files: [src/scripts/lib/validation-gate.mts, .claude/artifacts/crew/validations, src/tests/validation-gate.test.mts]
github_issue: 628
github_url: "https://github.com/astragenie/runner-plugin/issues/628"
---
# SLICE-205: Delete validation-gate.mts's unbounded null-decision grandfather clause

Implements FEAT-295. See [feature file](../../../backlog/in-progress/FEAT-295.md) for product context.

## Objective

validation-gate.mts carries a second unbounded grandfather clause, twin of the one deleted from review-gate.mts.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given resolveVerdictOutcome in validation-gate.mts (around line 158) currently treats a validation artifact with no decision key as satisfied (legacy, no decision frontmatter, grandfathered pre-P1.3), When this slice ships, Then that branch is deleted so a decision-less validation artifact no longer satisfies the gate, mirroring SLICE-202's removal of the equivalent review-gate.mts branch.
- [ ] AC-2: Given the validation corpus under .claude/artifacts/crew/validations has not yet been counted for missing-decision-key coverage, When this slice starts, Then it counts the corpus first (matching how the review corpus's 160/211 frontmatter-less figure was produced) and reports the number before deleting the branch.
- [ ] AC-3: Given any currently-open slice whose only validation evidence is frontmatter-less, When the corpus count identifies it, Then each such slice is named so it can be re-validated or given an explicit validation_skipped badge before the branch is deleted.
- [ ] AC-4: Given this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview:true, When the branch is deleted, Then the module header comment documenting the grandfathering behavior is also updated, and any now-dead legacy flag and its consumers (the pattern SLICE-202 followed for ReviewGateResult) are removed.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-295 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
