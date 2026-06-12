---
id: SLICE-107
title: Drop lead + direct-builder orchestrator modes — slice-build becomes default (FEAT-191)
status: completed
feature: FEAT-191
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-107: Drop lead + direct-builder, slice-build becomes default (FEAT-191)

Closes FEAT-191. Single-slice cleanup since the work is mostly mechanical removals + test flips + doc edits.

## In scope

- `src/scripts/lib/slice-linker/dispatch.mts`:
  - `OrchestratorMode` union drops `"lead"` and `"direct-builder"`. Final shape: `"slice-build" | "orchestrate-slice"`.
  - `resolveOrchestratorMode` defaults to `"slice-build"` (was `"lead"`).
  - `buildDispatchInstruction` `mode === "lead"` branch removed. `buildLeadOrchestratorInstruction` deleted along with its helpers if unused.
  - `direct-builder` fallthrough branch removed — `slice-build` becomes the only fallthrough.
- `src/scripts/lib/slice-linker/start-slice.mts`:
  - `resolveOrchestratorModeConfig` accepts only `"slice-build"` and `"orchestrate-slice"`. Falls back to `"slice-build"`.
  - All `orchestratorMode: OrchestratorMode = "lead"` defaults flipped to `"slice-build"`.
  - `nextAction` messages no longer reference `crew:lead`.
- `src/scripts/lib/walker-gates.mts`:
  - `WalkerOrchestratorMode` mirrors the new union.
  - JSDoc / inline comments updated; no live references to `"lead"` or `"direct-builder"`.
- `src/tests/slice-build-routing.test.mts`:
  - Drop the legacy-mode acceptance test, drop the direct-builder back-compat test.
  - Keep slice-build coverage + a new test pinning the default to `"slice-build"`.
- `src/tests/slice-linker.test.mts`:
  - DELETE tests asserting `buildDispatchInstruction` emits `Dispatch crew:lead` or `Dispatch crew:fullstack-dev` via direct-builder.
  - Keep the `orchestrate-slice` test (still valid).
- `src/tests/slice-start.test.mts`:
  - Flip `startSlice emits 'Dispatch crew:lead subagent' by default` → assert slice-build dispatch (which depends on the slice's tags; default fixture has no tags → emits `crew:fullstack-dev`).
- `src/tests/auto-walker.test.mts`:
  - Flip default-mode assertion from `"lead"` to `"slice-build"`.
  - Drop direct-builder-pin test or flip to slice-build-pin.
- CLAUDE.md § Orchestrator mode: document only `slice-build` + `orchestrate-slice`. Note removal of `lead` + `direct-builder` in v0.43 with a one-line migration hint.
- CHANGELOG entry under [Unreleased] flagging the breaking change.

## Out of scope

- Keeping `lead` as opt-in (decision is removal).
- Reviving the lead path once hero-crew fixes specialist-pause (separate FEAT if/when needed).
- Touching crew-side agents (lead is still a real agent in crew; this slice removes loop's dispatch path to it, not the agent itself).

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean (both configs).
- [ ] AC-2 (union shrunk): `OrchestratorMode = "slice-build" | "orchestrate-slice"`. No code path mentions `"lead"` or `"direct-builder"` outside of the CHANGELOG migration note and the deletion's commit message.
- [ ] AC-3 (default flipped): `resolveOrchestratorModeConfig({})` returns `"slice-build"`. `buildDispatchInstruction` with no `orchestratorMode` arg behaves like `slice-build`.
- [ ] AC-4 (lead branch gone): `grep -rn "buildLeadOrchestratorInstruction\|crew:lead subagent" src/scripts/` returns no matches (CHANGELOG + this slice file allowed).
- [ ] AC-5 (orphan tests removed): `grep -rn '"lead"\|"direct-builder"' src/tests/` returns only references in the new default-mode assertion (the rejection of the legacy value, if any). Test count drops by the orphans.
- [ ] AC-6 (CLAUDE.md updated): § Orchestrator mode mentions only `slice-build` and `orchestrate-slice`. Includes migration line.
- [ ] AC-7 (CHANGELOG entry): [Unreleased] block flags the breaking change.

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green (test count should drop by orphan-count).
- `bun run lint` clean.
- `bunx tsc` clean (both configs).
- Final-synthesis artifact written.
- FEAT-191 moves to `done/`.

## Reviewer ladder

- Reviewer A (correctness): grep `src/scripts/` for any remaining `"lead"` or `"direct-builder"` string literals (excluding CHANGELOG); verify the `walker-gates` JSDoc + walker plan emission doesn't still reference removed modes; verify no test asserts the legacy default (`"lead"`) anywhere.
- Reviewer B (production-readiness): verify CHANGELOG flags this as a breaking change (operators with `orchestratorMode: "lead"` in their `.claude/loop.json` get auto-fallback to `slice-build`, not a hard error); verify CLAUDE.md migration line is operator-readable; verify removed tests didn't carry unique coverage of behavior `slice-build` doesn't replicate (the `crew:fullstack-dev` emission for no-tag slices is preserved by the slice-build fallthrough).
