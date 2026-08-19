---
id: SLICE-22
title: GEPA delete per approved table + archive trials imported-from-stamped
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
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 140000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-22: GEPA delete per approved table + archive trials imported-from-stamped

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: GEPA deletion executed.

- [x] AC-A: 21 files (4,923 LOC) + 32 test files deleted per table; 6 KEEP intact; kept commands verified live (gepa-history exits 0). EVIDENCE: handoff 20260819T073424Z + batch review approved_with_notes.
- [x] AC-B: Companion edits complete incl. one caution the table missed (subagent-return tests) + guarded-fire relocated (load-bearing non-gepa, byte-identical, reviewer-verified); crew.mts dead dispatch entries pruned; gepa.config.json shrunk to 2 live fields. Suites green (crew 1701/0 post-batch, root 3316/2 known).

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
