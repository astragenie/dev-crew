---
id: FEAT-056
status: triaged
priority: P2
category: cost-governance
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.3
autonomous_safe: true
triage_notes: Cross-session incident motivates session-pinning; partial value without FEAT-055; ACs contained to walker
composite_score: 0.61
---
# FEAT-056: Session-pin walker

Walker has no session affinity. Slice work spread across 6 Claude sessions fragments cache + hides cost in many-sources alerts. Walker should pin to the sessionId of the slice-start ceremony and refuse re-entry from a different session without --allow-cross-session.

AC-1: slice start writes sessionId to slice frontmatter (or workflow-state).
AC-2: walker reads sessionId on each iteration; mismatch -> halt with session_drift badge.
AC-3: --allow-cross-session flag overrides + logs to auto-dispatch.jsonl.
AC-4: brief-me surfaces session_drift badge under Blocked / Missing.
AC-5: tests cover same-session pass, different-session block, override-flag passthrough.