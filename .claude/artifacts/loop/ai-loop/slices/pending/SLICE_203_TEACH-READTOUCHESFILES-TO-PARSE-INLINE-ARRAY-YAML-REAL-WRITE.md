---
id: SLICE-203
title: Teach readTouchesFiles to parse inline-array YAML + real writer/reader round-trip test
status: pending
feature: FEAT-288
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-05
updated: 2026-08-05
effort_points: 1
estimated_tokens: 60000
github_issue: 624
github_url: "https://github.com/astragenie/runner-plugin/issues/624"
---
# SLICE-203: Teach readTouchesFiles to parse inline-array YAML + real writer/reader round-trip test

Implements FEAT-288. See [feature file](../../../backlog/in-progress/FEAT-288.md) for product context.

## Objective

touches_files round-trip is broken: the writer emits inline YAML arrays, the only reader parses block-style lists only, so FEAT-276 AC-4 is non-functional end to end and wave planning silently degrades.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] GIVEN a slice frontmatter's touches_files field written as an inline YAML array (the writer's actual output), WHEN readTouchesFiles parses it, THEN it returns the declared paths with a non-missing confidence tier instead of confidence "missing".
- [ ] GIVEN a slice frontmatter's touches_files field written as a block-style YAML list (the previously-supported form), WHEN readTouchesFiles parses it, THEN it continues to return the declared paths with no regression.
- [ ] GIVEN the real writer (createSlice) creates a slice declaring touches_files, WHEN the real reader (readTouchesFiles) is invoked against the resulting file in one round-trip test, THEN the declared paths survive unchanged end to end.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-288 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
