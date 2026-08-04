---
id: SLICE-198
title: Cross-plugin docs + upstream-request amendment
status: pending
feature: FEAT-230
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 1
estimated_tokens: 60000
github_issue: 615
github_url: "https://github.com/astragenie/runner-plugin/issues/615"
---
# SLICE-198: Cross-plugin docs + upstream-request amendment

Implements FEAT-230. See [feature file](../../../backlog/in-progress/FEAT-230.md) for product context.

## Objective

Architect design artifact:

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-230 and shared across 5 sibling slices — scope per-slice before close

- [ ] AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the
- [ ] AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the
- [ ] AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills,
- [ ] AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the
- [ ] AC-5: A validation gate (CI + resolve-time) fails when a resolved/declared skill
- [ ] AC-6: Resolution is deterministic + explainable — a `--explain` (or log) shows
- [ ] AC-7: A DEC-* records the decommission-preset-skills decision + the live-catalog
- [ ] AC-8: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-230 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
