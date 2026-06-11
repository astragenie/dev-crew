---
id: SLICE-91
title: Per-repo cost attribution in regression check
status: completed
feature: FEAT-166
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 203
github_url: "https://github.com/sergeymilashico/loop/issues/203"
completed_at: 2026-06-11
---
# SLICE-91: Per-repo cost attribution in regression check

Implements FEAT-166. See [feature file](../../../backlog/in-progress/FEAT-166.md) for product context.

## Objective

`cost-regression.mjs` reads `fm.usd` from aggregate reports without filtering by source project. When parallel work runs in adjacent projects (loop + hero-crew + loopobserver) during the same time window, the aggregate USD inflates and trips the regression gate against the project under inspection.

## In scope

- `scripts/lib/cost-alert-loader.mjs::parseAggregateReportFile` returns a `perProjectUsd: Record<string, number> | null` field parsed defensively from aggregate cost-report frontmatter.
- `scripts/lib/cost-regression.mjs::checkCostRegression` filters cost samples by `config.loop.costProject` (and `costProjectAliases`) when `perProjectUsd` is present, comparing the project's slice of USD against its own rolling median.
- Back-compat fallback: when `perProjectUsd` is missing from a report, behaviour is unchanged — compare `fm.usd` against rolling median as today.
- Tests covering the three branches: (a) map present, current project's slice hits threshold; (b) map present, current project safe but other projects over; (c) map absent, back-compat path uses `fm.usd`.

## Out of scope

- hero-crew SLICE-1 (upstream emit of `per_project_usd` in aggregate writer) — separate cross-plugin slice tracked under FEAT-166 body.
- Backfilling per-project map into historical aggregate reports.
- FEAT-165 per-skill cost attribution (separate FEAT).

## Acceptance criteria

- [x] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000` → 1152 pass / 0 fail) and linter is clean (`bun run lint` → 36 warnings = baseline, zero new).
- [x] AC-2: `parseAggregateReportFile` returns `perProjectUsd` as `Record<string, number>` when frontmatter contains the field, `null` when absent. Covered by `src/tests/cost-alert-loader.test.mts` (6 cases).
- [x] AC-3: `checkCostRegression` filters by `config.loop.costProject` + `costProjectAliases` when `perProjectUsd` is present — sums project + alias entries. Covered by `cost-regression.test.mts` case (a) + alias-only coverage.
- [x] AC-4: `checkCostRegression` falls back to `fm.usd` when `perProjectUsd` is missing — pre-FEAT-166 behaviour preserved exactly. Covered by case (c).
- [x] AC-5: Case (b) confirms regression does NOT trip when current project's `perProjectUsd` slice is below threshold even though aggregate `fm.usd` is over — prevents the 2026-06-09 false-trip class.
- [x] AC-6: Loop-snapshot regeneration deferred — back-compat path is a no-op against today's data (no aggregate report carries `perProjectUsd` yet), so the snapshot would show the same trajectory. Activates when hero-crew SLICE-1 ships upstream.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-166 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A (correctness + AC coverage): inline-build PASS — all 6 ACs map to passing tests; fallback path is the only behaviour change when `perProjectUsd` absent; `costProjectAliases` correctly summed via `extractProjectUsd` helper.
- Reviewer B (production-readiness): inline-build PASS — parser defensive (non-numeric skipped, malformed YAML doesn't crash); no `process.exit(N)` added; lint 0 new warnings; back-compat preserves pre-FEAT-166 behaviour exactly when no report carries the new field (which is the entire current dataset).
