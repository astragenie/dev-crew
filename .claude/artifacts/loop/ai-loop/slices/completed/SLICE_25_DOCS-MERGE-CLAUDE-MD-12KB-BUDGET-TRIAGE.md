---
id: SLICE-25
title: Docs merge + CLAUDE.md <=12KB budget triage
status: completed
feature: FEAT-005
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 1
proposed_slice_id_suffix: -SLICE-5
estimated_tokens: 60000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-25: Docs merge + CLAUDE.md <=12KB budget triage

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: shipping docs.

- [x] AC-A: CLAUDE.md authored fresh at 12,282/12,288 bytes: 41-gate list verbatim (parse-verified), clause ids preserved, marker blocks byte-identical, all devcrew: tokens resolve. Review blocker (stale 19-gate list) fixed + re-verified. EVIDENCE: review 20260819T090000Z approved.
- [x] AC-B: AGENTS.md + README (metrics band 41) + docs map honest about current layout (crew/ rump documented; crew/docs merge deferred with reason).

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
