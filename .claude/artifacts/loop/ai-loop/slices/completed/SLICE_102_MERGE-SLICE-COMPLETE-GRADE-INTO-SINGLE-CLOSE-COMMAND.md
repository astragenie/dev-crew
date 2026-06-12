---
id: SLICE-102
title: Slice close command — merges complete + grade for autonomous_safe slices (FEAT-188)
status: completed
feature: FEAT-188
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-102: Slice close command (FEAT-188)

## Objective

Add `bun src/scripts/loop.mts slice close --id SLICE-NN [--grade-yaml <path>]` that collapses the 3-step closing ceremony (complete → grade → grade-write) into one CLI roundtrip when the FEAT is `autonomous_safe: true` and a pre-formatted grade file is supplied. Falls back to scaffold-only behavior otherwise. Existing 3-step subcommands remain.

## In scope

- New lib `src/scripts/lib/slice-linker/close-slice.mts` exporting `closeSlice(repoPath, sliceId, opts)`.
- Re-export from `src/scripts/lib/slice-linker.mts`.
- CLI subcommand `close` in `src/scripts/loop.mts` (slice command registry).
- Tests `src/tests/close-slice.test.mts` (lib unit + CLI integration via spawnSync).

## Out of scope

- Auto-extracting grade content from final-synthesis artifact body.
- Removing 3-step subcommands.
- Wiring crew:lead's slice closure step.

## Acceptance criteria

- [ ] AC-1: All tests pass + `bun run lint` clean + tsc clean (both configs).
- [ ] AC-2 (lib scaffold-only): `closeSlice(repo, "SLICE-NN")` (no grade yaml) calls `completeSlice` + `createGradeFile`, returns `{ complete, grade: null, scaffoldOnly: true }`. Test verifies the slice file moved to completed/ and the grade template file exists at the returned path.
- [ ] AC-3 (lib with --grade-yaml on autonomous_safe FEAT): `closeSlice(repo, "SLICE-NN", { gradeYamlPath })` reads the yaml, overwrites the scaffolded grade file with its content, calls `writeGrade`, returns `{ complete, grade: <writeGrade output>, scaffoldOnly: false }`. Test verifies grade frontmatter scores were persisted (not the template defaults).
- [ ] AC-4 (autonomous_safe gate): when the feature's frontmatter has `autonomous_safe: false` AND `gradeYamlPath` is provided, `closeSlice` throws `Error` with message containing `"--grade-yaml requires FEAT autonomous_safe: true"` AND `"slice complete + slice grade + slice grade-write"` (suggested 3-step). Test verifies the throw before any side effects (slice file is NOT moved).
- [ ] AC-5 (CLI happy path): `spawnSync("bun", [LOOP_CLI, "slice", "close", "--id", "SLICE-NN", "--grade-yaml", path, "--repo", repo])` returns exit 0, JSON has `scaffoldOnly: false`, telemetry event `slice close` is logged.
- [ ] AC-6 (back-compat): existing `slice complete`, `slice grade`, `slice grade-write` subcommands behave unchanged. Full test suite stays green (1260+ pass).

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc` clean (both configs).
- CHANGELOG entry under [Unreleased] noting the new `slice close` command.
- Final-synthesis artifact written.
- FEAT-188 moves to `done/` with `slices_complete: [SLICE-102]`.

## Reviewer ladder

- Reviewer A (correctness): verify autonomous_safe gate throws BEFORE `completeSlice` (no side effects on refuse); verify `writeGrade` runs only after the yaml content is actually written to disk (race-safe); verify CLI handler emits exactly one telemetry event regardless of scaffold-only vs. full close.
- Reviewer B (production-readiness): verify the CLI documentation strings + usage output mention `slice close`; verify the CHANGELOG entry; verify the `closeSlice` return shape is documented in module header (so future docs writer can pick it up).
