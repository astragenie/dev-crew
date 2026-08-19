---
id: SLICE-14
title: Command map application + dispatch-token rewrite
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
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-14: Command map application + dispatch-token rewrite

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: command map + token sweep + 2 fix passes.

- [x] AC-A: 39 first-party + 1 vendored commands; 58-file disposition ledger reviewer-verified against plan §2; 3 collision merges carry both parents' behavior.
- [x] AC-B: product surface speaks devcrew: — 299-file sweep, 53 misses fixed, mangling bug killed, exclusion taxonomy reviewer-validated; 2 sweep defects (brief.md history prose, guard legacy allowlist) found by review and fixed, guard tests 15/15.
- [x] AC-C: gates green post-fix (review 20260819T050008Z decision: approved).

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
