---
id: SLICE-49
title: Implement FEAT-024
status: completed
feature: FEAT-024
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
---
# SLICE-49: Implement FEAT-024

Implements FEAT-024. See [feature file](../../../backlog/in-progress/FEAT-024.md) for product context.

## Objective

Audit T4: explicit, per-reviewer aggregated review and validation verdicts; scaffolds never flip the gate

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given a run, When `write-review-result` is called with no `--status` (or `--status completed`) and no `--decision`, Then it exits `2` and stderr matches `/--decision is required/`. Evidence: crew/tests/review-verdict-aggregation.test.mts covers both no-status and --status completed with no --decision; verifier hand-run rc=2 with stderr `[crew] write-review-result refused: --decision is required (approved|approved_with_notes|rejected).` (validations/20261106T033507Z-validation-result-slice-49-...md).
- [x] AC-2: Given `--scaffold --status in-progress` with no `--decision`, Then it exits `0`, the artifact path is recorded, and `gates.review` is unchanged (no `review_passed`). Evidence: test `--scaffold --status in-progress ... exits 0 and leaves gates.review untouched`; verifier hand-run rc=0, gates.review unchanged, path recorded at currentRun.artifacts.reviewResult.
- [x] AC-3: Given reviewer `a=rejected` then `b=approved` (and the mirror order), Then `gates.review.status` is `failed` and `reviewers` equals `{a: rejected, b: approved}`. Evidence: tests for both write orders; verifier hand-run gave {status: failed, reviewers: {a: rejected, b: approved}} and the mirror order also failed.
- [x] AC-4: Given a run brief under ladder `["A","B"]` (roles resolved) and only one reviewer has written `approved`, Then status is `required`; after both have written `approved`, Then status is `passed`. Evidence: after 95d5e140 (required = slot count) and 5338fa5d (fanout prompt passes --reviewer A|B), tests use the real role names typescript-reviewer + reviewer against ladder [A,B] and go required then passed; this repo's live run reached passed with {reviewer, typescript-reviewer} over required [A,B] (reviews/20261106T034415Z-...-review-b-correctness.md).
- [x] AC-5: Given `write-validation-result --decision skipped` without `--skip-reason`, Then it exits `2`; with `--skip-reason`, Then `validation_skipped` carries the reason, and `cd crew && bun test tests/` plus `validate-badges` are both green. Evidence: verifier: --decision skipped without --skip-reason rc=2 (schema: skip_reason required); with --skip-reason x gates.validation = {status: skipped, note: `skipped: x`}; `cd crew && bun test tests/` 1904 pass 0 fail on the merged tree; validate-badges rc=0.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-024 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
