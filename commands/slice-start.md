---
description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
---

# Slice Start

Symmetric counterpart to `/loop:slice complete`. Run this
**before** beginning acceptance-criteria work on a new slice so cost
auto-emit windows attribute the session to the right slice.

What it does:

1. Looks up the slice's title from the active plan (newest
   `docs/superpowers/plans/*.md` by mtime, falling back to
   `docs/ai-loop/backlog/approved-slices.md`).
2. Reads the slice file's `## Objective` block (if present) to seed the
   run-brief goal.
3. Invokes `crew write-run-brief --title "<SLICE-NN>: <title>"` — this
   rotates `.claude/state/crew/workflow-state.json.currentRun` and sets
   `startedAt` to now. Subsequent cost-slice / cost-advise emits use
   this window.
4. Rewrites `.claude/state/crew/slice-progress.md` so the dashboard
   reflects the new IN_PROGRESS slice.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice start \
  --repo "$PWD" \
  --id SLICE-NN \
  [--goal "<one-line goal override>"] \
  [--no-dispatch]
```

`--no-dispatch` opts out of the dispatch instruction (used for manual /
debugging invocations where the agent is doing the slice work
in-conversation). The autonomous loop should always omit this flag so
implementation runs through a `crew:fullstack-dev` subagent (the parent loop
then drives the `crew:inspector` and `crew:verifier` gates separately
before closing the slice).

Returns:

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/2026-05-22-crew-monitor-phase-2.md" },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "dispatchInstruction": "Dispatch crew:fullstack-dev subagent with this prompt:\n\n> Implement SLICE-18: ICrewArtifactSource + ObservedApplication source fields. See `docs/ai-loop/04-implementation-slices/SLICE_18_SOURCE_ABSTRACTION.md` for acceptance criteria. Goal: Add abstraction for artifact sources... You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path. Do NOT dispatch crew:inspector or crew:verifier yourself; the parent loop drives those gates separately after you return. When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:inspector, then crew:verifier if behavior changed, then run /loop:slice complete --id SLICE-18.",
  "nextAction": "Dispatch crew:fullstack-dev subagent for SLICE-18; then dispatch crew:inspector (and crew:verifier if behavior changed); close with /loop:slice complete --id SLICE-18."
}
```

`dispatchInstruction` is null when `--no-dispatch` was passed.

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow:

1. Dispatch `crew:fullstack-dev` subagent for slice implementation. Builder
   owns implementation only and returns a write-handoff artifact path
   when acceptance criteria PASS in its self-verify gates.
2. Dispatch `crew:inspector` subagent for the review gate. Pass it the
   builder's handoff artifact path and the slice file path.
3. If behavior changed, dispatch `crew:verifier` subagent for the
   validation gate.
4. Run `/loop:slice complete --id SLICE-NN` to close.

## Role glossary

Each slice passes through a fixed set of named roles. This table is the
canonical reference — descriptions match `constitution.md` (Team Roles)
and `CLAUDE.md` (Owned agents).

| Role | Agent ID | Responsibility |
|---|---|---|
| **builder** | `crew:fullstack-dev` / `crew:backend-dev` / `crew:frontend-dev` | Implements acceptance criteria in bounded scope; owns tests for changed behavior |
| **reviewer A** | `crew:inspector` | Correctness, logic, edge cases, AC coverage |
| **reviewer B** | `crew:inspector` | Production-readiness, observability, security |
| **validator** | `crew:verifier` | Behavior validation — runs or inspects the changed behavior against ACs |
| **deployer** | `crew:release-engineer` | Deployment and environment evidence; promotion to dev/prod |
| **researcher** | `loop:researcher` | Read-only code archaeology and fact gathering before a change is proposed |
| **pm** | `loop:pm` | Backlog scoring across 5 dimensions; AC clarity gate; `autonomous_safe` determination |
| **architect** | `loop:architect` | Read-only design and ADR authoring for structural changes; prepend before SLICE-A of new contracts |
