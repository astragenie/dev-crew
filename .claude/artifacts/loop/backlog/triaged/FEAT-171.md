---
id: FEAT-171
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
github_issue: 88
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/88"
pm_customer_impact: 0.65
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.75
pm_technical_risk: 0.45
pm_dependency_depth: 0
composite_score: 0.6875
autonomous_safe: false
triage_notes: "via=pm | Strong observability fit, low effort, but NO concrete AC (3 modes listed, no schema/tests). autonomous_safe=false until loop:spec-writer formalizes Given-When-Then + config schema."
---
# FEAT-171: Loop event notifications - OS notification / webhook / custom command on slice complete, halt-badge, cost alert

Competitor gap (Maestro, RunMaestro/Maestro v0.15.3, local clone C:\work\mega\Maestro). Maestro ships OS notifications, text-to-speech announcements, and arbitrary custom-command execution when an agent completes a task. Loop has zero ambient awareness: no alert on slice complete, halt-badge emission, or cost alert - the user must watch the terminal. Proposal: hook-driven notification surface on loop lifecycle events (slice start/complete, halt-badge, cost-advisor high severity), configurable in .claude/loop.json (osNotification | webhook | customCommand). Reinforces weakest grade signal (observability 0.66). Scoring: impact 3 / effort 1 / fit 3 (composite 8).