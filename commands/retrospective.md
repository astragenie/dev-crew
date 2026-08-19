---
name: retrospective
description: Aggregate grades + decisions + backlog over a time window into docs/retrospectives/YYYY-MM-DD.md.
auto_execute_steps: false
---

# Retrospective

Reads `docs/grades/`, `docs/decisions/`, `docs/backlog/`, `docs/specs/` and
generates a markdown summary capturing:

- Slices graded in window
- Decisions captured in window
- Score averages per dimension (with ⚠ flag for any below 0.80)
- Top recurring lessons / surprises / followups (with repeat counts)
- Improvement opportunities derived from low-scoring dimensions
- Slice cadence (slices per week)

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" retrospective \
  --repo "$PWD" \
  --since 2026-05-01
```

Or use rolling-window syntax via `--span-days`:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" retrospective \
  --repo "$PWD" \
  --span-days 7
```

Returns:

```json
{
  "artifactPath": "docs/retrospectives/2026-05-20.md",
  "report": {
    "range": { "since": "2026-05-13", "until": "2026-05-20" },
    "counts": { "gradesInWindow": 4, "decisionsInWindow": 2, ... },
    "scoreAverages": { "architecture_quality": 0.85, ... },
    "dimensionsBelowThreshold": ["observability"],
    "topLessons": [{ "key": "...", "count": 3 }],
    "decisionsList": [...]
  }
}
```

## Synthesis step (after the CLI runs)

The CLI aggregates; the dispatching agent must synthesize. From the
returned report:

1. For each entry in `dimensionsBelowThreshold`: confirm the
   weak-dimension AC rule is being applied (see `runner:authoring-slices`
   — every new slice must carry a targeting AC). If recent slices in
   the window lack one, log the gap via `/runner:learn`.
2. For each `topLessons` entry with `count >= 2`: decide — is this a
   process fix (log via `/runner:learn`), a backlog item (propose via
   `/runner:backlog-add`), or already covered by an accepted DEC? State
   the disposition in the retrospective artifact; do not leave repeat
   lessons undispositioned.
3. If a dimension has been below threshold across two consecutive
   retrospectives, escalate: propose a dedicated FEAT addressing it
   rather than relying on per-slice AC.

Recommended cadences:

- Weekly retro: `--span-days 7` (good for team check-in)
- Phase close: `--since <phase-start-date>` (assess the phase)
- Release retro: `--since <release-tag-date>` (post-mortem of shipped work)

The Phase Completion Gate (dev-crew method HARD RULE) will auto-invoke this in
v0.1.7+; for v0.1.6 it's a manual command.
