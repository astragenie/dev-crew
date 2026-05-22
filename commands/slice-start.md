---
description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
---

# Slice Start

Symmetric counterpart to `/autonomous-loop:slice complete`. Run this
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
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" slice start \
  --repo "$PWD" \
  --id SLICE-NN \
  [--goal "<one-line goal override>"]
```

Returns:

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/2026-05-22-crew-monitor-phase-2.md" },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "nextAction": "Begin acceptance-criteria work for SLICE-18. Close with /autonomous-loop:slice complete --id SLICE-18."
}
```

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/autonomous-loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow: do the slice
work (acceptance criteria, build + test PASS with evidence), then run
`/autonomous-loop:slice complete --id SLICE-NN`.
