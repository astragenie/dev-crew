# Design: Inline `/devcrew:build` dispatch — replace `devcrew:lead` subagent

**Date:** 2026-06-04
**Status:** approved
**Author:** herolegion

## Problem

After commit `7b8b90b` the autonomous loop dispatches a `devcrew:lead` subagent per slice. Lead is instructed to "frame → delegate to devcrew:fullstack-dev → review → validate → synthesize". In practice, lead agents implement code inline (instability pattern A) rather than delegating, making the dispatch layer non-deterministic. The prior approach (`Dispatch /devcrew:build subagent`) was more stable but lacked a clear lead workflow.

## Goal

Replace the `devcrew:lead` subagent dispatch with an inline invocation of the `devcrew:build` skill so the loop orchestrator itself acts as lead. This eliminates the delegation indirection that causes instability while preserving the full crew build workflow.

## Design

### Core mechanic

`buildDispatchInstruction()` changes its emitted text from:

```
Dispatch devcrew:lead subagent with this prompt:
> Lead the implementation of ...
```

to:

```
Invoke the `devcrew:build` skill with this context:
> **Slice:** SLICE-NN — <title>
> **Goal:** <resolvedGoal>
> **Mode preference:** single-session unless the slice has explicit multi-file parallel work.
> When acceptance criteria PASS with evidence, return control — run /loop:slice complete --id SLICE-NN.
> If review or validation reports needs_fix / fail, use /devcrew:fix before returning.
```

The orchestrator reads this and calls `Skill("devcrew:build", sliceContext)`. The devcrew:build workflow runs inline in the orchestrator's conversation. No separate lead subagent is spawned.

### Why this is more stable

- `devcrew:build` explicitly allows single-session mode (orchestrator implements directly) — "implements inline" is the intended path, not a failure mode.
- No delegation step where lead must choose to spawn builder vs. implement directly.
- devcrew:build's review step dispatches `devcrew:inspector` as a subagent only when warranted — same as before but now the decision is made by the orchestrator following an explicit workflow, not by a lead agent guessing.

### Feature path in context block

`readFeatureExcerpt()` currently returns `string | null` (the Description excerpt). Change to return `{ path: string, excerpt: string } | null` so the feature file path is surfaced in the dispatch context block. Orchestrator can then `Read(featurePath)` for full context without searching.

Context block renders as:
```
### Feature: FEAT-012
Path: .claude/artifacts/loop/backlog/in-progress/FEAT-012.md

<excerpt>
```

### Progress signals

`[MODE]` and `[CHECKPOINT]` signal block is retained in the dispatch instruction. The orchestrator emits `[MODE]` on first response and `[CHECKPOINT] AC-N: pass|fail|skip` per AC — same as today.

### Dispatch budget

`dispatchLimits` budget block retained unchanged.

### `--no-dispatch` escape hatch

Retained unchanged for debugging/manual invocations.

## Files changed

| File | Change |
|---|---|
| `src/scripts/lib/slice-linker/dispatch.mts` | Dispatch text rewrite; `readFeatureExcerpt` return type; `appendContextBlock` + `buildDispatchInstruction` accept `featurePath` |
| `src/scripts/lib/slice-linker/start-slice.mts` | Thread `featurePath` from `readFeatureExcerpt` result into `buildDispatchInstruction` |
| `.claude/loop/rules.md` | Dispatch table update |
| `templates/loop-rules.md` | Mirror update |
| `src/tests/slice-linker.test.mts` | Update dispatch text assertions |
| `src/tests/slice-start.test.mts` | Update dispatch text assertions |

Compiled `.mjs` outputs regenerated in lockstep.

## What does NOT change

- Slice start/close ceremony
- `computeNextAction` human-readable text (minor wording update only)
- `loop.json` schema
- Artifact protocol (handoffs, review results, validation results)
- Reviewer ladder in slice files

## Acceptance criteria

- [ ] AC-1: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check` all pass
- [ ] AC-2: `buildDispatchInstruction()` emits `Invoke the \`devcrew:build\` skill` text (not `devcrew:lead`)
- [ ] AC-3: When `featureExcerpt` is provided, context block includes `Path:` line with the feature file path
- [ ] AC-4: When `featurePath` is null/absent, context block renders exactly as before (no `Path:` line)
- [ ] AC-5: `.claude/loop/rules.md` dispatch table row updated to reflect inline skill invocation
- [ ] AC-6: `readFeatureExcerpt` returns `{ path, excerpt }` object; callers in `start-slice.mts` updated accordingly

## Risk

Low. Pure text change to dispatch prompt + minor return-type change to `readFeatureExcerpt`. No new runtime behavior — the orchestrator's response to the changed instruction is the behavior change. No git operations, no schema changes, no new dependencies.

Regression risk: slice-linker tests assert on dispatch text substrings — they need updating. If missed, CI fails fast.
