---
id: FEAT-255
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-250]
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.5
pm_technical_risk: 0.25
pm_dependency_depth: 0.3
pm_composite_priority: P3
pm_autonomous_safe: false
pm_reviewed: 2026-07-09
autonomous_safe: false
triage_notes: "Low-risk, low-effort program closeout (known CLI pattern + docs, technical_risk 0.25: known repo pattern, 1-2 modules, clean rollback); real but narrow demand evidence (one identified offending file); the in-repo portion is autonomous_safe but the cross-repo dev-team edit sits outside this FEAT's own CI/dispatch authority -- autonomousSafe false at the FEAT level pending a slice split that isolates the in-repo CLI+docs work from the cross-repo manual step, P3."
tags: [workflow, docs]
needs_contract: false
needs_ux: false
---
## Description

Tracker-provider program Phase 6 — prompt hygiene + docs + release. (1) New CLI subcommand: loop.mts backlog tag-merge --id FEAT-NNN --tags a,b — additive frontmatter tag merge routed through BacklogStore. (2) Cross-repo (manual verification step per review COND-E, NOT a CI AC of this repo): rewrite dev-team commands/architect-feature.md Step 0+3 (lines ~128-148, the only prompt-file offender across both repos — instructs agents to hand-glob and hand-write FEAT frontmatter tags) to call the new CLI, mirroring that file's own Step 4 pattern; verify which loop CLI the command resolves and wire accordingly. (3) Re-run the prompt scan (agents/*.md, commands/*.md, skills/**/SKILL.md in runner-plugin AND dev-team) -> zero remaining direct tracking-file write instructions; record result in Phase 6 validation artifact. (4) Docs: CLAUDE.md task-store section update, docs/halt-badges.md if new badges, CHANGELOG via runner:document-writer, regenerate loop-snapshot (snapshot-freshness CI gate). depends_on: FEAT-250. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.