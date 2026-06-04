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
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" slice start \
  --repo "$PWD" \
  --id SLICE-NN \
  [--goal "<one-line goal override>"] \
  [--no-dispatch]
```

`--no-dispatch` opts out of the dispatch instruction (used for manual /
debugging invocations where the agent is doing the slice work
in-conversation). The autonomous loop should always omit this flag so
implementation runs through a `crew:lead` subagent (which then drives
the full lead workflow — frame, delegate to `crew:builder`, gate via
`crew:reviewer` / `crew:validator`, synthesize).

Returns:

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/2026-05-22-crew-monitor-phase-2.md" },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "dispatchInstruction": "Dispatch crew:lead subagent with this prompt:\n\n> Lead the implementation of SLICE-18: ICrewArtifactSource + ObservedApplication source fields. See `docs/ai-loop/04-implementation-slices/SLICE_18_SOURCE_ABSTRACTION.md` for acceptance criteria. Goal: Add abstraction for artifact sources... Run the full crew lead workflow: frame the work (in-scope / out-of-scope / mode choice), implement via single-session, assisted single-session, or team run (delegating to `crew:builder` when scope warrants), require independent review via `crew:reviewer` when code changes, and validation via `crew:validator` when behavior is exercisable, then synthesize. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id SLICE-18. If review or validation reports needs_fix / fail, pivot through /crew:fix before resuming.",
  "nextAction": "Dispatch crew:lead subagent for SLICE-18; close with /loop:slice complete --id SLICE-18."
}
```

`dispatchInstruction` is null when `--no-dispatch` was passed.

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow: do the slice
work (acceptance criteria, build + test PASS with evidence), then run
`/loop:slice complete --id SLICE-NN`.
