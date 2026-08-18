---
id: SLICE-05
title: .ts->.mts rename sweep batch 1 (dev-team src)
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
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-18
---
# SLICE-05: .ts->.mts rename sweep batch 1 (dev-team src)

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-05 = production-tree rename only (crew/ non-test).
> Test-tree specifiers = SLICE-06 (suite intentionally below baseline until then).

- [x] AC-A: Zero non-test non-.d.ts .ts files under crew/. EVIDENCE: find sweep empty (workflow verify + reviewer re-run); 225 files git-detected as renames.
- [x] AC-B: Specifier rewrite correct per .mjs convention. EVIDENCE: reviewer sampled 12 files; found+fixed 5 .mts-suffix misses in 3 files; repeat full-tree grep zero outside comments; bun -e resolution proofs pass.
- [x] AC-C: fs-utils basename collision resolved. EVIDENCE: readFileIfExists ported to fs-utils.mts (semantics-identical), .mjs twin deleted, TS2305 gone, 4 exports resolve at runtime.
- [x] AC-D: Reference sites updated, runtime alive. EVIDENCE: package.json/hooks.json/tsconfig/CI yml paths verified on disk; bun scripts/validate-manifests.mts runs clean.

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
