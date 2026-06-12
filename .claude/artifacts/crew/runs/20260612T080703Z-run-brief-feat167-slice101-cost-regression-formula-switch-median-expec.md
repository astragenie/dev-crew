---
feature: FEAT-167
status: active
---
# Run Brief: FEAT167 SLICE101: Cost-regression formula switch (median ↔ expected_usd) — FEAT-167 closing slice

- Created: 2026-06-12T08:07:03.072Z
- Tier: full
- Goal: Add an `expected_usd` evaluation path to `checkCostRegression`. Mode is selected by `config.loop.costRegressionMode` ("median" | "expected_usd"). When mode is unset, auto-flip to `expected_usd` once at least three `done/FEAT-*.md` files carry `effort_points`. When mode is `expected_usd` AND the current cost report exposes `effort_points`, compute `expected_usd = effort_points × median_usd_per_point` (from config bootstrap `costMedianUsdPerPoint` or computed from completed FEATs) and use `expecte
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/cost-alert-loader.mts::AggregateCostReport`: add optional `effortPoints: number | null` field; parser reads `frontmatter.effort_points` when present. Back-compat: missing field → null. (Cost-report writer side does NOT inject this yet — separate FEAT; the field remains null in production until that ships.)
- `src/scripts/lib/cost-regression.mts`:
  - New helpers `resolveCostRegressionMode(config)` and `resolveCostMedianUsdPerPoint(config)`.
  - New helper `countDoneFeatsWithEffortPoints(repoPath)` — counts `.claude/artifacts/loop/backlog/done/FEAT-*.md` files whose frontmatter has integer `effort_points`. Resolves mode auto-flip threshold.
  - `checkCostRegression`:
    - Determine `mode` per the spec above.
    - If `mode === "expected_usd"` AND `current.effortPoints !=
- Out Of Scope:
  - - AC-2 backfill script (`scripts/backfill-effort-points.mjs`). Closure note: not shipping. Production cost regression continues in median mode until cost-report writer emits `effort_points` AND PM agent triages new FEATs with `effort_points` AND ≥3 done FEATs accumulate them. The formula is in place; activation lights up automatically when those conditions are met.
- Cost-report writer side `effor
- Planned Files: -
- Next Step: Begin implementation

