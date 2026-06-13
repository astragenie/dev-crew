---
id: SLICE-117
title: Confidence reporting per slice (traffic-light signal)
status: pending
feature: FEAT-085
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 252
github_url: "https://github.com/sergeymilashico/loop/issues/252"
---
# SLICE-117: Confidence reporting per slice (traffic-light signal)

Implements FEAT-085. See [feature file](../../../backlog/in-progress/FEAT-085.md) for product context.

## Objective

Competitor gap audit (2026-05-28). Surfaced by:

## In scope

- Add `sliceStartConfidence` field to `buildBrief` return in `src/scripts/lib/brief.mts`
- Call `computeConfidence` from `confidence-signal.mts` with `acCount=1` sentinel, `autonomousSafe`, `recentGradeAvg`, `dependsOnCount` from top triaged feature
- Add ≥3 test cases in `src/tests/brief.test.mts` covering null (no triaged), green, yellow, red cases

## Out of scope

- Modifying `confidence-signal.mts` logic or types
- Parsing FEAT body for AC count (deferred to future FEAT)

## Acceptance criteria

- [ ] AC-1: `buildBrief` returns `sliceStartConfidence === null` when no triaged features exist; returns non-null object with `featureId`, `confidence`, `reason` when triaged features exist
- [ ] AC-2: `computeConfidence` from `confidence-signal.mts` is the only confidence computation call site in `brief.mts` — heuristic logic is not duplicated or inlined; all tests pass and linter is clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-085 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
