---
id: SLICE-53
title: Implement FEAT-027
status: pending
feature: FEAT-027
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-53: Implement FEAT-027

Implements FEAT-027. See [feature file](../../../backlog/in-progress/FEAT-027.md) for product context.

## Objective

Audit T5: validation-skip is a recorded, config-gated decision; verifier waived only with consumer CI

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a temp repo without `.github`, Then `present=false`; with a push-triggered workflow running `bun test`, Then `present=true` and `workflows` equals `["ci.yml"]`; with a workflow lacking push/pull_request triggers, Then `present=false`.
- [ ] AC-2: Given a temp repo without CI and `loop.validation.satisfiedByReview=true`, When `deriveValidationGate` runs, Then status is `required`; with CI present, Then satisfied-by-review applies.
- [ ] AC-3: Given the five docs (`orchestrate-slice.md`, `fix.md`, `crew/docs/routing-table.md`, `dispatcher-routing/SKILL.md`, `validator-gate/SKILL.md`), When `command-gate-policy.test` runs, Then each contains the exact policy sentence, none contains a forbidden phrase, and none cites `test.yml`.
- [ ] AC-4: Given the real tree, When `validate-agent-refs`, `validate-skills`, `validate-routing-table --coverage-only`, and the content-length gates run, Then all are green.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-027 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
