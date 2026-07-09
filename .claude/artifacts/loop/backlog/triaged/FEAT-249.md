---
id: FEAT-249
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.5
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Small, low-risk, well-understood DEC-writing task (technical_risk band 0.0-0.2: known repo pattern, 1-2 files, trivially reverted); moderate strategic value as a gate for Phase 3's reuse decision but no direct customer evidence -> P2. No cost analog."
tags: [workflow, docs]
needs_contract: false
needs_ux: false
---
## Description

Tracker-provider program Phase 0 — hygiene: reconcile FEAT-102 (marked done with unsatisfied AC: Linear webhook receiver never built, LinearProvider still stub, no round-trip) by superseding it with this program's Linear work; record a DEC. Decide fate of scripts/linear-sync/ prototype (mention-parser + webhook router, unit-tested, wired to nothing): fold mention-parser/linear-types into the LinearProvider FEAT or delete — architect decides, record DEC. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5, review-approved: .claude/artifacts/crew/reviews/2026-07-09-tracker-provider-plan-review.md).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.