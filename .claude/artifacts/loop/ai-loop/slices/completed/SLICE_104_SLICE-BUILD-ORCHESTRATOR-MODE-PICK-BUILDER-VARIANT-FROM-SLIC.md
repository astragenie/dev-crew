---
id: SLICE-104
title: slice-build mode — single-variant routing from tags (FEAT-190 slice-1)
status: completed
feature: FEAT-190
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
effort_points: 3
completed_at: 2026-06-12
---
# SLICE-104: slice-build mode — single-variant routing (FEAT-190 slice-1)

First of three FEAT-190 sub-slices. Adds `orchestratorMode: "slice-build"` and single-variant tag-driven dispatch. Parallel fanout (SLICE-2) and architect pre-flight (SLICE-3) ship in follow-ups.

## Objective

Add `"slice-build"` as a fourth `orchestratorMode` value. When set, `buildDispatchInstruction` reads slice frontmatter `tags`:

- `tags ⊇ {"fe"}` AND NOT `tags ⊇ {"be"}` → `crew:frontend-dev`
- `tags ⊇ {"be"}` AND NOT `tags ⊇ {"fe"}` → `crew:backend-dev`
- neither / both / missing → `crew:fullstack-dev` (existing fallback; both case handled here is the "interim" — SLICE-2 wires real parallel fanout)

Tests pin the four-way mapping. No fanout, no architect pre-flight, no docs beyond CHANGELOG.

## In scope

- `src/scripts/lib/slice-linker/dispatch.mts`:
  - `OrchestratorMode` type adds `"slice-build"`.
  - `resolveOrchestratorMode` accepts the new value.
  - `buildDispatchInstruction` switch handles `mode === "slice-build"`:
    - Read slice frontmatter from `sliceContent` (parsed via `parseFrontmatter`).
    - New helper `pickBuilderVariant(tags: unknown): "frontend" | "backend" | "fullstack"`.
    - New helper `buildSliceBuildInstruction(sliceId, title, rel, variant, ...)` emits the dispatch prompt with the correct agent name.
- `src/scripts/lib/slice-linker/start-slice.mts::resolveOrchestratorModeConfig`: accept `"slice-build"`.
- `src/scripts/lib/walker-gates.mts`: documentation comment lists the new mode (no behavior change here — walker forwards the dispatch instruction verbatim).
- Tests:
  - `src/tests/slice-build-routing.test.mts` (new): unit tests for `pickBuilderVariant` (5 cases: fe-only, be-only, both, neither, undefined) + integration via `buildDispatchInstruction` (4 cases: fe-only emits crew:frontend-dev, be-only emits crew:backend-dev, both falls through to crew:fullstack-dev for now, neither emits crew:fullstack-dev).
- `CHANGELOG.md`: [Unreleased] entry noting `slice-build` mode (SLICE-104 partial: single-variant only; SLICE-2/3 to come).

## Out of scope

- Parallel fanout for `fe` AND `be` slices (SLICE-2 / SLICE-105).
- Architect pre-flight when `needs_contract: true` (SLICE-3 / SLICE-106).
- Walker auto-flip of default mode. Stays opt-in.
- `commands/` doc updates beyond CHANGELOG.

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2 (config accepts new value): `resolveOrchestratorModeConfig({ loop: { orchestratorMode: "slice-build" } })` returns `"slice-build"`. Test in `src/tests/slice-build-routing.test.mts`.
- [ ] AC-3 (`pickBuilderVariant` mapping): `pickBuilderVariant(["fe"]) === "frontend"`; `pickBuilderVariant(["be"]) === "backend"`; `pickBuilderVariant(["fe", "be"]) === "fullstack"` (interim — SLICE-2 changes this); `pickBuilderVariant([]) === "fullstack"`; `pickBuilderVariant(undefined) === "fullstack"`; `pickBuilderVariant("garbage") === "fullstack"`. Test covers all 6.
- [ ] AC-4 (dispatch emits correct agent name): `buildDispatchInstruction({ orchestratorMode: "slice-build", sliceContent: '---\ntags: [fe]\n---\n# Slice' })` returns a string starting `Dispatch crew:frontend-dev subagent`. Symmetric for `be`. Mixed `fe`+`be` falls back to `crew:fullstack-dev` for now. Test covers 4 cases.
- [ ] AC-5 (back-compat): existing `lead`, `orchestrate-slice`, `direct-builder` modes produce identical output (existing tests stay green; no edits to those code paths).

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc --project tsconfig.json --noEmit` and `tsconfig.test.json --noEmit` clean.
- CHANGELOG entry under [Unreleased].
- Final-synthesis artifact written.
- FEAT-190 stays in `in-progress/` (slices 2 + 3 remain).

## Reviewer ladder

- Reviewer A (correctness): verify `pickBuilderVariant` is pure (no IO); verify `sliceContent` parsing in `buildDispatchInstruction` tolerates missing `tags` field; verify fall-through to `crew:fullstack-dev` is the SAME prompt the existing `direct-builder` mode emits today (zero regression for the fallback case).
- Reviewer B (production-readiness): verify the walker still forwards the dispatch instruction verbatim (no walker changes needed in this slice); verify the new mode is opt-in (default stays `lead`); verify the SLICE-104 commit doesn't ship a broken parallel-fanout half-implementation (that's SLICE-2's job).
