---
id: SLICE-36
title: Implement FEAT-016
status: completed
feature: FEAT-016
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:markdown"]
completed_at: 2026-08-19
---
# SLICE-36: Implement FEAT-016

Implements FEAT-016. See [feature file](../../../backlog/in-progress/FEAT-016.md) for product context.

## Objective

Command surface audit execution: merge the 7 near-duplicate command pairs and cut the 1 dead command identified in the P3 command audit (see docs/planning/unification-plan.md section 2 command map); each merged command keeps one canonical name + a hard-break stub note in CHANGELOG; validate-agent-refs stays green.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given the 7 near-duplicate command pairs identified in docs/planning/unification-plan.md section 2, When each pair is merged, Then exactly one canonical command name remains per pair and the non-canonical name is removed (not aliased).
- [ ] AC-2: Given a command removed as part of a merge or as the 1 identified dead command, When CHANGELOG.md is updated, Then it contains a hard-break stub note (no silent shim) naming the removed command and its canonical replacement where applicable.
- [ ] AC-3: Given the full set of merges and the one deletion, When `bun ./src/scripts/validate-agent-refs.mts` runs, Then it passes with zero phantom crew:/runner:/devcrew: dispatch tokens left referencing a removed command.
- [ ] AC-4: Given a command that had no near-duplicate and was not the dead command, When the merge work completes, Then it is left untouched -- no scope creep beyond the 7 pairs plus 1 deletion named in the audit.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-016 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
