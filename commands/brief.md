---
description: Standalone autonomous-loop situational report — backlog counts, top priorities, scores, decisions, pattern alerts. Complements crew brief-me.
---

# Autonomous Loop Brief

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" brief --repo "$PWD"
```

Returns JSON with:

- `backlogCounts` — { pending, triaged, in_progress, done }
- `topTriaged` — highest-priority triaged features (next to slice)
- `inFlight` — in-progress features with linked slices
- `specsToDecompose` — approved specs without derived features
- `grades` — total count, last 5 with avg scores, avg of last 5
- `decisions` — total, accepted, superseded, reverted
- `alerts` — pattern alerts (low scores, decomposition issues, orphans, etc.)
- `recentEvents` — last 10 plugin command events from the telemetry log

## Pattern alerts

Triggered by `detectPatterns()`:

| Alert | Trigger |
|---|---|
| `score-trend` | Dimension < 0.80 across last 3 slices — suggest SPEC type=sre |
| `decomposition` | Feature has ≥3 linked slices — review scope |
| `spec-flow` | Spec approved but undecomposed |
| `backlog-flow` | ≥10 features pending triage |
| `in-progress-orphan` | Feature in-progress without a linked slice |

Each alert has `severity`, `category`, `message`, `suggested_action`.

## Relationship to crew brief-me

- `/crew:brief-me` covers Crew artifacts (runs, reviews, validations, workflow state)
- `/autonomous-loop:brief` covers backlog, specs, grades, decisions, alerts

Run both at session start when picking up an in-flight repo. Crew tells you
"what's the active workflow run"; autonomous-loop tells you "what's next in
the product pipeline + how are we doing".
