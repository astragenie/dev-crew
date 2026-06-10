---
id: FEAT-172
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
github_issue: 89
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/89"
pm_customer_impact: 0.6
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.75
pm_technical_risk: 0.5
pm_dependency_depth: 0.15
composite_score: 0.6175
autonomous_safe: false
triage_notes: "via=pm | Observability leverage but vague AC (report shape/metrics) + blocked on FEAT-165. spec-writer for dashboard schema, re-triage after FEAT-165."
---
# FEAT-172: Usage dashboard artifact - render cost/agent/skill analytics report from auto-dispatch.jsonl and grades

Competitor gap (Maestro v0.15.3). Maestro ships a 4-tab usage dashboard: per-agent cost and query stats, activity heatmaps, Auto Run metrics, CSV export. Loop only has raw auto-dispatch.jsonl plus grade files, post-hoc, never rendered. Proposal: a loop CLI subcommand that aggregates auto-dispatch.jsonl + grade frontmatter + dispatch telemetry into a static HTML/Markdown dashboard artifact (per-agent, per-skill, per-slice cost; grade trends; iteration cost trajectory). Extends FEAT-165 (per-skill cost attribution) with a presentation layer. Reinforces observability grade (0.66 weakest signal). Scoring: impact 3 / effort 2 / fit 3 (composite 7).