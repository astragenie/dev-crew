---
id: SLICE-101
title: Cost-regression formula switch (median ↔ expected_usd) — FEAT-167 closing slice
status: completed
feature: FEAT-167
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-101: Cost-regression formula switch (FEAT-167 closing slice)

Closes FEAT-167. Wires the config-gated mode flip (AC-4), the sizing scenarios (AC-5), and the integration test (AC-6). AC-2 (backfill script) is explicitly deferred — see closure note.

## Status of FEAT-167 ACs at slice start

- AC-1 mapper — shipped (SLICE-97, v0.40.0)
- AC-2 backfill script — **deferred (this slice closes the FEAT without it)**
- AC-3 observability log — shipped (v0.40.0, currently emits `mode: "median"`)
- AC-4 config-gated mode flip — **this slice**
- AC-5 sizing scenarios — **this slice**
- AC-6 integration test — **this slice**
- AC-7 manifest validator — shipped (SLICE-97)

## Objective

Add an `expected_usd` evaluation path to `checkCostRegression`. Mode is selected by `config.loop.costRegressionMode` ("median" | "expected_usd"). When mode is unset, auto-flip to `expected_usd` once at least three `done/FEAT-*.md` files carry `effort_points`. When mode is `expected_usd` AND the current cost report exposes `effort_points`, compute `expected_usd = effort_points × median_usd_per_point` (from config bootstrap `costMedianUsdPerPoint` or computed from completed FEATs) and use `expected_usd × multiplier` as the threshold instead of `median × multiplier`.

## In scope

- `src/scripts/lib/cost-alert-loader.mts::AggregateCostReport`: add optional `effortPoints: number | null` field; parser reads `frontmatter.effort_points` when present. Back-compat: missing field → null. (Cost-report writer side does NOT inject this yet — separate FEAT; the field remains null in production until that ships.)
- `src/scripts/lib/cost-regression.mts`:
  - New helpers `resolveCostRegressionMode(config)` and `resolveCostMedianUsdPerPoint(config)`.
  - New helper `countDoneFeatsWithEffortPoints(repoPath)` — counts `.claude/artifacts/loop/backlog/done/FEAT-*.md` files whose frontmatter has integer `effort_points`. Resolves mode auto-flip threshold.
  - `checkCostRegression`:
    - Determine `mode` per the spec above.
    - If `mode === "expected_usd"` AND `current.effortPoints != null` AND `medianUsdPerPoint != null`: compute `expectedUsd = effortPoints * medianUsdPerPoint`; `threshold = expectedUsd * multiplier`. Compare against `currentUsd`.
    - Else: existing median-mode behavior.
    - `emitObservabilityLog` carries the true mode + values.
  - Return shape gains optional `expectedUsd: number | null` so callers can surface it.
- New tests:
  - `src/tests/cost-regression-mode-flip.test.mts`:
    - `explicit-median-mode`: config sets `costRegressionMode: "median"` → no flip even with 3+ done FEATs with effort_points.
    - `explicit-expected-mode`: config sets `costRegressionMode: "expected_usd"` + bootstrap median → uses expected formula.
    - `auto-flip-at-3-samples`: mode unset; populate 2 done FEATs with effort_points → stays median; add 3rd → flips to expected_usd.
  - `src/tests/cost-regression-sizing.test.mts`:
    - `1-point-hot`: effort_points=1, median=10, multiplier=3, actual=100 → threshold=30 → TRIGGERED.
    - `13-point-safe`: effort_points=13, median=10, multiplier=3, actual=150 → threshold=390 → NOT triggered.
  - `src/tests/cost-regression-integration.test.mts`:
    - `slice-close-regression-check`: write a slice cost report with `effort_points` + 3 historical, call `checkStopConditions`, assert observability log captures decision shape (mode, threshold, triggered).
- `src/scripts/validate-manifests.mts` (light extension): config schema validation — `loop.costRegressionMode` must be one of `null | "median" | "expected_usd"`; `loop.costMedianUsdPerPoint` must be `null` or a non-negative number.

## Out of scope

- AC-2 backfill script (`scripts/backfill-effort-points.mjs`). Closure note: not shipping. Production cost regression continues in median mode until cost-report writer emits `effort_points` AND PM agent triages new FEATs with `effort_points` AND ≥3 done FEATs accumulate them. The formula is in place; activation lights up automatically when those conditions are met.
- Cost-report writer side `effort_points` injection — separate FEAT against hero-crew (where the cost writer lives).
- Recomputing `median_usd_per_point` dynamically from completed FEATs. SLICE-101 uses the config bootstrap value; dynamic compute is a follow-up.

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2 (FEAT AC-4 — mode flip): `cost-regression-mode-flip.test.mts` covers explicit-median, explicit-expected, and auto-flip-at-3-samples. All PASS.
- [ ] AC-3 (FEAT AC-5 — sizing scenarios): `cost-regression-sizing.test.mts` covers the 1-point-hot + 13-point-safe scenarios verbatim from FEAT-167 AC-5. Both PASS, with `>` comparison (not `>=`).
- [ ] AC-4 (FEAT AC-6 — integration): `cost-regression-integration.test.mts::slice-close-regression-check` writes a full slice cost report + 3 historicals, mocks the config to `costRegressionMode: "expected_usd"`, calls `checkStopConditions`, and asserts both the JSON observability log contents AND the stop-decision snapshot fields. PASS.
- [ ] AC-5 (config schema): `validate-manifests.mts` rejects `costRegressionMode: "garbage"` with a diagnostic line citing the file + field. Existing manifest validation passes on current repo state (no `costRegressionMode` in `.claude/loop.json`).

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean (no NEW errors).
- `bunx tsc --project tsconfig.json --noEmit` and `tsconfig.test.json --noEmit` clean.
- Final-synthesis artifact written.
- FEAT-167 moves to `done/` with `slices_complete: [SLICE-97, SLICE-101]` and a frontmatter note: `ac_deferred: [AC-2]` with deferral rationale.

## Reviewer ladder

- Reviewer A (correctness): verify auto-flip threshold uses `>= 3` (not `> 3`); verify the explicit-mode config wins over auto-flip; verify `>` comparison (FEAT-167 AC-5 explicitly uses `>`, not `>=`).
- Reviewer B (production-readiness): verify back-compat — current code path with `costRegressionMode` unset AND zero done FEATs with effort_points MUST behave identically to today (median mode, all existing tests pass unchanged); verify the deferral of AC-2 is documented in the FEAT frontmatter (`ac_deferred:` field) so future maintainers don't think the backfill silently shipped.
