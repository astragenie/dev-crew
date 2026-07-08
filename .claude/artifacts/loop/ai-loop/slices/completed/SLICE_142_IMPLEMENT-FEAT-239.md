---
id: SLICE-142
title: Implement FEAT-239
status: completed
feature: FEAT-239
phase: null
priority: P2
target_release: null
requires_validation: false
risk: medium
created: 2026-07-08
updated: 2026-07-08
github_issue: 387
github_url: "https://github.com/astragenie/runner-plugin/issues/387"
completed_at: 2026-07-08
---
# SLICE-142: Implement FEAT-239

Implements FEAT-239. See [feature file](../../../backlog/in-progress/FEAT-239.md) for product context.

## Objective

`slice close --grade-yaml <path>` writes the supplied yaml **verbatim** as the grade file

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given a well-formed grade yaml (frontmatter-style `scores:` map with all 7 dimensions), When `slice close --grade-yaml <path>` runs, Then the grade file is rendered into the template markdown (`## Scores` list populated from the map) so `parseScoresFromBody` reads it, and validation passes. Evidence: `normalizeGradeYaml` in grade-yaml-normalizer.mts, wired at close-slice.mts; PR #383.
- [x] AC-2 (alternative/also): both input shapes validate. Satisfied via the render path (AC-1) rather than a `parseScoresFromBody` frontmatter fallback — a frontmatter-only yaml is rendered into a `## Scores` body, a full grade-markdown input passes through byte-identical. Evidence: grade-yaml-normalizer.test.mts passthrough test.
- [x] AC-3: Given the yaml also carries `lessons:` and `decisions:`, When close renders the grade, Then those become the `## Lessons` bullets and `### DEC-TBD` blocks the decision extractor expects. Evidence: normalizer renders decisions blocks; THIS slice's own close allocated a DEC from a pure-yaml grade.
- [x] AC-4: A regression test drives `slice close --grade-yaml` end-to-end on a fixture yaml and asserts a non-zero `scoresAverage` + allocated decisions, not a `missing dimension` failure. Evidence: close-slice.test.mts "FEAT-239: pure-yaml grade closes with scores + decisions".

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-239 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
