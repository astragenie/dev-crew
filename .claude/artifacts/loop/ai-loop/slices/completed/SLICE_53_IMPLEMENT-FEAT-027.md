---
id: SLICE-53
title: Implement FEAT-027
status: completed
feature: FEAT-027
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
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

- [x] AC-1: Given a temp repo without `.github`, Then `present=false`; with a push-triggered workflow running `bun test`, Then `present=true` and `workflows` equals `["ci.yml"]`; with a workflow lacking push/pull_request triggers, Then `present=false`. Evidence: `crew/scripts/lib/ci/consumer-ci.mts` (`hasConsumerCi`) + `crew.mts has-consumer-ci` subcommand (commit 61976b5b). `cd crew && bun test tests/consumer-ci.test.mts` -> 12 pass (real temp repos via mkdtemp: no .github, push+pull_request `bun test`, workflow_dispatch-only, array-form `on`, trigger-but-no-test-cmd, stack.test vs stack.build, dotnet/go test). Verifier live-drove the CLI against 5 temp repos: empty -> present=false; push/pull_request + `bun test` -> present=true, workflows=["ci.yml"]; workflow_dispatch-only -> false; configured stack.test cmd=dotnet matched `dotnet test` -> true; push + only `bun run build` -> false. On this repo: `{"present":true,"workflows":["ci.yml"]}` (validations/20261106T164427Z-...).
- [x] AC-2: Given a temp repo without CI and `loop.validation.satisfiedByReview=true`, When `deriveValidationGate` runs, Then status is `required`; with CI present, Then satisfied-by-review applies. Evidence: `src/scripts/lib/validation-gate.mts` deriveValidationGate reaches satisfiedByReview only when `hasConsumerCi(repo).present` (cross-import registered in validate-repo-boundary ALLOWED_CROSS_IMPORTS). `bun test src/tests/validation-gate.test.mts` -> 29 pass, incl. new negative guards (approved review + no CI -> satisfied=false; CI file without push/pull_request -> not satisfied) and unchanged positive controls. Verifier probe script called deriveValidationGate directly: no CI + satisfiedByReview=true + approved review -> satisfied=false; add push/pull_request `bun test` workflow -> satisfied=true citing "consumer CI: ci.yml". Reviewer B confirmed behaviour when satisfiedByReview is false/unset is unchanged.
- [x] AC-3: Given the five docs (`orchestrate-slice.md`, `fix.md`, `crew/docs/routing-table.md`, `dispatcher-routing/SKILL.md`, `validator-gate/SKILL.md`), When `command-gate-policy.test` runs, Then each contains the exact policy sentence, none contains a forbidden phrase, and none cites `test.yml`. Evidence: byte-identical policy sentence present exactly once in each of commands/orchestrate-slice.md, commands/fix.md, crew/docs/routing-table.md, skills/workflow/dispatcher-routing/SKILL.md, skills/workflow/validator-gate/SKILL.md (commit 08fd9ac5); orchestrate-slice.md and fix.md gained the two-line `has-consumer-ci --repo` bash. `cd crew && bun test tests/command-gate-policy.test.mts tests/validation-gate-delegation.test.mts` -> 14 pass. Reviewer A, reviewer B and verifier each independently grepped: 0 hits for "No skip path", "No verifier dispatch", "`devcrew:reviewer` + `devcrew:verifier` concurrently", and `test.yml` (reviews/20261106T163156Z-..., 20261106T163255Z-...).
- [x] AC-4: Given the real tree, When `validate-agent-refs`, `validate-skills`, `validate-routing-table --coverage-only`, and the content-length gates run, Then all are green. Evidence: from the lane worktree, `bun src/scripts/validate-agent-refs.mts` rc=0, `bun src/scripts/validate-content-length.mts` rc=0 (touched SKILL.md files at 40/56 lines), `cd crew && bun scripts/validate-skills.mts` rc=0 (41 pre-existing non-fatal warnings, identical on base 5fe21f91), `cd crew && bun scripts/validate-routing-table.mts --coverage-only` rc=0; `bun run typecheck` rc=0 across root + root-test + crew tsc projects; biome lint/format clean on both scopes. crew suite 1809 pass / 0 fail; root suite failures limited to the pre-existing git-worktree integration flakes and the DEC-044 consumer-smoke ratchet (same set on base).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-027 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: crew:typescript-reviewer — approved (2 MINOR: vitest/jest not in known test-cmd list; arg-order substring match) — reviews/20261106T163255Z-review-result-slice-53-review-a-typescript.md
- Reviewer B: crew:reviewer — approved (1 MINOR: dead YAML-1.1 `on`-folding branch) — reviews/20261106T163156Z-review-result-slice-53-review-b-correctness.md
