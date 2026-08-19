---
id: SLICE-23
title: "Delete auto-dispatch, claims/approvals, preset-retrofit"
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
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-23: Delete auto-dispatch, claims/approvals, preset-retrofit

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: 1 of 3 targets executed; 2 kept on call-site evidence (lead-ratified).

- [x] AC-A: approvals.mts (297 LOC) + CLI verbs + brief/wakeup rendering + installer seeds + doc refs deleted cleanly; escalation guidance redirected to help_request badges; phantom-ref allowlist updated. EVIDENCE: handoff 20260819T081518Z; reviewer re-verification (upgrade note); crew 1701/0.
- [x] AC-B (revised): claims.mts KEPT (load-bearing for kept /devcrew:quickwin disjointness checks — plan §5 revision recorded); auto-dispatch.mts KEPT (7+ live call sites + 2 analytics readers; improvement-review claim was a naming collision with wave telemetry); preset-retrofit KEPT until migrate-adopter ships (P5 sequencing). Each with grep/call-site evidence in the handoff.

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
