---
id: SLICE-33
title: Implement FEAT-015
status: pending
feature: FEAT-015
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:markdown"]
---
# SLICE-33: Implement FEAT-015

Implements FEAT-015. See [feature file](../../../backlog/in-progress/FEAT-015.md) for product context.

## Objective

Agent/skill content backfill: crew's validate-agents.mts and validate-skills.mts run ADVISORY in CI because P3's surface merge exposed pre-existing content debt (missing prompt_id/version frontmatter, missing Report contract sections, dangling evals-spec pointers, skills dir-name vs devcrew:-prefixed frontmatter-name mismatch). Backfill the content across the merged agents/ and skills/ trees, then flip both validators to blocking.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given an agent or skill file missing prompt_id and/or version frontmatter, When the backfill runs, Then both fields are populated per the schema validate-agents.mts/validate-skills.mts already check for in advisory mode.
- [x] AC-2: Given an agent file missing a Report contract section, When the backfill runs, Then a Report contract section is added following the same shape used by existing compliant agents in the tree.
- [x] AC-3: Given a skill whose directory name does not match its devcrew:-prefixed frontmatter name, When the backfill runs, Then the mismatch is resolved (directory renamed or frontmatter corrected) and validate-skills.mts's name-mismatch check passes for that skill.
- [x] AC-4: Given both validate-agents.mts and validate-skills.mts currently run advisory in CI, When the backfill is verified complete (0 findings in advisory mode across a clean run), Then both validators are flipped to blocking and CI fails on any future regression.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-015 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
