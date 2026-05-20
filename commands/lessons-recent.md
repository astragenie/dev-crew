---
description: Return the last N slice grades' lessons / surprises / followups as a feed-forward digest for the next-slice planner.
---

# Lessons Recent

Pulls the last N grade files (default 5) and aggregates their `## Lessons`,
`## Surprises`, `## Followups` sections into a markdown digest the
researcher agent should read before drafting acceptance criteria for the
next slice. Prevents repeating known mistakes.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" lessons recent [N]
```

Default `N = 5`. Returns:

```json
{
  "count": 5,
  "items": [
    {
      "slice": "SLICE-52",
      "graded_at": "2026-05-20",
      "avg_score": 0.829,
      "lessons": ["OTel span naming inconsistencies"],
      "surprises": ["Aspire AppHost rebuild required when adding new ContainerApp env var"],
      "followups": ["Backport pagination pattern to memory-list endpoint"]
    }
  ],
  "digest": "# Lessons feed-forward — last 5 slice(s)\n\n## SLICE-52..."
}
```

## When to run

- Researcher reads this before drafting acceptance criteria for a new
  slice (referenced from Cross-Slice Continuation HARD RULE flow)
- Lead reads before promoting a feature to slice if last 3 grades had
  recurring surprises (pause + address vs charge ahead)
- Before a phase-gate planning session

The `digest` field is ready to paste into an agent context window.
