---
id: SLICE-97
title: "Story-point sizing: pm-effort mapper + manifest validator (FEAT-167 slice-a)"
status: completed
feature: FEAT-167
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 214
github_url: "https://github.com/sergeymilashico/loop/issues/214"
completed_at: 2026-06-11
---
# SLICE-97: Story-point sizing — pm-effort mapper + manifest validator (FEAT-167 slice-a)

Implements **AC-1 + AC-7** of FEAT-167. See [feature file](../../../backlog/in-progress/FEAT-167.md) for full context. Slices b (backfill) and c (cost-regression mode flip + observability) ship in follow-up slices.

## Objective

Land the **pure additive foundations** for story-point sizing:

1. Deterministic mapping from `pm_effort_estimate` (0.0–1.0 float) to Fibonacci `effort_points` (1|2|3|5|8|13).
2. Manifest-level validation of `effort_points` and `expected_usd` frontmatter fields.

No behavior flip. Cost-regression gate still runs in `median` mode. No FEATs are backfilled. Goal: ship the contract surface so slice-b can backfill against a validated schema and slice-c can flip the regression formula safely.

## In scope

- New module `src/scripts/lib/pm-effort-mapper.mts` exporting `mapEffortEstimateToPoints(value: number): 1|2|3|5|8|13`.
- Unit tests `src/tests/pm-effort-mapper.test.mts` covering all 6 bands + boundary cases (0.0, 0.0999, 0.1, 0.2499, 0.25, 0.3999, 0.4, 0.5999, 0.6, 0.8499, 0.85, 1.0) + out-of-range guard (negative / >1 → throw).
- New helper `validateEffortPointsAndExpectedUsd(frontmatter, medianUsdPerPoint?)` inside `src/scripts/validate-manifests.mts` enforcing:
  1. `effort_points`, if present, ∈ {1,2,3,5,8,13}.
  2. `expected_usd`, if present, is a non-negative number.
  3. If both present **and** `medianUsdPerPoint` is supplied, `expected_usd ≈ effort_points × medianUsdPerPoint` (±0.01 tolerance).
- Tests `src/tests/manifest-validation-effort.test.mts` covering: missing fields (allowed), valid Fibonacci, invalid value (e.g. 4), expected_usd mismatch, expected_usd without median (skipped check).
- Wire validator call into the existing `validate-manifests.mts` per-FEAT loop so CI catches drift on every PR.

## Out of scope

- AC-2 backfill script (SLICE-98).
- AC-3 cost-regression observability JSON log line (SLICE-99).
- AC-4 config-gated mode flip (SLICE-99).
- AC-5 regression scenario tests (SLICE-99).
- AC-6 integration test of slice-close regression decision (SLICE-99).
- PM agent prompt edits to emit `effort_points` during triage (out — pure infra slice).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2: `mapEffortEstimateToPoints(x)` returns the Fibonacci band per the FEAT-167 § AC-1 table for every band + boundary case. Negative or >1 input throws `RangeError`. Unit tests in `src/tests/pm-effort-mapper.test.mts` cover all 12 listed boundary values + 2 throw cases (all PASS).
- [ ] AC-3: `validate-manifests.mts` rejects any FEAT with `effort_points: 4` (or any non-Fibonacci) with a non-zero exit code and a diagnostic line citing the FEAT id + offending value. FEATs without `effort_points` continue to pass (backward compatible). Test `src/tests/manifest-validation-effort.test.mts::rejects-non-fibonacci` proves the negative case; `::allows-missing` proves backward compat. `bun ./src/scripts/validate-manifests.mts` exits 0 on the current backlog (no FEAT yet has `effort_points` — that's the point of slice-b).

## Done When

- All AC PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bun ./src/scripts/validate-manifests.mts` exits 0.
- `bun ./src/scripts/validate-content-length.mts` exits 0.
- Crew `final-synthesis` artifact written.
- Feature FEAT-167 stays in `in-progress/` (slices b + c remain open).

## Reviewer ladder

- Reviewer A (correctness + AC coverage): verify boundary table matches FEAT-167 AC-1 exactly; verify tolerance check (`±0.01`) is implemented as `Math.abs(diff) <= 0.01`, not `<`; verify validator hook actually runs in CI path (`.github/workflows/test.yml` invokes `validate-manifests`).
- Reviewer B (production-readiness): verify validator emits actionable diagnostic (FEAT id + offending value), no `process.exit()` inside the helper (library code returns errors, entry point sets `process.exitCode`), no breaking change to existing FEAT frontmatter parsing.
