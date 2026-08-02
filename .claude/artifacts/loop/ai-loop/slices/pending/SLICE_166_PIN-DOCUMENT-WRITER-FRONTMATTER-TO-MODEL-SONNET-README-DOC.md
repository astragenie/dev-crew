---
id: SLICE-166
title: "Pin document-writer frontmatter to model: sonnet + README doc"
status: pending
feature: FEAT-270
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-02
updated: 2026-08-02
effort_points: 1
estimated_tokens: 60000
github_issue: 564
github_url: "https://github.com/astragenie/runner-plugin/issues/564"
---
# SLICE-166: Pin document-writer frontmatter to model: sonnet + README doc

Implements FEAT-270. See [feature file](../../../backlog/in-progress/FEAT-270.md) for product context.

## Objective

Pin runner:document-writer dispatches to Sonnet tier (user-approved 2026-08-02). Fleet audit: Opus is 87-100% of USD in 11/15 repos; natural A/B shows astramem-local/astramemory-local at 0% Opus run $11/slice vs $35-69 on Opus repos at the SAME ~350k tok/msg context. Scope: add model pinning for the document-writer role in dispatch templates (agents/document-writer.md frontmatter model field and/or preset roles.documentWriter.model in .claude/loop.json schema, read at dispatch time). Keep builder/reviewer tiers unchanged in this FEAT — broader tier moves need an eval gate first (adversarial review condition). Document the config knob in README.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given agents/document-writer.md's frontmatter, When this FEAT lands, Then it includes a model: sonnet field mirroring the existing model: opus pattern already used in agents/pm.md.
- [ ] AC-2: Given a document-writer dispatch after the change, When the agent runs, Then it executes on the Sonnet tier (verified via a sampled cost report's Model Mix section showing a non-Opus model for that dispatch).
- [ ] AC-3: Given the builder/reviewer role agents, When this FEAT lands, Then their frontmatter model: fields (or absence thereof) are left unchanged -- no broader tier move.
- [ ] AC-4: Given the new config knob, When README.md is updated, Then it documents the document-writer model pin and how to override it, matching the FEAT's 'Document the config knob in README' requirement.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-270 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
