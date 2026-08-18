---
id: SLICE-06
title: .ts->.mts rename sweep batch 2 + import-specifier fixes
status: completed
feature: FEAT-002
phase: null
priority: P1
target_release: null
requires_validation: false
risk: high
created: 2026-08-18
updated: 2026-08-18
effort_points: 2
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-18
---
# SLICE-06: .ts->.mts rename sweep batch 2 + import-specifier fixes

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-06 = crew/tests rename + specifier rewrite, suite-baseline restore.

- [x] AC-A: Zero .ts under crew/tests; 219 renames content-identical except specifiers. EVIDENCE: reviewer re-ran find (0), 8-file diff sample clean; renames snapshotted in b0e86c17.
- [x] AC-B: Specifier convention (.mjs) held; no live .ts imports remain. EVIDENCE: full-tree grep clean (3 hits predate slice, targets exist); mandatory per-batch self-greps + verify pass.
- [x] AC-C: Suite restored above baseline: 954 pass / 148 fail / 100 errors / 116 skip (target ≥846); zero test-attributable resolution errors; count delta 1079→1218 root-caused (404-collapsed files now execute — reviewer proved via blob replay). EVIDENCE: reviewer exact-match reproduction; 100 errors = 100% bun#5090 class (SLICE-07 scope).
- [x] AC-D: tsc --noEmit clean at crew/ (0 lines, exit 0). EVIDENCE: verify + reviewer.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-002 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
