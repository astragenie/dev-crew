---
id: FEAT-043
status: done
priority: P1
category: bugfix
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: [SLICE-45]
derived_from: null
autonomous_safe: true
composite_score: 0.8395
pm_customer_impact: 0.82
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.85
pm_technical_risk: 0.1
pm_dependency_depth: 0.05
triage_notes: P1 bugfix — entire PM triage loop silently broken; composite_score=0 ranking defect proven; pm-write subcommand missing; effort low (computeCompositePriority already exists)
started_at: 2026-06-05
slices_complete: [SLICE-45]
completed_at: 2026-06-05
github_issue: 94
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/94"
---
# FEAT-043: Implement backlog pm-write CLI subcommand for PM score write-back

PM triage flow is broken: /loop:pm-triage skill calls 'node scripts/loop.mjs backlog pm-write --id FEAT-NNN --scores ...' but that subcommand does not exist in loop.mts. PM agent scores (customer_impact, effort_estimate, strategic_alignment, technical_risk, dependency_depth) are computed but never persisted to FEAT frontmatter. composite_score stays 0 for all new FEATs so auto-walker sorts them last. Acceptance criteria: AC-1: backlog pm-write subcommand accepted by loop.mts CLI. AC-2: parses --scores JSON and writes pm_customer_impact, pm_effort_estimate, pm_strategic_alignment, pm_technical_risk, pm_dependency_depth to FEAT frontmatter. AC-3: computes and writes composite_score (0.0-1.0) from dimensions using computeCompositePriority. AC-4: --priority and --autonomous-safe flags accepted and written. AC-5: running pm-write on a triaged FEAT does not change its status or move the file.