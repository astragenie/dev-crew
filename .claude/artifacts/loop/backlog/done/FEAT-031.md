---
id: FEAT-031
status: done
priority: P2
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-28]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-28]
completed_at: 2026-06-04
github_issue: 65
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/65"
---
## Symptom

18 of 31 `.claude/artifacts/crew/agents/*` reports have `agent_count: 0`, `total_turns: 0`, `total_duration_ms: 0` despite verified subagent dispatches during those slices. Most recent affected: SLICE-24, SLICE-25, SLICE-26, SLICE-27.

## Evidence

- `scripts/lib/slice-linker/agent-report-writer.mjs::pairAgentEvents` iterates `stopPayloads` and emits one pair per stop. Starts without matching stops are dropped silently.
- `events.jsonl` global counts: 114 starts vs 210 stops — but slice-24 onward shows `subagent_start` events with NO matching `subagent_stop` in the slice window. Last stop in tail at 2026-06-04T14:03:59Z; starts at 14:14:25, 14:23:59, 14:35:06, 14:50:22 all unpaired.
- SLICE-23 (last working report): had paired stop at 13:53:37Z, report shows agent_count: 1 / 66 turns.

## Root cause hypothesis

Two concurrent issues:

1. **Stop-hook silent regression** — after ~14:04Z, `subagent_stop` events stop being appended to `events.jsonl`. Either the hook is not firing or the writer queue is buffered past slice complete. Investigate `.claude/settings.json` hook config + SubagentStop handler.
2. **Writer over-relies on STOP events** — `pairAgentEvents` keys on stops. When stops are missing/late, agent_count goes to zero. Writer should fall back to counting unique `agent_id` from start payloads, with duration/turns omitted (or marked "in-flight") when stop hasn't arrived.

## Suggested slices

- **SLICE-A** — diagnose + fix stop-hook regression. Repro: dispatch builder, watch events.jsonl tail for subagent_stop append.
- **SLICE-B** — harden writer: count agents by start payload, mark stop-less entries explicitly. Adds resilience.

## Out of scope

- Backfilling historical zero reports.
- Refactoring agent-report-writer beyond start-fallback.

## Acceptance

- Stop-hook fires reliably (10/10 dispatches → events.jsonl appended within 30s of subagent finish).
- Writer emits non-zero counts for confirmed dispatches even when stop event is delayed.
- Test: writeAgentReport unit test covers "start without stop" → reports agent with stopTs: null, duration: n/a.

## Affects files

- scripts/lib/slice-linker/agent-report-writer.mjs
- src/scripts/lib/slice-linker/agent-report-writer.mts
- .claude/hooks/* (stop-event capture)
