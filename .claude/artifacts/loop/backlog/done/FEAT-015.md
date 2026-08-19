---
id: FEAT-015
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-33]
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.65
pm_technical_risk: 0.35
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Directly-evidenced quality-gate hardening work with a known, uniform schema to backfill against and a low-risk mechanical fix; P2/autonomous-safe."
tags: ["stack:markdown", "area:content-quality", "concern:ci-gate-hardening"]
needs_contract: false
needs_ux: false
started_at: 2026-08-19
slices_complete: [SLICE-33]
completed_at: 2026-08-19
---
## Description

Agent/skill content backfill: crew's validate-agents.mts and validate-skills.mts run ADVISORY in CI because P3's surface merge exposed pre-existing content debt (missing prompt_id/version frontmatter, missing Report contract sections, dangling evals-spec pointers, skills dir-name vs devcrew:-prefixed frontmatter-name mismatch). Backfill the content across the merged agents/ and skills/ trees, then flip both validators to blocking.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given an agent or skill file missing prompt_id and/or version frontmatter, When the backfill runs, Then both fields are populated per the schema validate-agents.mts/validate-skills.mts already check for in advisory mode.
- AC-2: Given an agent file missing a Report contract section, When the backfill runs, Then a Report contract section is added following the same shape used by existing compliant agents in the tree.
- AC-3: Given a skill whose directory name does not match its devcrew:-prefixed frontmatter name, When the backfill runs, Then the mismatch is resolved (directory renamed or frontmatter corrected) and validate-skills.mts's name-mismatch check passes for that skill.
- AC-4: Given both validate-agents.mts and validate-skills.mts currently run advisory in CI, When the backfill is verified complete (0 findings in advisory mode across a clean run), Then both validators are flipped to blocking and CI fails on any future regression.
