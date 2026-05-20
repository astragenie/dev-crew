---
description: Aggregate grades + decisions + backlog over a time window into docs/retrospectives/YYYY-MM-DD.md.
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
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" retrospective \
  --repo "$PWD" \
  --since 2026-05-01
```

Or use rolling-window syntax via `--span-days`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" retrospective \
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

Recommended cadences:

- Weekly retro: `--span-days 7` (good for team check-in)
- Phase close: `--since <phase-start-date>` (assess the phase)
- Release retro: `--since <release-tag-date>` (post-mortem of shipped work)

The Phase Completion Gate (Wiggin Loop HARD RULE) will auto-invoke this in
v0.1.7+; for v0.1.6 it's a manual command.
