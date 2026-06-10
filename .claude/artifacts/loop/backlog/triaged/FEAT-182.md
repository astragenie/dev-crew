---
id: FEAT-182
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
autonomous_safe: false
pm_customer_impact: 0.5
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.3
composite_score: 0.54
triage_notes: "Backlog audit needs AC parser + codebase scanner + PM-in-the-loop verification before any state change; false-positive risk, parser brittleness. Recommend spec-writer + architect review before slicing -> not autonomous."
---
# FEAT-182: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence

Adopt ao beads audit (C:/work/mega/agentops cli beads audit): scan triaged/pending FEATs and cross-check acceptance hints against the current codebase + done/ siblings; flag (not auto-close) FEATs whose ACs appear already satisfied, each with file:line evidence. Keeps long-lived queues honest — stale FEATs survive triage because nobody re-derives them against shipped code.

## Acceptance hints
- `loop backlog audit --repo <p>` returns JSON: [{id, verdict: likely_satisfied|partially|open, evidence: [...]}].
- Dispatchable variant: PM/researcher agent per flagged FEAT confirms before any state change; auto-move to done/ only with --apply and per-FEAT evidence note (wont_fix/satisfied reason in frontmatter).
- Integrates with snapshot-memory (audit summary line) and pattern alerts (audit overdue when last run > 30d).