---
id: PM-REVIEW-FEAT-280
feature: FEAT-280
reviewed_at: 2026-08-04
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.4
pm_technical_risk: 0.1
pm_dependency_depth: 0.2
composite_priority: P3
autonomous_safe: true
---
# PM Review — FEAT-280

## Demand Assessment

- **Evidence:** Confirmed proposed-slices.mts:200-226 (resolveTouchesFiles): the bad-path check (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.includes('..')) does not match a UNC path like \\server\share\file.mts, which passes through as valid despite the function's own comment claiming it fails fast. feature-lifecycle.mts:59-71 (normalizeFeatureTouchesFiles) confirmed to do no path-safety check at all. Confirmed CI gate 11 (validate-slice-touches-files.mts:41-49, checkPath) already uses platform-aware isAbsolute() and catches UNC on win32, running against every materialized slice regardless of writer -- so nothing unsafe reaches the wave planner today. Grepped agents/ and commands/ for touches_files: confirms crew:architect-feature genuinely does not populate the field (hits only pm.md, start.md, wave.md).

## Scope Challenge

- **Scope notes:** Two independent halves: (1) mechanical regex-to-path.isAbsolute() swap in two known locations plus two new test cases; (2) a docs-only docs/upstream-requests/ entry against dev-team, achievable without crew's cooperation.

## Scores

- customer_impact: 0.25
- effort_estimate: 0.15
- strategic_alignment: 0.40
- technical_risk: 0.10
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P3
autonomous_safe: true
reasoning: P3: honestly scored as low-severity hygiene, per the FEAT's own framing -- confirmed via source read that CI gate 11 already uses platform-aware path.isAbsolute() and catches UNC on win32 regardless of which writer produced the slice, so nothing unsafe reaches the wave planner today. The defect is a doc-comment/coverage mismatch at the fast fail-fast layer, not a live hole. Effort and risk are both minimal -- a mechanical regex-to-path.isAbsolute() swap in two known locations plus two new test cases, matching a function CI already relies on. pm_dependency_depth stays low despite the second half naming an external plugin (crew:architect-feature) because that half is a docs-only upstream-request write, not a blocking code dependency -- this repo's own two ACs for that half (file the request; the request itself cites the conservative bar) are fully achievable without crew's cooperation.

## Risks

- none
