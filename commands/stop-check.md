---
description: Unified stop-condition resolver — should the autonomous loop halt now? Returns reasons + blockers + suggestions.
---

# Stop Check

Returns whether the autonomous loop has reached a stop condition:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" stop-check \
  --repo "$PWD"
```

Returns:

```json
{
  "shouldStop": true,
  "reasons": [
    "backlog empty + no undecomposed specs → no actionable work",
    "2 warn-severity alert(s) — resolve before rolling next slice"
  ],
  "blockers": [
    { "category": "score-trend", "message": "observability below 0.80 across last 3 slices", "suggestion": "Author a SPEC (type=sre or type=adr)..." }
  ],
  "suggestions": [
    "Author a new SPEC or FEAT to continue. Run /autonomous-loop:spec add or /autonomous-loop:backlog add."
  ],
  "snapshot": { "pendingOrTriaged": 0, "inProgress": 0, "approvedUndecomposed": 0, "totalAlerts": 2, "warnAlerts": 2 }
}
```

## Stop conditions

| Condition | Trigger |
|---|---|
| Backlog exhausted | No pending/triaged/in-progress features AND no approved-undecomposed specs |
| Warn alerts | Any pattern alert with `severity: warn` (score-trend regression, in-progress orphan, decomposition explosion) |

`shouldStop: true` when any condition fires.

## How to use

The Cross-Slice Continuation HARD RULE calls this before selecting the
next slice:

- `shouldStop: true` → halt + ping user with `reasons` + `suggestions`
- `shouldStop: false` → proceed with normal slice selection

Crew brief surfaces in its output so user sees stop signal at session
start.

Phase-gate includes in retrospective body so post-phase planning sees it.

## Forcing past warn alerts

Pass `ignoreAlerts: true` (programmatic only — not a CLI flag) when the
user explicitly accepts known-poor signal and wants to roll the next
slice anyway.
