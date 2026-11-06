---
name: brief
description: Fixed-structure situational report combining workflow state (crew brief-me), backlog/specs/grades (loop brief), and install health (loop status) into one briefing.
auto_execute_steps: false
---

# Brief

This is the preferred user-facing "where are we?" command. Use it when the
user wants a fast, structured briefing before continuing work — it folds
together three prior separate reports (crew `brief-me`, loop `brief`, loop
`status`) into one.

Workflow:

1. Verify the current workspace path with `pwd`.
2. Sync remote state so the briefing reflects reality, not stale local refs:
   - `git fetch --prune`
3. Run the underlying reports:
   - `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" brief-me --repo "$PWD"` — workflow-state / artifact-trail briefing.
   - `bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" brief --repo "$PWD"` — backlog, specs, grades, decisions, pattern alerts.
   - `bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" status --repo "$PWD"` — loop install health (preset, resolved paths, marker presence, crew dependency).
4. Explicitly compare each report's `repoPath` (or equivalent) with the current working directory. If any do not match, stop and treat the briefing as invalid for this run.
5. If they match, present the briefing in this fixed order:
   - `Current Objective`
   - `Recent Activity`
   - `In Progress`
   - `Run Health` — only if the crew report's `runHealth` field is non-null. Render as a one-line summary: `Run health: <runHealth value>`.
   - `Install Health` — only if the loop `status` report shows `hasMarkerBlock: false`, `crewCli: null`, or any scaffold path missing. Otherwise omit this section entirely — a healthy install should not clutter the briefing. When shown, report `preset`, the resolved paths, and which check failed, then recommend `/devcrew:install`.
   - `Blocked / Missing`
   - `Important Reminders`
   - `Autonomous Loop` — only if the loop `brief` report's data is non-null. Render: backlog counts by state (pending, triaged, in_progress, done), top-priority triaged features (next to slice), in-flight features with linked slices, specs awaiting decomposition, last 5 grade averages + per-dimension snapshot if any are below 0.80, decision tallies (total, accepted, superseded, reverted), pattern alerts, and the last 10 telemetry events.
   - `Recent Costs (last 5)` — when cost data is available, as a Markdown table with columns `Slice | Duration | Msgs | Total (M) | I/O (M) | Cache R/W (M) | Cache hit | Dominant model`, sourced from each entry's `runTitle`, `durationMin`+"m", `messages`, `totalMillions`, `ioMillionsStr`, `cacheRWMillionsStr`, `cacheHitPct`+"%", `dominantModelStr`. Do not surface USD in the row. When a cost entry's `modelMix` array has more than one entry, render the `Dominant model` cell as a compact multi-model list (`model: msgPct% / $usd`, separated by ` · `) instead of the single `dominantModelStr`.
   - `Cost Diagnostics` — when diagnostics data is non-empty, immediately after Recent Costs, with columns `Slice | Calls | Fails | %Fail | Compact | Subag | Reread | p90 (b) | Preamble | Skills | Sessions | Flags`, sourced from each entry's `toolCalls`, `toolFailures`, `toolFailureRate`+"%", `compactionCount`, `subagentDispatches`, `fileReReadCount`, `toolResultP90`, `turnsBeforeFirstTool`, `skillInvocations`, `sessionsScanned`, `flagsStr`. Skip this table when diagnostics is empty.
   - `Model Burn (last N)` — when `modelBurn` has more than one entry, render after diagnostics with columns `Model | Slices | Messages | USD`, sourced from each entry's `model`, `slices`, `messages`, `usd`. Use it to surface "where the money went" across recent slices.
   - `Recommended Next Step`
   - `Secondary Options`
6. Keep the report concise, concrete, and evidence-backed.
7. Use the git activity, artifact trail, workflow state, and repo memory to produce one clear next-step recommendation.
8. In `Recent Activity`, include the most relevant repo-memory starting points or retrieval hints, not just git or artifact counts.

## Pattern alerts (loop brief)

Triggered by `detectPatterns()`:

| Alert | Trigger |
|---|---|
| `score-trend` | Dimension < 0.80 across last 3 slices — suggest SPEC type=sre |
| `decomposition` | Feature has ≥3 linked slices — review scope |
| `spec-flow` | Spec approved but undecomposed |
| `backlog-flow` | ≥10 features pending triage |
| `in-progress-orphan` | Feature in-progress without a linked slice |

Each alert has `severity`, `category`, `message`, `suggested_action`.

## Why one command

Previously `/crew:brief-me` (workflow state), `/runner:brief` (backlog,
specs, grades, decisions, alerts), and `/runner:status` (loop install
health) were three separate reports a session had to run in sequence to get
the full picture. `/devcrew:brief` runs all three and folds them into one
fixed-order briefing so "where are we?" is a single call. If `hasMarkerBlock`
is false or a scaffold path is missing, the `Install Health` section
recommends `/devcrew:install` instead of requiring a separate status check
first.

The point is not to dump raw JSON. The point is to give the user a calm,
situational briefing with the most relevant status and one concrete
recommendation.
</content>
