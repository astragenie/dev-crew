---
id: SLICE-18
title: models.yaml/model-router single-source design merge
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
proposed_slice_id_suffix: -SLICE-5
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-18: models.yaml/model-router single-source design merge

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close (honest re-scope, reviewer-validated): models.yaml already single-source
> for its real consumers; router/resolve-model merge deferred post-absorption (P4 FEAT).

- [x] AC-A: No silent divergence between the two model-config validators — hand-rolled check now byte-matches the Zod semver contract; 11-case parity test covers accept AND reject. EVIDENCE: lite review 20260819T-...-slice-18-lite.md, decision approved; crew suite 0 fail.
- [x] AC-B: Re-scope documented with evidence (validate-configs.mts:44 convention, TS 6/7 project split, hook import chain); router merge filed as post-absorption follow-up. EVIDENCE: handoff 20260819T062035Z + reviewer independent verification.

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
