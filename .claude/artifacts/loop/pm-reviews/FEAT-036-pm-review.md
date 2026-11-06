---
id: PM-REVIEW-FEAT-036
feature: FEAT-036
reviewed_at: 2026-11-06
pm_customer_impact: 0.3
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.4
pm_technical_risk: 0.15
pm_dependency_depth: 0
composite_priority: P3
autonomous_safe: true
---
# PM Review — FEAT-036

## Demand Assessment

- **Evidence:** Partly satisfied already. The reported data-loss bug IS fixed on this branch: src/scripts/lib/slice-linker/crew-bridge.mts:305 now gates the cursor write as `if (sliceId && !report?.error && report?.preserveCursor !== true)`, and the refusal shape is no longer duck-typed -- crew/scripts/lib/cost-hygiene/cost-report-guard.mts exports `CostReportGuardResult = { refused: true; reason: CostReportGuardReason; preserveCursor: boolean }` with the decision table `PRESERVE_CURSOR_BY_REASON = { sessions_scanned_zero: false, window_too_wide: true, "duplicate run_id": false }` and `shouldPreserveCursorForReason(reason) => PRESERVE_CURSOR_BY_REASON[reason] ?? true`. cost-slice-handler.mts:238 and emit-cost-report.mts:187 both propagate `preserveCursor`. src/tests/cost-scan-cursor-honesty-guard.test.mts pins the window_too_wide hold and the success-advance (3 tests). Residual demand is narrow and real: `shouldPreserveCursorForReason` has ZERO test references repo-wide (only a prose mention at src/tests/cost-scan-cursor-honesty-guard.test.mts:71), and grep for `window_too_wide`, `allow-wide-window`, `preserveCursor` and `cost-scan cursor` in docs/memory.md returns zero hits, so the FEAT's operator-recovery bullet is wholly unshipped.

## Scope Challenge

- **Scope notes:** Re-scoped from 'real bug' to 'regression + docs hardening' after verifying live code. Of FEAT-036's four deliverable bullets, two are DONE (reason-gated cursor hold in crew-bridge.mts; discriminated refusal shape resolved in cost-report-guard.mts next to the reasons), one is PARTIAL (tests exist for the window_too_wide hold and for success-advance, but not for the sessions_scanned_zero / duplicate run_id advance at the bridge level, not for the unknown-reason default, and not for the --allow-wide-window no-gap re-run), and one is NOT STARTED (operator-recovery documentation in docs/memory.md). Smallest deliverable that carries the value: the unknown-reason default test (AC-1) plus the docs/memory.md recovery section (AC-6) -- those are the two things nothing on disk protects today. If halved, keep AC-1 and AC-6 and drop the advance-side cases, which FEAT-268's cost-scan-window-regression.test.mts already covers at the window-resolver level. No overlap with an open FEAT: FEAT-025 is in done/ and settled the three refusal conditions, which this FEAT must not touch. Grade weak dimensions (Framework 4, last-5 averages from .claude/artifacts/loop/loop-snapshot.md): NONE below 0.80 -- the lowest is security at 0.862, then observability at 0.894 -- so no weak-dimension AC is owed. Effort calibration (Framework 5): no cost analog for a test-plus-docs slice of this size in .claude/artifacts/crew/cost/; the available aggregates (SLICE-46 $26.39, SLICE-52 $30.77) are full multi-file build slices and over-predict this materially, so effort is scored from the dimension table at 0.15 (2 points, below the decomposition gate).

## Scores

- customer_impact: 0.30
- effort_estimate: 0.15
- strategic_alignment: 0.40
- technical_risk: 0.15
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P3
autonomous_safe: true
reasoning: P3, technical_risk band 0.0-0.2 (known repo pattern, test-plus-docs only, trivially reverted by git revert): the reported data-loss bug is already fixed on this branch by SLICE-50 -- crew-bridge.mts:305 gates on `preserveCursor` and cost-report-guard.mts defaults unknown reasons to preserve -- so customer_impact drops to 0.3, but the FEAT is not redundant: the fail-safe default has no test and docs/memory.md has no operator-recovery path for a held cursor, so it is retained as narrow regression-plus-docs hardening rather than declined.

## Risks

- Vacuous-green risk, and the most likely cause of a failed review two weeks out: a test that stubs costSliceHandler via mock.module and asserts the default-preserve path will pass vacuously if it asserts the stub's own hardcoded `preserveCursor` rather than calling the real `shouldPreserveCursorForReason` export. The AC must route through the real guard function. This is exactly the failure class SLICE-24's grade lesson names: 'A validator scanning an empty dir passes vacuously -- the worst kind of green.'
- Rollback: test-file plus docs/memory.md only. `git revert` is sufficient -- no migration, no state cleanup, no cross-plugin coordination.
- Coverage gap this FEAT must close: nothing today references `shouldPreserveCursorForReason`, so the fail-safe `?? true` default in crew/scripts/lib/cost-hygiene/cost-report-guard.mts could be flipped to `?? false` and every suite in both test trees would stay green. A future refusal reason would then silently discard a real window -- reintroducing the original bug through the door the fix left open.
- mock.module fragility: src/tests/cost-scan-cursor-honesty-guard.test.mts documents empirically that registering mock.module a second time for the same path loses the first registration, so new reason cases must extend the existing mutable `handlerMode` switch rather than adding a second mock. A builder who adds a parallel registration will get confusing, order-dependent failures.
- Cross-tree edit: the guard lives under crew/ (the vendored rump) while the test lives under src/tests/. Per CLAUDE.md the rump is an internal library during the merge window; a reason-metadata-only edit there is in scope, but widening into the rump's own test tree is not.
