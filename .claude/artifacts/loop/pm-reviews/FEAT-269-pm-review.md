---
id: PM-REVIEW-FEAT-269
feature: FEAT-269
reviewed_at: 2026-08-02
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.25
pm_technical_risk: 0.1
pm_dependency_depth: 0.1
composite_priority: P3
autonomous_safe: true
---
# PM Review — FEAT-269

## Demand Assessment

- **Evidence:** 2026-08-02 fleet audit cites concrete unmarked-aggregate contamination counts (runner 142/313, dev-team 81/218, authentic 64/67) and a specific $32,101 fleet aggregate mistaken for a single dev-team slice report.

## Scope Challenge

- **Scope notes:** IMPORTANT SCOPE-CHALLENGE FINDING (Framework 2, Overlap check): the core ask is already shipped in THIS repo. src/scripts/lib/memory-snapshot.mts:132 (resolveCostReportUsd) already excludes fm.aggregate_all === true || fm.aggregate_all === "true" from the cost trajectory -- landed in commit f60fe60d2 on 2026-07-18 (git blame confirms). A mixed-corpus regression test already exists and passes: src/tests/memory-snapshot-telemetry.test.mts:116, literally titled 'cost trajectory excludes aggregate_all rollup reports and survives wide-window outliers via median', which writes a synthetic aggregate_all report alongside normal ones and asserts it's excluded (lines 116-134). This satisfies the FEAT's own 'add a test with a mixed corpus' ask verbatim. The ONLY gap I could not find already implemented: the snapshot does not currently report the aggregate count separately (no such output line exists in memory-snapshot.mts's renderLoopTelemetry section) -- that is the sole remaining deliverable. Recommend re-scoping the FEAT body/title before slicing to reflect this much narrower remaining surface; other fleet repos (dev-team, authentic) may still lack this filter in their OWN loader, but that is out of this repo's scope to fix. No weak grade dimension this cycle.

## Scores

- customer_impact: 0.25
- effort_estimate: 0.15
- strategic_alignment: 0.25
- technical_risk: 0.10
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P3
autonomous_safe: true
reasoning: P3: mostly already implemented (filter + mixed-corpus test both landed 2026-07-18) -- only the 'report aggregate count separately' line remains, a trivial single-file addition; technical_risk at 0.1 (known pattern, 1 file, trivially reverted).

## Risks

- Low risk of wasted effort if the builder isn't told about the existing filter/test and re-derives it from scratch instead of just adding the one missing 'aggregate count' line -- flagging explicitly so the dispatch prompt points at memory-snapshot.mts:113-149 and the existing test as the starting point.
- The still-unexplained mean/median skew in the CURRENT committed loop-snapshot.md ($31.986 median vs $936.110 mean) despite the aggregate_all filter being live since 2026-07-18 suggests either an un-tagged aggregate-shaped report still counted as normal, or the skew is genuinely just wide-window variance the median already handles correctly by design -- worth a one-line sanity check before assuming this FEAT's job is 100% done.
