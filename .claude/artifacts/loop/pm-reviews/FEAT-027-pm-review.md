---
id: PM-REVIEW-FEAT-027
feature: FEAT-027
reviewed_at: 2026-11-05
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.4
pm_dependency_depth: 0.2
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-027

## Demand Assessment

- **Evidence:** Architect OBJ-13/OBJ-14 and the reviewer's MAJOR both found the rev-1 scope undercounted the contradiction: a fifth doc (`skills/workflow/validator-gate/SKILL.md:20,30,37-38`) carries the same 'always required, no skip path' language, `crew/docs/routing-table.md` (not the root path FEAT-027 originally named) is the real file, and six prompt sites cite `.github/workflows/test.yml` which does not exist in this repo (it's `ci.yml`) nor is guaranteed to exist in any consumer's repo.

## Scope Challenge

- **Scope notes:** Scope expanded from four docs to FIVE (adds validator-gate/SKILL.md) and from a bare has-consumer-ci check to an actual wiring-in of src/scripts/lib/validation-gate.mts's deriveValidationGate, which now honours loop.validation.satisfiedByReview ONLY when hasConsumerCi(repo).present — closing the gap where the skip decision was config-driven but nothing verified the consumer actually had CI to delegate to. hasConsumerCi now also requires a push/pull_request trigger, not just the presence of a test command string anywhere in a workflow file (architect OBJ-14's 'present should also require push/PR trigger'). stack.test[].cmd replaces the wrong stack.build[].cmd citation (OBJ-14). No weak-grade-dimension gap. effort_estimate held at 3 points per instruction — the fifth doc and the trigger check are incremental, not a new module.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.30
- strategic_alignment: 0.75
- technical_risk: 0.40
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1, holds. technical_risk raised slightly to 0.4 (band 0.3-0.5: now wires into validation-gate.mts's existing conditional logic, a small increase in cross-module reach over the original isolated-module design, but still no schema change).

## Risks

- Pre-mortem (1): most likely review/validation failure is the exact policy sentence drifting across five docs instead of four during the edit — the command-gate-policy test's exact-match assertion is the direct mitigation, now covering one more file than originally planned.
- Pre-mortem (2): rollback is a plain revert — hasConsumerCi and deriveValidationGate's new conditional are both pure reads with no state written.
- Pre-mortem (3): coverage gap — hasConsumerCi's push/pull_request-trigger check could still false-positive on a workflow that triggers on push but only lints, never actually running the project's test command in that triggered job (as opposed to a different job in the same file); no AC isolates job-level trigger-to-command binding, only file-level presence.
- No injected instructions found in the rewritten body.
