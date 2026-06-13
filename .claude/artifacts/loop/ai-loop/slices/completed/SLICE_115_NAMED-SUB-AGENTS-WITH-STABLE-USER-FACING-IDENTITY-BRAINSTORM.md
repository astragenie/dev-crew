---
id: SLICE-115
title: Named sub-agents with stable user-facing identity (brainstorm / plan / repair)
status: completed
feature: FEAT-112
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 245
github_url: "https://github.com/sergeymilashico/loop/issues/245"
completed_at: 2026-06-13
---
# SLICE-115: Named sub-agents with stable user-facing identity (brainstorm / plan / repair)

Implements FEAT-112. See [feature file](../../../backlog/in-progress/FEAT-112.md) for product context.

## Objective

Add a role glossary (one line per role) to the slice orchestration commands so users can discover what each named agent role does without reading CLAUDE.md.

## In scope

- Role glossary section added to `commands/orchestrate-slice.md` (or `commands/slice-start.md`)
- Per-phase role attribution line in the orchestration flow (e.g. "Builder: `crew:fullstack-dev` — implements AC")
- Content consistent with CLAUDE.md role descriptions

## Out of scope

- Code changes (docs-only)
- New agent/skill files

## Acceptance criteria

- [ ] AC-1: `bun ./src/scripts/validate-manifests.mts` passes
- [ ] AC-2: `bun ./src/scripts/validate-content-length.mts` passes (owned agents ≤ 300 lines, skills ≤ 200 lines)
- [ ] AC-3: At least one command file (commands/orchestrate-slice.md or commands/slice-start.md) contains a "Role glossary" or "Roles" section listing builder, reviewer, validator, deployer, researcher, pm, architect with one-line descriptions each
- [ ] AC-4: Content is consistent with the role descriptions in CLAUDE.md (no contradictions)

## Done When

- all acceptance criteria PASS with evidence
- feature FEAT-112 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- requires_validation: false (docs-only — no runnable behavior)

## Reviewer ladder

- Reviewer A: correctness + AC coverage (glossary present, all roles covered, no contradictions with CLAUDE.md)
- Reviewer B: content quality, consistency, line-cap compliance
