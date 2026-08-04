---
id: SLICE-190
title: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines
status: pending
feature: FEAT-284
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 2
estimated_tokens: 100000
github_issue: 604
github_url: "https://github.com/astragenie/runner-plugin/issues/604"
---
# SLICE-190: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines

Implements FEAT-284. See [feature file](../../../backlog/in-progress/FEAT-284.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-284 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given a candidate commit whose subject/body matches a proposed slice's FEAT-id/SLICE-ordinal token pair, When reconcileProposedSlicesAgainstGit evaluates it, Then the commit is only recorded as shipped evidence if it actually changed at least one file — a docs-only or --allow-empty commit (reproducing 71604bb4) must never produce shipped evidence, verified by a NEW fixture that creates a real file-touching commit alongside the existing empty-commit case in the same test.
- [ ] AC-2: Given a proposed slice declares touches_files, When a diff-corroborated candidate commit's changed paths share zero overlap with that list, Then the match is downgraded to a text-only warning and reported to the operator rather than recorded as shipped evidence that advances the start index.
- [ ] AC-3: Given any proposed slice is skipped or downgraded during a reconcile pass, When runner:start / slice from-feature runs, Then an explicit operator-visible line is printed naming the ordinal, the slice title, and the matched commit sha, so the FEAT-284 repro (SLICE-1 dropped via commit 71604bb4) surfaces a visible warning instead of silence.
- [ ] AC-4: Given a FEAT whose proposed_slices had ordinal 1 skipped while ordinals 2-5 are already materialized (the live FEAT-259 state), When slice from-feature is re-run, Then it materializes the missing ordinal 1 and does not create a duplicate of any already-materialized ordinal — a regression test must reproduce the observed duplicate -SLICE-5 + redundant GitHub issue and assert it no longer occurs.
- [ ] AC-5: Given an operator needs to repair a gapped FEAT by hand, When they invoke the new CLI escape hatch targeting a specific id_suffix, Then that exact proposed slice is materialized regardless of index position, without requiring direct BacklogStore API calls (the actual repair path used in the FEAT-284 live repro).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-284 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
