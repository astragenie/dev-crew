---
id: FEAT-173
status: in-progress
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-10
updated: 2026-06-13
depends_on: []
slices: [SLICE-127]
derived_from: null
github_issue: 90
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/90"
pm_customer_impact: 0.5
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.6
pm_technical_risk: 0.55
pm_dependency_depth: 0.2
composite_score: 0.56
autonomous_safe: false
triage_notes: "via=pm | Moderate impact, vague AC (no title/body inference rules, no error cases), crew:parallel impact needs architect review. P3 pending AC."
started_at: 2026-06-13
---
# FEAT-173: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main

Competitor gap (Maestro v0.15.3). Maestro offers one-click PR creation from any worktree with title/description inferred from commits, plus auto-PR-on-completion for unattended runs. Loop's dispatch finalize merges DONE children directly to main with no PR option. Proposal: add a --pr mode to dispatch finalize (and crew:parallel flow) that pushes each child branch and runs gh pr create with commit-derived title/body instead of merging. Complements FEAT-110 (Agent Merge post-PR repair loop) - this is the PR-creation half. Scoring: impact 2 / effort 1 / fit 3 (composite 7).