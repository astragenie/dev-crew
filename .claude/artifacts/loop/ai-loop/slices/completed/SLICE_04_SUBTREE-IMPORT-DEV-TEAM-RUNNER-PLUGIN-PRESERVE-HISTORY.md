---
id: SLICE-04
title: "Subtree-import dev-team + runner-plugin, preserve history"
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
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-18
---
# SLICE-04: Subtree-import dev-team + runner-plugin, preserve history

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-04 = import only. Feature ACs 1-4 (rename/scrub/N>=20/tsconfig)
> belong to later slices; feature AC-5 (tag precondition) verified here.

- [x] AC-A: Baseline tags verified in both parents BEFORE any import op. EVIDENCE: runner@1ae932ba, dev-team@2d4fa713 (handoff; reviewer re-confirmed tags valid).
- [x] AC-B: runner-plugin main imported at root, full history, zero content loss. EVIDENCE: merge 66f4d793; reviewer re-derived collision list from scratch (19 collisions, all in protected set); 10-file byte-identity sample pass; excluded dogfood tree blob-reachable via 2nd parent.
- [x] AC-C: dev-team imported under crew/ non-squashed at tag commit. EVIDENCE: subtree d565c210, parents verified (66f4d793 + 2d4fa713); crew/ == dev-team main except 6 disclosed wiring files; history reachable (blame to 2026-04-04; 55 commits via 2nd-parent path query).
- [x] AC-D: Both suites at parent baselines; typecheck green. EVIDENCE: root 3310/2 (both failures = known self-referential DEC existsSync checks, root-caused); crew 846/117/116 == dev-team main baseline (bun#5090 pre-migration scope); root tsc clean; bun install green both trees.
- [x] AC-E: dev-crew planning state untouched. EVIDENCE: zero diff on CLAUDE.md/docs/planning/backlog across all three commits (reviewer-verified).

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
