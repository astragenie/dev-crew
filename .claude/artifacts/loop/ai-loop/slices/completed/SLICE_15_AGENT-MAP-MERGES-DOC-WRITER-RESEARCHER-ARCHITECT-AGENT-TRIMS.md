---
id: SLICE-15
title: Agent map merges (doc-writer/researcher/architect) + agent trims
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
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-15: Agent map merges (doc-writer/researcher/architect) + agent trims

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: agent map application.

- [x] AC-A: 26 owned + 14 vendored; .gepa dirs relocated; crew/agents dissolved. EVIDENCE: workflow verify + batch review.
- [x] AC-B: 3 role merges are coherent two-parent merges (architect read-only mode, doc-writer slice-close CLI, researcher citation contract all survive — reviewer-read). 4 over-cap agents trimmed, content-length green (28 enforced ≤300).
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
