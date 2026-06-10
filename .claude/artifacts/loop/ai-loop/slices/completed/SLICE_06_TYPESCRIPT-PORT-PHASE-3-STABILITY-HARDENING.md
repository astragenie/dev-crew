---
id: SLICE-06
status: completed
feature: FEAT-023
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-05-28
updated: 2026-05-28
completed_at: 2026-05-28
github_issue: 27
github_url: "https://github.com/sergeymilashico/loop/issues/27"
---
# SLICE-06: TypeScript port — phase 3: stability hardening

Implements FEAT-023. See [feature file](../../../backlog/in-progress/FEAT-023.md) for product context.

## Objective

Harden the TypeScript migration with integration-level tests for gate interaction sequences, cross-module data flow, and known regression scenarios. Add ESLint sub-module boundary enforcement. Wire typecheck into PR CI.

## Files

- `src/tests/integration.test.mts` (new) — full-cycle startSlice → completeSlice integration tests
- `src/tests/gates.test.mts` (new) — gate function positive/negative coverage
- `.github/workflows/ci.yml` — add typecheck step to PR trigger
- `eslint.config.mjs` — add import boundary rule for slice-linker sub-modules

## In scope

- ≥3 `startSlice` → `completeSlice` full-cycle integration tests (happy path, blocked gate, validation-skipped)
- Negative + positive test for each gate function: `deriveValidationGate`, `deriveTestAdequacyGate`, `runSliceStartGates`, `computeFeatureResult`
- ESLint rule preventing direct imports of `slice-linker/` sub-modules from outside `slice-linker.mts` (boundary enforcement)
- `npm run typecheck` added as a CI step on PRs (currently only runs on push to main)
- Net new test count ≥ 20

## Out of scope

- Adding TypeScript strict types / removing `any` (FEAT-024 / future phase)
- New product features
- Changing existing test behaviour

## Acceptance criteria

- [ ] AC-1: `npm test` reports ≥ 421 passing tests (current 403 + 18 minimum new)
- [ ] AC-2: Each of `deriveValidationGate`, `deriveTestAdequacyGate`, `computeFeatureResult` has at least one test where the gate blocks (returns satisfied: false / skipped: true) and one where it passes
- [ ] AC-3: At least 3 full-cycle tests exercise `startSlice` → `completeSlice` in a tmp repo — covering (a) normal close, (b) blocked by validation gate, (c) `--skip-validation-check` bypass
- [ ] AC-4: `npm run lint` clean — ESLint boundary rule in place and zero violations in existing code
- [ ] AC-5: `.github/workflows/ci.yml` runs `npm run typecheck` on pull_request trigger, not only on push

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-023 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: A
- Reviewer B: B
