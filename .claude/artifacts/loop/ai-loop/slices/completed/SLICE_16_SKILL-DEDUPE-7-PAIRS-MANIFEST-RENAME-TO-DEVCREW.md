---
id: SLICE-16
title: Skill dedupe (7 pairs) + manifest rename to devcrew
status: completed
feature: FEAT-004
phase: null
priority: P2
target_release: null
requires_validation: false
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-16: Skill dedupe (7 pairs) + manifest rename to devcrew

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: skill dedupe + manifest.

- [x] AC-A: 79 skills (7 real folds verified genuine incl. Silent-failure hunt; using-crew deleted; count reconciled vs plan's ≈82 estimate — extra deletes per improve-cleanup verdicts); crew/skills dissolved; caps green.
- [x] AC-B: manifest name devcrew@1.0.0-rc.1, package.json synced, validate-manifests green.
- [x] AC-C: batch review 20260819T060914Z decision: approved.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-004 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
