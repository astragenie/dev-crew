---
id: SLICE-09
title: Single tsconfig/tsconfig.test + biome config merge
status: completed
feature: FEAT-002
phase: null
priority: P1
target_release: null
requires_validation: false
risk: high
created: 2026-08-18
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-6
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-09: Single tsconfig/tsconfig.test + biome config merge

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-09 = config unification for the two-tree window (pre-P3).

- [x] AC-A: Biome runs from repo root with zero config errors (crew/biome.json root:false, divergent rules deliberate until P3). EVIDENCE: reviewer re-ran; 88/70/253 pre-existing findings recorded, no nested-root error.
- [x] AC-B: TS types coherent: crew types ["node","bun"] on real devDep (was fragile transitive bun-types), 3 orphan skills .mts files brought under include (listFiles-verified); both typechecks 0. EVIDENCE: review artifact 20260819T005500Z.
- [x] AC-C: Bun-only coherence: 4 inert strip-types flags removed; test:node deleted (DEC-007); evals:view on bun; root test:all + parallel test:crew added. EVIDENCE: diffs flag-removal-only; suites 3310/2 known + 1971/0 re-verified by name.

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
