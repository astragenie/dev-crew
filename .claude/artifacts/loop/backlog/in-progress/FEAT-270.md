---
id: FEAT-270
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-166]
derived_from: null
tags: [be, docs]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.55
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-02
autonomous_safe: true
triage_notes: "P1: quantified, user-approved cost win (up to ~3-6x per-slice cost delta in the cited A/B) with trivial effort and risk (one frontmatter field, existing precedent in pm.md) -- strong quick-win candidate."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Pin document-writer frontmatter to model: sonnet + README doc"
    points: 1
    estimated_tokens: 60000
started_at: 2026-08-02
github_issue: 563
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/563"
---
## Description

Pin runner:document-writer dispatches to Sonnet tier (user-approved 2026-08-02). Fleet audit: Opus is 87-100% of USD in 11/15 repos; natural A/B shows astramem-local/astramemory-local at 0% Opus run $11/slice vs $35-69 on Opus repos at the SAME ~350k tok/msg context. Scope: add model pinning for the document-writer role in dispatch templates (agents/document-writer.md frontmatter model field and/or preset roles.documentWriter.model in .claude/loop.json schema, read at dispatch time). Keep builder/reviewer tiers unchanged in this FEAT — broader tier moves need an eval gate first (adversarial review condition). Document the config knob in README.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given agents/document-writer.md's frontmatter, When this FEAT lands, Then it includes a model: sonnet field mirroring the existing model: opus pattern already used in agents/pm.md.
- AC-2: Given a document-writer dispatch after the change, When the agent runs, Then it executes on the Sonnet tier (verified via a sampled cost report's Model Mix section showing a non-Opus model for that dispatch).
- AC-3: Given the builder/reviewer role agents, When this FEAT lands, Then their frontmatter model: fields (or absence thereof) are left unchanged -- no broader tier move.
- AC-4: Given the new config knob, When README.md is updated, Then it documents the document-writer model pin and how to override it, matching the FEAT's 'Document the config knob in README' requirement.

## Proposed slices (PM decomposition)

- SLICE-1: Pin document-writer frontmatter to model: sonnet + README doc (1 pts)
