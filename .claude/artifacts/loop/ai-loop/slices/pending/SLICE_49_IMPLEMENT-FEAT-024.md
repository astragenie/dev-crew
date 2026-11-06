---
id: SLICE-49
title: Implement FEAT-024
status: pending
feature: FEAT-024
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
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

- [ ] AC-1: Given a run, When `write-review-result` is called with no `--status` (or `--status completed`) and no `--decision`, Then it exits `2` and stderr matches `/--decision is required/`.
- [ ] AC-2: Given `--scaffold --status in-progress` with no `--decision`, Then it exits `0`, the artifact path is recorded, and `gates.review` is unchanged (no `review_passed`).
- [ ] AC-3: Given reviewer `a=rejected` then `b=approved` (and the mirror order), Then `gates.review.status` is `failed` and `reviewers` equals `{a: rejected, b: approved}`.
- [ ] AC-4: Given a run brief under ladder `["A","B"]` (roles resolved) and only one reviewer has written `approved`, Then status is `required`; after both have written `approved`, Then status is `passed`.
- [ ] AC-5: Given `write-validation-result --decision skipped` without `--skip-reason`, Then it exits `2`; with `--skip-reason`, Then `validation_skipped` carries the reason, and `cd crew && bun test tests/` plus `validate-badges` are both green.

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
