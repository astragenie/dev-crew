---
id: SLICE-03
title: "28-FEAT bucket sweep, worktree salvage, baseline tags"
status: completed
feature: FEAT-001
phase: null
priority: P1
target_release: null
requires_validation: false
risk: medium
created: 2026-08-18
updated: 2026-08-18
effort_points: 2
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-18
---
# SLICE-03: 28-FEAT bucket sweep, worktree salvage, baseline tags

Implements FEAT-001. See [feature file](../../../backlog/in-progress/FEAT-001.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Salvage procedure (operator directive 2026-08-18 — PR-gated)

Salvage-or-delete for stale worktree branches is PR-GATED. A branch may only
be deleted under one of exactly two outcomes:

1. **No salvageable delta** vs runner-plugin main (empty or superseded diff —
   verify by file/behavior presence, not diff size; squash-merge phantom-diff
   lesson applies): delete directly, record `no-delta` with evidence.
2. **Salvageable delta**: push the branch, open a PR to runner-plugin origin
   main, and delete ONLY after the PR merges successfully (verify merged state
   via `gh pr view --json state,mergedAt` and commit ancestry on origin/main —
   not PR UI state alone; auto-merge window trap lesson applies). Record
   `salvaged-via-PR-#NNN`.

A branch with a salvageable delta whose PR fails checks or conflicts is NOT
deleted — record `blocked-PR-#NNN` and surface to the operator.

Prerequisite: local main is 14+ commits ahead of origin (wave-1 merges).
Push main to origin FIRST so salvage PRs diff cleanly against a current base.
If CI on the pushed main goes red, stop and surface before any salvage PRs.

## Acceptance criteria

> AC-1/AC-2 satisfied by SLICE-01/SLICE-02 (verified, not redone). This slice owns AC-3/4/5.

- [x] AC-3: 28/28 triaged FEATs stamped p0_bucket (26 carry / 2 defer / 0 moot). EVIDENCE: commit 1ae932ba (backlog files only), reviewer re-tally + 5 spot-reads coherent, CI green run 32189627873.
- [x] AC-4: 6 stale branches dispositioned per PR-gated directive — all no-delta by behavior presence, deleted with worktrees pruned; zero salvage PRs needed; wave-1 branches ancestry-verified before bonus prune. EVIDENCE: reviewer independently located fix-481 + tracker-reconcile content on main; gh pr list empty; worktree list clean.
- [x] AC-5: exactly one pre-devcrew-baseline tag per repo — runner @1ae932ba (pushed), dev-team @2d4fa713 (local, peeled-verify). EVIDENCE: review artifact 20260818T215603Z.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-001 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
