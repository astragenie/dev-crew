---
id: SLICE-20
title: Validator dedupe + dead-path purge (ai-loop/backlog/pending-dispatch)
status: completed
feature: FEAT-005
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-20: Validator dedupe + dead-path purge (ai-loop/backlog/pending-dispatch)

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: validator dedupe + dead-path purge.

- [x] AC-A: Dead paths gone (docs/ai-loop 9, docs/backlog 10, pending-dispatch 11) with 4 dangling-ref fixes; remaining refs all documented-legacy class. EVIDENCE: workflow verify PASS + batch review approved_with_notes.
- [x] AC-B: Validator dedupe done (crew agent-refs/org-refs deleted, root versions scope-widened + verified); 16/16 root validators green (learnings-schema fix -> SLICE-24). EVIDENCE: review 20260819T080553Z.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-005 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
