---
feature: FEAT-190
status: active
---
# Run Brief: FEAT190 SLICE105: slice-build mode — parallel fe+be fanout (FEAT-190 slice-2)

- Created: 2026-06-12T12:07:11.595Z
- Tier: full
- Goal: When `orchestratorMode === "slice-build"` AND the slice has BOTH `fe` AND `be` in tags, emit a dispatch instruction telling the orchestrating agent to issue ONE Agent message with TWO parallel tool calls: `crew:frontend-dev` + `crew:backend-dev`.  The change is observable in: - `BuilderVariant` type: add `"parallel-fe-be"`. - `pickBuilderVariant(["fe", "be"])` returns `"parallel-fe-be"` (was `"fullstack"` in SLICE-104, intentionally interim). - `buildDispatchInstruction` for `slice-build + paral
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/dispatch.mts`:
  - `BuilderVariant` adds `"parallel-fe-be"`.
  - `pickBuilderVariant` returns `"parallel-fe-be"` when tags contain BOTH `fe` AND `be`.
  - New internal helper `buildParallelFeBeInstruction(sliceId
  - title
  - rel
  - resolvedGoal
  - dispatchLimits)` returns a string with both prompts in one block. Format: explicit "PARALLEL DISPATCH" header + two `> ` quoted prompts (one per variant).
  - `buildDispatchInstruction`'s slice-build branch: if variant is `parallel-fe-be`
  - call the parallel helper.
- `src/tests/slice-build-routing.test.mts`:
  - Flip the `fe + be (interim) -> fullstack` test to assert `"parallel-fe-be"` and update its name. Add a comment noting SLICE-105 retired the interim.
  - Flip the `slice-build + fe+be (interim) emits crew:fullstack-
- Out Of Scope:
  - - Architect pre-flight when `needs_contract: true` (SLICE-106).
- Walker auto-flip of default mode.
- Refactoring `buildDispatchInstruction`'s return type to `string | StructuredPayload`. SLICE-105 stays string-based for back-compat with all callers.
- Planned Files: -
- Next Step: Begin implementation

