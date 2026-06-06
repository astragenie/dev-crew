---
id: FEAT-057
status: in-progress
priority: P2
category: cost-governance
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: [SLICE-54]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
autonomous_safe: true
triage_notes: 30 redundant Reads = concrete cost waste; existing hook -> deny verdict + config threshold; low blast radius
composite_score: 0.695
started_at: 2026-06-06
---
# FEAT-057: Promote check-redundant-read hook to block

check-redundant-read hook currently logs only (hookHealth green = 0 errors, but does not gate). Cost-advisor saw 30 redundant Read calls in one slice. Hook should DENY at N redundant reads of same absolute path within session.

AC-1: hook tracks file-path -> read-count in session-scoped state.
AC-2: at >=5 redundant reads of same path (no intervening Edit/Write), hook returns deny verdict.
AC-3: deny message surfaces redundant-read count + suggestion to trust prior result.
AC-4: hook bypassed if prior Edit/Write touched the path.
AC-5: hook config exposes threshold via .claude/loop.json::hooks.redundantReadCap (default 5).
AC-6: tests cover under-threshold pass, over-threshold deny, post-edit reset.