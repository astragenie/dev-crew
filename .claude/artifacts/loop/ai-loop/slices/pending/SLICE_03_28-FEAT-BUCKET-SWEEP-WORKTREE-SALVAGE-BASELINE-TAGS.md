---
id: SLICE-03
title: "28-FEAT bucket sweep, worktree salvage, baseline tags"
status: pending
feature: FEAT-001
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-18
updated: 2026-08-18
effort_points: 2
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
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

> WARNING: ACs copied from FEAT-001 and shared across 3 sibling slices — scope per-slice before close

- [ ] AC-1: Given SLICE-205/206/208 (FEAT-295/297/296) are built+reviewed+green and unmerged on branches main-SLICE-205/206/208 in runner-plugin, When the P0 merge step runs, Then `git log main --grep=SLICE-205` (and 206/208) in runner-plugin returns a commit and `git branch --merged main` lists all three branches.
- [ ] AC-2: Given FEAT-299/SLICE-207's worktree state is unresolved, When the P0 disposition check runs, Then either a merge commit referencing SLICE-207 exists on runner-plugin main, or FEAT-299's frontmatter in dev-crew's imported backlog carries an explicit disposition field with a reason string.
- [ ] AC-3: Given the 28 triaged FEATs in runner-plugin's .claude/artifacts/loop/backlog/triaged/, When the three-bucket sweep completes, Then every one of the 28 FEAT files has a `p0_bucket: moot|carry|defer` frontmatter field -- grep count of files containing the field must equal grep count of files in triaged/.
- [ ] AC-4: Given a stale worktree branch (e.g. fix-427, fix-481) has no salvageable diff against main, When the salvage-or-delete pass evaluates it, Then the branch is deleted and its disposition (no-delta / salvaged-into-commit-<sha>) is recorded in the P0 slice's handoff artifact -- a branch left neither merged, deleted, nor recorded fails this AC.
- [ ] AC-5: Given P0 completes, When `git tag --list "pre-devcrew-baseline*"` runs in both C:\work\mega\dev-team and C:\work\mega\runner-plugin, Then exactly one matching tag exists in each repo pointing at the final pre-import commit.

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
