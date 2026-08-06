---
id: SLICE-207
title: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation
status: pending
feature: FEAT-299
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-06
updated: 2026-08-06
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
touches_files: [src/scripts/lib/proposed-slices.mts, src/scripts/lib/slice-title.mts, src/scripts/lib/slice-linker/feature-lifecycle.mts, src/tests/proposed-slices.test.mts]
github_issue: 632
github_url: "https://github.com/astragenie/runner-plugin/issues/632"
---
# SLICE-207: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation

Implements FEAT-299. See [feature file](../../../backlog/in-progress/FEAT-299.md) for product context.

## Objective

proposed_slices entries have no uniqueness validation on title or id_suffix, and the identity contract SLICE-192 just shipped now depends on both.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given clampSliceTitle trims whitespace before storing a slice's title while proposed-slices.mts validates the raw untrimmed string, When a proposed title carries leading or trailing whitespace, Then proposed-slices.mts trims before validating and storing (or the legacy fallback in feature-lifecycle.mts's matchProposedIdSuffix compares trimmed values), so the stored trimmed title can match its own proposed entry.
- [ ] AC-2: Given a whitespace-padded proposed title previously caused the legacy fallback to never match, creating a new slice on every rerun of slice from-feature and publishing a fresh tracker issue each time (loop.mts:1567-1574), When this fix ships, Then a regression test with a whitespace-padded proposed title asserts a legacy slice matches and is NOT recreated across repeated runs, not only a single run.
- [ ] AC-3: Given proposed-slices.mts currently validates title non-emptiness/length (<=100 chars) and id_suffix shape but never uniqueness within a FEAT, When this slice ships, Then it rejects at validation time, with a message naming the duplicate, any FEAT whose proposed_slices contains a duplicate title or duplicate id_suffix.
- [ ] AC-4: Given the uniqueness check is new, When it is enabled, Then the existing backlog is scanned first and any FEAT already carrying duplicate titles or id_suffixes is reported, so turning the check on does not fail CI on historical data without warning.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-299 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
