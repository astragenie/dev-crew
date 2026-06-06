---
id: SLICE-57
status: completed
feature: FEAT-059
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-57: Configurable grade-trend threshold + autoMode warn-alert demotion

Implements FEAT-059. See [feature file](../../../backlog/in-progress/FEAT-059.md) for product context.

## Objective

Two surgical edits to let autonomous-mode marathons continue when grade-trend warn fires.

## In scope

- `src/scripts/lib/pattern-alerts.mts` — read thresholds + per-dim overrides from `config.loop.*`; remove today's hard-coded `PER_DIMENSION_THRESHOLD` map (codified by v0.14.1 patch)
- `src/scripts/lib/stop-conditions.mts::applyWarnAlertSignals` — accept `{ autoMode, ignoredCategories }`; demote (push to `suggestions` not `reasons`) when conditions match; track demoted count for brief
- `src/scripts/lib/brief.mts` — add `warnAlertsDemoted: number` field
- Tests in `src/tests/pattern-alerts.test.mts` (likely exists) + `src/tests/stop-conditions.test.mts`

## Out of scope

- Changing cost-alert categories or their halt semantics (cost stays strict)
- Changing the 5-dim score schema or grade-trend computation
- Removing the today-shipped v0.14.1 0.7 floor — it's preserved via `loop.gradeTrendPerDimension: { observability: 0.7 }` in `.claude/loop.json`
- Cross-plugin crew brief-me rendering of the demoted-count field (upstream concern; loop only emits)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `pattern-alerts` reads `config.loop.gradeTrendThreshold` (default 0.8) and `config.loop.gradeTrendConsecutiveLimit` (default 3); falls back to current hard-coded defaults when absent OR when value fails validation (non-number / out-of-range)
- [ ] AC-3: `pattern-alerts` supports per-dimension overrides via `config.loop.gradeTrendPerDimension` record (e.g. `{ observability: 0.7 }`); invalid values silently fall back to the global threshold
- [ ] AC-4: `applyWarnAlertSignals` accepts `{ autoMode, ignoredCategories }`; when `autoMode===true` AND alert's category appears in `ignoredCategories` (default `['score-trend']`), the alert is pushed to `suggestions` array, NOT `reasons`, and DOES NOT contribute to `shouldStop`
- [ ] AC-5: Brief output adds `warnAlertsDemoted: number` field counting alerts demoted this turn (zero when nothing demoted)
- [ ] AC-6: `config.loop.warnAlertCategoriesIgnoredInAutoMode` (string array; default `['score-trend']`) controls which categories are demotable; safety-critical categories (e.g. `cost`) stay halt-blocking even in autoMode because they aren't listed
- [ ] AC-7: Today's hard-coded `PER_DIMENSION_THRESHOLD` map in `pattern-alerts.mts` (the v0.14.1 patch) is removed; the same effect is achieved by setting `loop.gradeTrendPerDimension: { observability: 0.7 }` in `.claude/loop.json` (operator-tunable)
- [ ] AC-8: Tests cover: threshold-from-config honored, per-dim override honored, autoMode demotion to suggestions + brief field counts, non-listed category still halts even in autoMode, missing config falls back to defaults, malformed config (non-number, out-of-range, non-array) falls back without crash

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-059 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — config resolution edge cases (missing/null/non-number/out-of-range/non-array), demotion semantics under autoMode, ignoredCategories filter logic, brief count accuracy
- Reviewer B: scope discipline — cost alerts NOT demoted (safety-critical stays strict), no change to 5-dim grade schema, no change to cost-regression or session-drift halt paths, v0.14.1 hard-coded threshold removed cleanly
