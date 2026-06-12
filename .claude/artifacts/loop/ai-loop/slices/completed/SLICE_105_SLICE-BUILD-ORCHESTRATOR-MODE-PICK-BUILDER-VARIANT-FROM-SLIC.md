---
id: SLICE-105
title: slice-build mode — parallel fe+be fanout (FEAT-190 slice-2)
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
# SLICE-105: slice-build mode — parallel fe+be fanout (FEAT-190 slice-2)

Second of three FEAT-190 sub-slices. Replaces SLICE-104's interim fe+be → `fullstack` mapping with a real parallel dispatch payload.

## Objective

When `orchestratorMode === "slice-build"` AND the slice has BOTH `fe` AND `be` in tags, emit a dispatch instruction telling the orchestrating agent to issue ONE Agent message with TWO parallel tool calls: `crew:frontend-dev` + `crew:backend-dev`.

The change is observable in:
- `BuilderVariant` type: add `"parallel-fe-be"`.
- `pickBuilderVariant(["fe", "be"])` returns `"parallel-fe-be"` (was `"fullstack"` in SLICE-104, intentionally interim).
- `buildDispatchInstruction` for `slice-build + parallel-fe-be`: emits a string starting `Dispatch crew:frontend-dev AND crew:backend-dev in parallel` with both prompts inline, separated by a clear delimiter.

## In scope

- `src/scripts/lib/slice-linker/dispatch.mts`:
  - `BuilderVariant` adds `"parallel-fe-be"`.
  - `pickBuilderVariant` returns `"parallel-fe-be"` when tags contain BOTH `fe` AND `be`.
  - New internal helper `buildParallelFeBeInstruction(sliceId, title, rel, resolvedGoal, dispatchLimits)` returns a string with both prompts in one block. Format: explicit "PARALLEL DISPATCH" header + two `> ` quoted prompts (one per variant).
  - `buildDispatchInstruction`'s slice-build branch: if variant is `parallel-fe-be`, call the parallel helper.
- `src/tests/slice-build-routing.test.mts`:
  - Flip the `fe + be (interim) -> fullstack` test to assert `"parallel-fe-be"` and update its name. Add a comment noting SLICE-105 retired the interim.
  - Flip the `slice-build + fe+be (interim) emits crew:fullstack-dev` integration test to assert that the output contains BOTH `crew:frontend-dev` AND `crew:backend-dev` AND a `PARALLEL DISPATCH` header.
  - Add a new test: `parallel payload is one string, not two separate dispatches` — verifies a single returned value contains both prompts.

## Out of scope

- Architect pre-flight when `needs_contract: true` (SLICE-106).
- Walker auto-flip of default mode.
- Refactoring `buildDispatchInstruction`'s return type to `string | StructuredPayload`. SLICE-105 stays string-based for back-compat with all callers.

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean (both configs).
- [ ] AC-2 (type + mapping update): `pickBuilderVariant(["fe", "be"]) === "parallel-fe-be"`; mapping is symmetric (`["be", "fe"]` works too).
- [ ] AC-3 (dispatch emits both agents): for slice-build + fe+be slice, `buildDispatchInstruction(...)` returns a string containing exactly the substrings `crew:frontend-dev`, `crew:backend-dev`, and `PARALLEL DISPATCH` (or equivalent unambiguous header).
- [ ] AC-4 (single string output): the dispatch instruction is a single returned string (not an array or object) so existing callers (walker-gates, start-slice) keep working unchanged. Pinned by test.
- [ ] AC-5 (back-compat): single-variant fe-only / be-only / no-tags slices behave EXACTLY as SLICE-104 — same prompt, same agent name. Existing SLICE-104 tests stay green except for the two that asserted the interim fe+be → fullstack mapping (those flip to the new behavior with a comment).

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc` clean (both configs).
- CHANGELOG entry under [Unreleased] noting parallel fanout shipped.
- Final-synthesis artifact written.
- FEAT-190 stays in `in-progress/` (SLICE-106 still remaining).

## Reviewer ladder

- Reviewer A (correctness): verify the parallel header is unambiguous (an orchestrating agent reading the string can't accidentally issue only one dispatch); verify tag-order doesn't matter (`["fe", "be"]` ≡ `["be", "fe"]`); verify the existing direct-builder mode still emits `crew:fullstack-dev` regardless of tags.
- Reviewer B (production-readiness): verify the returned string fits within reasonable size (orchestrating agent will read it inline); verify no callsite expects a single agent name in the output regex (grep callers of `buildDispatchInstruction`).
