---
id: PM-REVIEW-FEAT-273
feature: FEAT-273
reviewed_at: 2026-08-02
pm_customer_impact: 0.45
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.45
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-273

## Demand Assessment

- **Evidence:** FEAT body: all 11 clean cost reports for the 'citylive' repo show usd $0.00, cache_hit 0%, no Model Mix section -- total telemetry blindness for that one consumer repo, hypothesized as a source_project path/project-key mismatch.

## Scope Challenge

- **Scope notes:** Confirmed source_project is read (not written) inside this repo -- src/scripts/lib/slice-linker/cost-report-dedup.mts:49 reads fm.source_project for dedup fingerprinting, but the field's VALUE is produced by the external crew cost-slice scan (same command invoked from crew-bridge.mts:235 with no path override), so root cause is very likely crew-side, same shape as FEAT-268/233's cross-plugin uncertainty. The FEAT is explicitly and correctly scoped as investigation-first (researcher, read-only) before any fix -- this bounds risk of a premature/wrong fix. No weak grade dimension this cycle. No cost analog (the whole point is citylive's reports show $0 -- there's no comparable priced analog to calibrate against).

## Scores

- customer_impact: 0.45
- effort_estimate: 0.50
- strategic_alignment: 0.45
- technical_risk: 0.65
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2: real but narrow-impact (one consumer repo demonstrated, not proven fleet-wide beyond citylive), correctly bounded as read-only-investigation-first which caps downside risk; technical_risk at 0.6-0.8 given the likely cross-plugin fix location and unconfirmed root cause (an actual spike, not routine work).

## Risks

- Pre-mortem 1: most likely failure is a 'minimal fix' that patches citylive's specific path-mismatch shape without generalizing, so the NEXT consumer repo with a different non-standard path convention still gets $0.00 reports.
- Pre-mortem 2: rollback is a clean revert if the fix stays loop-side (path-matching/normalization logic); if the real root cause is crew's cost-slice scan itself, rollback requires the same cross-plugin coordination as FEAT-268.
- Pre-mortem 3 (coverage gap): no existing fixture exercises a non-standard project-dir-to-repo mapping -- the FEAT's own acceptance criterion (a citylive-shaped fixture produces a non-zero report) is exactly the fix for this gap.
