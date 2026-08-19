---
id: SLICE-07
title: "node:test -> bun:test migration (31 files)"
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
proposed_slice_id_suffix: -SLICE-4
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-07: node:test -> bun:test migration (31 files)

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close. Original "31 files" estimate was the post-salvage residual; true
> target was 176 node:test files (146 pre-existing + SLICE-06 growth), done in 3 rounds.

- [x] AC-A: Zero node:test imports in crew/tests (219 .mts files). EVIDENCE: reviewer grep 0; no dual-import files.
- [x] AC-B: Semantics preserved. EVIDENCE: reviewer full-set test-count comparison across all 150 modified files (0 mismatches), skipIf conversions faithful, custom-message mapping verified live, no .skip/.only added.
- [x] AC-C: Suite green serial AND parallel: 1971 pass / 0 fail / 117 skip, parallel 13.2s (was 846/117/116 + 62-72s serial-only). Zero NotImplementedError — bun#5090 class dead. Root suite unchanged 3310/2 known.
- [x] AC-D: node-spawn class eliminated per Bun-first: 14 test files + 14 package.json scripts flipped node→bun (validated by execution); intentional bench toggle preserved.
- [x] AC-E: Production bugs found+fixed en route: test-shard.mts silent-zero discovery filter (70+70+69=209 verified), analyze.mts fixture regex. EVIDENCE: reviewer direct execution.

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
