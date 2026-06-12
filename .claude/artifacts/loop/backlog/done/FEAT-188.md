---
id: FEAT-188
status: done
slices_complete: [SLICE-102]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-102]
derived_from: null
autonomous_safe: true
tags: [workflow, cli]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.6
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.7
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
composite_score: 0.65
composite_priority: P1
triage_notes: "Workflow ergonomics enhancement. Three CLI roundtrips per slice (complete, grade, grade-write) collapse to one. Risk band 0.2-0.3: pure orchestration over existing libs (completeSlice, createGradeFile, writeGrade), no semantic change, easy rollback. Existing 3-step path remains for human-in-loop / autonomous_safe=false slices. Cost analog SLICE-95 surgical fix = 0.3 effort."
github_issue: 219
started_at: 2026-06-12
---
# FEAT-188: Merge slice complete + grade into single close command

## Problem

The slice ceremony's closing phase is three CLI calls:

1. `bun src/scripts/loop.mts slice complete --id SLICE-NN` — moves slice file to completed/, runs gates, returns next-action.
2. `bun src/scripts/loop.mts slice grade --id SLICE-NN` — scaffolds the grade template with prefilled metadata.
3. `bun src/scripts/loop.mts slice grade-write --id SLICE-NN` — validates the filled template, extracts DEC-TBD, persists frontmatter.

For autonomous-mode slices, the agent that wrote the final-synthesis already knows the scores, lessons, and decisions. The 3-step requires the agent to roundtrip three commands when it could roundtrip one.

## Proposal

New CLI subcommand `slice close --id SLICE-NN [--grade-yaml <path>] [--keep-feature-open] [--force-close]`.

Behavior:
- **Always** runs `completeSlice` + `createGradeFile`.
- If `--grade-yaml <path>` is provided AND the FEAT is `autonomous_safe: true`: copy the yaml file's content over the scaffolded grade and run `writeGrade` in the same invocation.
- If `--grade-yaml` is provided but FEAT is `autonomous_safe: false`: refuse with a clear error pointing at the 3-step path (preserve human-in-loop discipline).
- If `--grade-yaml` is omitted: behave like the 3-step (template scaffolded, return path, nextAction = manual edit + grade-write).
- Returns combined result: `{ complete: <completeSlice output>, grade: <grade-write output> | null, scaffoldOnly: <boolean> }`.

The existing `slice complete`, `slice grade`, `slice grade-write` subcommands stay — back-compat. `slice close` is the new ergonomic path.

## Acceptance criteria

**AC-1: All tests pass + lint clean.**

**AC-2: New `closeSlice` lib function** — `src/scripts/lib/slice-linker/close-slice.mts` exports `closeSlice(repoPath, sliceId, opts)`. Calls `completeSlice` first, then `createGradeFile`, then if `gradeYamlPath` is provided AND autonomous_safe gate passes, writes the yaml content over the scaffolded grade and calls `writeGrade`. Returns `{ complete, grade, scaffoldOnly }`. Test `src/tests/close-slice.test.mts` covers scaffold-only mode + happy path with `--grade-yaml`.

**AC-3: CLI subcommand `slice close`** — `src/scripts/loop.mts` `close` handler routes flags to `closeSlice`. Telemetry event `slice close` emitted (one event per invocation). Test `src/tests/close-slice.test.mts::cli-close-with-grade-yaml` verifies the happy path via `spawnSync`.

**AC-4: Autonomous_safe gate** — When FEAT has `autonomous_safe: false` AND `--grade-yaml` is provided, `closeSlice` MUST throw with message `"slice close: --grade-yaml requires FEAT autonomous_safe: true; SLICE-NN's feature FEAT-NNN is human-in-loop. Use the 3-step path: slice complete + slice grade + slice grade-write."`. Test verifies the throw + the suggested-path message.

**AC-5: Back-compat** — Existing `slice complete`, `slice grade`, `slice grade-write` subcommands unchanged. Existing tests for those pass without edit. Verify via full test suite run.

## Out of scope

- Auto-extracting scores from final-synthesis artifact frontmatter. `--grade-yaml` consumes a pre-formatted file; synthesis-to-grade transformation is a separate FEAT.
- Removing the 3-step subcommands. They remain.
- Auto-call from crew:lead's slice closure step. Separate documentation update.

## Refs

- `src/scripts/lib/slice-linker/complete-slice.mts::completeSlice`
- `src/scripts/lib/grade-writer.mts::createGradeFile`
- `src/scripts/lib/grade-writer.mts::writeGrade`
- `src/scripts/loop.mts:990-1010` (current grade + grade-write handlers)
- `src/scripts/loop.mts:1012-1050` (current complete handler)
