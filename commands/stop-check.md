---
description: Unified stop-condition resolver — should the autonomous loop halt now? Returns reasons + blockers + suggestions.
---

# Stop Check

Returns whether the autonomous loop has reached a stop condition:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" stop-check \
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
    "Author a new SPEC or FEAT to continue. Run /loop:spec add or /loop:backlog add."
  ],
  "snapshot": { "pendingOrTriaged": 0, "inProgress": 0, "approvedUndecomposed": 0, "totalAlerts": 2, "warnAlerts": 2 }
}
```

## Stop conditions

`loop.marathonMode` in `.claude/loop.json` (default `true` — "auto mode" in docs) controls which triggers gate vs. inform.

| Condition | Trigger | auto mode (default) | legacy (marathonMode=false) |
|---|---|---|---|
| Backlog exhausted | No pending/triaged/in-progress features AND no approved-undecomposed specs | halt | halt |
| Crew `escalated_to_human` | Crew workflow flagged for human attention | halt | halt |
| Warn pattern alerts | Any pattern alert with `severity: warn` (score-trend regression, in-progress orphan, decomposition explosion) | halt | halt |
| High-severity cost alerts | `loop.costStopThreshold` reached across last 3 slices | halt | halt |
| Iteration cap | `iteration.count >= loop.maxIterations` (default 25) | advisory | halt |
| Crew soft `blocked` badge | Crew workflow blocked waiting on artifact/badge | advisory | halt |

`shouldStop: true` when any gating trigger fires. Snapshot still reports `iterationCount`, `iterationCap`, `crewBlocked`, and `marathonMode` even when the iteration cap or blocked badge is advisory.

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

## Forcing legacy bounded iteration

Set `loop.marathonMode: false` in `.claude/loop.json` to re-enable
gating on the iteration cap and crew `blocked` badge. Legacy mode is
useful when a repo needs guaranteed bounded token spend or strict
crew-gate enforcement per run.
