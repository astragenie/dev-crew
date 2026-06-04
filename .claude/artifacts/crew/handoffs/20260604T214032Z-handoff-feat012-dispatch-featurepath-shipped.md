---
kind: handoff
timestamp: 2026-06-04T21:40:32Z
from: orchestrator
to: next-session
slice: SLICE-37 (pending)
feature: FEAT-012
---

# Handoff: FEAT-012 dispatch stability fix shipped — SLICE-37 ready to implement

## Objective

Ship the inline crew:build dispatch change + feature path context surfacing, then prepare FEAT-012/SLICE-37 for implementation in a dedicated session.

## What shipped (v0.7.5)

**PR #31 merged → main → released as v0.7.5**

1. `readFeatureExcerpt` return type: `string|null` → `{ path: string; excerpt: string } | null`
2. `buildDispatchInstruction` / `appendContextBlock` accept `featurePath` param; renders `Path:` line in `## Slice context` block
3. `featurePath` threaded end-to-end: `gatherSliceResources` → `buildStartSliceReturn` → `buildDispatchInstruction`
4. Dispatch text: `Dispatch crew:lead subagent with this prompt:` → `Invoke the \`crew:build\` skill with this context:`
5. `computeNextAction` updated to match
6. `rules.md` + `templates/loop-rules.md` dispatch table row updated
7. `CLAUDE.md` dispatch discipline line updated
8. Plugin manifest bumped: `.claude-plugin/plugin.json` → `0.7.5`
9. All gates: 687/687 tests, lint clean, typecheck clean, format clean

**Root cause fixed:** commit `7b8b90b` introduced crew:lead as intermediary; lead agents were choosing single-session and implementing inline. Removing the lead layer and calling crew:build directly means single-session is correct behavior, not a bug.

## SLICE-37 state

- File: `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_CONTINUOUS-CHECKPOINT-COMMITS-WITH-WIP-SQUASH-ON-SHIP.md`
- Feature: `.claude/artifacts/loop/backlog/in-progress/FEAT-012.md`
- Run brief already rotated: `.claude/artifacts/crew/runs/20260604T202435Z-run-brief-phase2-feat012-slice37.md`
- Scope: `checkpointMode: "off"|"continuous"` config schema + WIP commit guidance injected into dispatch instruction when `continuous`. No git ops from TypeScript — prompt layer only.
- AC linter: placeholder ACs present — **fill in before `/loop:slice-start`**

## Next session start

1. Open worktree `feat+012-checkpoint-wip-commits` (or new worktree on main)
2. Read SLICE-37 file — fill in real ACs (replace placeholders)
3. `/loop:slice-plan SLICE-37` — codebase research pass
4. `/loop:slice-start SLICE-37` — rotate run window
5. Invoke `crew:build` skill with dispatch instruction

## Key files to read

- `src/scripts/lib/config-resolver.mts` — add `checkpointMode` to schema here
- `src/scripts/lib/slice-linker/dispatch.mts` — inject WIP guidance into dispatch text here
- `src/scripts/lib/slice-linker/start-slice.mts` — reads config, passes to buildDispatchInstruction
- `docs/research/2026-05-28-competitor-gap-audit/briefs/gstack.md` GAP-6 — competitor reference

## Confidence

High on shipped work (all gates green, released). Medium on SLICE-37 scope — config schema change is small but dispatch injection needs care to stay under complexity cap.

## Risks

- `autonomous_safe: false` on FEAT-012 — approval gate will fire at slice-start; human must review plan before crew:build dispatches
- squash-on-ship (filter WIP commits before PR) is explicitly out of scope for SLICE-37; resist scope creep
