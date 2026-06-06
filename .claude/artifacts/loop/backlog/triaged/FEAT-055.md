---
id: FEAT-055
status: triaged
priority: P1
category: cost-governance
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.9
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.9
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
autonomous_safe: true
triage_notes: Cost blowout 1550 vs 81 median = P1 cost-governance miss; walker + cost-alert-loader exist as integration surface; concrete unit-test path
composite_score: 0.7975
---
# FEAT-055: Walker aggregate cost gate

Walker currently honors costStopThreshold per-session. Cross-session work (slice spanning 6 Claude sessions) blew past gate at ~$1,550 vs $81 median. Walker must load cost-advise with aggregate-all, compute rolling median over last N slices, halt iteration when current slice spend > 3x median.

AC-1: walker loads aggregate cost report at iteration start (not per-session).
AC-2: walker computes rolling median over last 5 cost reports.
AC-3: walker halts with cost_regression_stop badge when current spend > 3x median.
AC-4: badge surfaces in stop-check reasons + brief-me.
AC-5: unit tests cover median calculation, 3x threshold edge cases, missing-report fallback.