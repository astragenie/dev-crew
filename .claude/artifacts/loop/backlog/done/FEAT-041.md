---
id: FEAT-041
status: done
priority: P1
category: bugfix
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
pm_customer_impact: 0.72
pm_effort_estimate: 0.9
pm_strategic_alignment: 0.82
pm_technical_risk: 0.12
pm_dependency_depth: 0.05
pm_strategic_fit: 0.82
pm_risk_level: 0.12
composite_score: 0.79
composite_priority: P1
triage_notes: "PM scored 2026-06-05: single-function bugfix in backlog-triage.mts; 5 ACs present (inline prefix — proves the bug); autonomous_safe=true (technical_risk 0.12, effort 0.90, dep_depth 0.05). Note: heuristic triage gave autonomous_safe=false because it missed inline AC prefix — exactly the bug this FEAT fixes."
completed_at: 2026-06-05
---
# FEAT-041: detectAcceptanceCriteria heuristic misses inline AC prefix

backlog-triage.mts detectAcceptanceCriteria only recognizes the heading '## Acceptance criteria' (case-insensitive). Bodies that use 'Acceptance criteria:' as an inline prefix (not a markdown heading) return count=0, causing autonomous_safe to be inferred as false even when ACs are present. Observed: FEAT-040 body used inline prefix and got autonomous_safe=false on first triage; required PM re-score to fix. Fix: extend the regex or detection logic to also match 'Acceptance criteria:' as a line-prefix pattern (not just ATX heading). Acceptance criteria: AC-1: inline 'Acceptance criteria:' prefix detected and counted same as heading. AC-2: existing heading-style detection unaffected. AC-3: count reflects actual AC lines under either pattern. AC-4: autonomous_safe inferred correctly for bodies using inline prefix. AC-5: tests updated/added to cover both patterns.