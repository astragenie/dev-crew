---
id: FEAT-174
status: in-progress
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-10
updated: 2026-06-13
depends_on: []
slices: [SLICE-124]
derived_from: null
github_issue: 91
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/91"
pm_customer_impact: 0.55
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.7
pm_technical_risk: 0.65
pm_dependency_depth: 0.25
composite_score: 0.555
autonomous_safe: false
triage_notes: via=pm | Workaround not root fix (FEAT-176 is). High false-positive risk on pattern detector; implicit-only AC. May be obsoleted if upstream ships. P2 pending AC + FEAT-176 status.
started_at: 2026-06-13
---
# FEAT-174: Error-pattern registry with automatic recovery for specialist dispatch failures

Competitor gap (Maestro v0.15.3). Maestro maintains a per-agent error-pattern registry that detects known failure signatures in agent output and triggers automatic recovery plus user-friendly messages. Loop handles the recurring specialist-pause failure mode (builder/reviewer/validator pauses without writing artifact) only via a manual SOP doc (docs/sop/specialist-pause-handling.md). Proposal: codify the SOP into machine-checkable patterns (pause-without-artifact, empty artifact, truncated output, budget-exceeded mid-task) with a registry consulted at dispatch-result time; on match, apply the documented recovery action automatically and log to learnings.jsonl. Adjacent to FEAT-130 (stuck-detector) which covers runaway loops, not output-pattern recovery. Scoring: impact 2 / effort 2 / fit 3 (composite 6).