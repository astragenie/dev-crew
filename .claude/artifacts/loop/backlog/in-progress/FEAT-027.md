---
id: FEAT-027
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: [FEAT-024, FEAT-034]
slices: [SLICE-53]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.4
pm_dependency_depth: 0.2
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P1, holds. technical_risk raised slightly to 0.4 (band 0.3-0.5: now wires into validation-gate.mts's existing conditional logic, a small increase in cross-module reach over the original isolated-module design, but still no schema change)."
started_at: 2026-11-06
---
## Description

Audit T5: validation-skip is a recorded, config-gated decision; verifier waived only with consumer CI

Source: remediation plan Task 5; audit #10; Codex #23; reviewer MAJOR (five docs, test.yml drift, deriveValidationGate); architect OBJ-13/OBJ-14. Wave 2 lane B. Depends on: FEAT-024 (crew.mts verdict handlers; this adds a sibling subcommand), FEAT-034 (planner gating).

Problem: commands/orchestrate-slice.md (RISK_GATE=false branch) says "Do not dispatch a dedicated verifier"; commands/fix.md:116 says "No verifier dispatch"; crew/docs/routing-table.md:64 says always; skills/workflow/dispatcher-routing/SKILL.md:36,41 says "devcrew:reviewer + devcrew:verifier concurrently"; skills/workflow/validator-gate/SKILL.md:20,30,37-38 carries the same contradiction. orchestrate-slice.md:509,537,548 and validator-gate/SKILL.md:20 cite `.github/workflows/test.yml`, which is ci.yml here and may not exist in a consumer. The real skip decision is already config-driven at close time (src/scripts/lib/validation-gate.mts:243 deriveValidationGate honours loop.validation.satisfiedByReview, config-resolver.mts:213) and nothing checks that the consumer has CI.

Deliverable:
- crew/scripts/lib/ci/consumer-ci.mts: hasConsumerCi(repoPath) → {present, workflows[]}; present only when a `.github/workflows/*.yml` triggers on push or pull_request AND runs the repo's configured test command (`.claude/loop.json` stack.test[].cmd — not stack.build) or any of bun test / npm test / dotnet test / pytest / go test. Subcommand `crew.mts has-consumer-ci --repo <path> [--json]`.
- src/scripts/lib/validation-gate.mts: deriveValidationGate honours satisfiedByReview only when hasConsumerCi(repo).present; otherwise status=required. Tests in src/tests/.
- One policy sentence, identical in the FIVE docs (orchestrate-slice.md, fix.md, crew/docs/routing-table.md, dispatcher-routing/SKILL.md, validator-gate/SKILL.md): "LOW-risk slices: one reviewer; verifier is replaced by `write-validation-result --decision skipped --skip-reason "delegated to CI: <workflow file>"` only when `has-consumer-ci` reports present; otherwise dispatch `devcrew:verifier`." Forbidden phrases removed: "No skip path", "No verifier dispatch", "`devcrew:reviewer` + `devcrew:verifier` concurrently". Replace every `.github/workflows/test.yml` with `ci.yml` (6 sites). orchestrate-slice.md and fix.md gain the two-line bash calling has-consumer-ci.
- Tests: crew/tests/consumer-ci.test.mts, crew/tests/command-gate-policy.test.mts (five docs, exact sentence present, forbidden phrases absent, no test.yml).

Acceptance criteria (draft):
- Given a temp repo without .github, then present=false; with a push-triggered workflow running `bun test`, then present=true and workflows equals ["ci.yml"]; with a workflow lacking push/pull_request triggers, then present=false.
- Given a temp repo without CI and loop.validation.satisfiedByReview=true, when deriveValidationGate runs, then status is required; with CI present, then satisfied-by-review applies.
- Given the five docs, when command-gate-policy.test runs, then each contains the exact policy sentence, none contains a forbidden phrase or `test.yml`.
- validate-agent-refs, validate-skills, validate-routing-table --coverage-only, content-length gates green.

Scope: the five docs, crew/scripts/crew.mts (one subcommand), crew/scripts/lib/ci/, src/scripts/lib/validation-gate.mts, crew/tests/, src/tests/. Not commands/build.md or agents/ (FEAT-028/029).

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a temp repo without `.github`, Then `present=false`; with a push-triggered workflow running `bun test`, Then `present=true` and `workflows` equals `["ci.yml"]`; with a workflow lacking push/pull_request triggers, Then `present=false`.
- AC-2: Given a temp repo without CI and `loop.validation.satisfiedByReview=true`, When `deriveValidationGate` runs, Then status is `required`; with CI present, Then satisfied-by-review applies.
- AC-3: Given the five docs (`orchestrate-slice.md`, `fix.md`, `crew/docs/routing-table.md`, `dispatcher-routing/SKILL.md`, `validator-gate/SKILL.md`), When `command-gate-policy.test` runs, Then each contains the exact policy sentence, none contains a forbidden phrase, and none cites `test.yml`.
- AC-4: Given the real tree, When `validate-agent-refs`, `validate-skills`, `validate-routing-table --coverage-only`, and the content-length gates run, Then all are green.
