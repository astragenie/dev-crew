---
id: SLICE-52
status: completed
feature: FEAT-055
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-52: Walker aggregate cost gate

Implements FEAT-055. See [feature file](../../../backlog/in-progress/FEAT-055.md) for product context.

## Objective

Walker currently honors costStopThreshold per-session. Cross-session work (slice spanning 6 Claude sessions) blew past gate at ~$1,550 vs $81 median. Walker must load cost-advise with aggregate-all, compute rolling median over last N slices, halt iteration when current slice spend > 3x median.

## In scope

- Aggregate-cost loader (reads cost-advise reports with aggregateAll semantics)
- Rolling-median computation over last 5 cost reports
- Walker integration: halt-by-cost-regression badge when current spend > 3× median
- Stop-check reasons surface the new badge
- brief-me Autonomous Loop section surfaces the new badge under Blocked/Missing
- Unit tests: median edge cases, threshold boundary, missing-report fallback

## Out of scope

- Modifying cost-advisor rules in upstream crew plugin
- Per-session costStopThreshold removal (kept as floor; new gate is additional)
- Compaction-stop primitive (separate FEAT)
- Session-pin walker (FEAT-056, separate)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint is clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: Walker loads aggregate cost report at iteration start (not per-session) via new `loadAggregateCostReport` helper in `src/scripts/lib/cost-alert-loader.mts`
- [ ] AC-3: Walker computes rolling median over last 5 cost reports (configurable via `.claude/loop.json::loop.costRegressionWindow`, default 5)
- [ ] AC-4: Walker halts with `cost_regression_stop` badge when current slice spend > 3× rolling median (threshold via `loop.costRegressionMultiplier`, default 3.0)
- [ ] AC-5: Stop-check (`node scripts/loop.mjs stop-check`) surfaces `cost_regression_stop` in `reasons` array with median + current values
- [ ] AC-6: brief-me Autonomous Loop section renders the halt under `Blocked / Missing` when triggered
- [ ] AC-7: Unit tests cover: median over 5 reports, median over < 5 reports (fallback to all available), 3× threshold edge cases (exactly 3×, just over, just under), missing aggregate report (fail-open, do not halt), single-report fallback

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-055 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — median math correctness, threshold boundary handling, fail-open on missing report, integration with existing `cost-alert-loader.mts`
- Reviewer B: scope discipline — no upstream crew changes, no regression in existing per-session costStopThreshold path, no leakage into FEAT-056 (session-pin) territory
