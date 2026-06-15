---
title: Loop + Runner JSONL Adoption — Design
date: 2026-06-15
status: draft
scope: cross-repo (loop + runner)
related_repos:
  - C:\work\mega\loop
  - C:\work\mega\runner
---

# Loop + Runner JSONL Adoption

## Goal

Adopt the loop plugin's JSONL emission surface as the runner dashboard's
primary data source. Add new v2 pages and API endpoints in runner that
consume JSONL streams via webhook + filesystem-resync. Cover loop
emission gaps (specialist_pause, tool_calls, dispatch_latency, shape,
phase-gate, wave members, worktree lifecycle, grades mirror). Validate
in shadow mode. Decommission Markdown reading on the runner side.

Strict isolation rule: existing v1 endpoints and pages are not modified
until the decommission milestone. New surface lives under `/api/v2/...`
and `src/frontend/dashboard/src/v2/...`.

## Why

The loop plugin already emits dense JSONL telemetry the runner does not
consume. Runner today parses Markdown frontmatter for grades and walks
git log for backlog flow. This is fragile (no cache TODOs at
`GradeDimensionsHandler.cs:48` and `BacklogFlowHandler.cs:41`), loses
revision information (FEAT-165 dedup bug), and provides zero coverage
for wave mode, halt badges, role-agent cost, agent timing, and live
in-flight slice state.

JSONL adoption unlocks:

- Live slice + wave timelines (target ≤2s emit → render)
- Wave-mode dashboard (currently absent)
- Halt-badge hazard timeline
- Role-agent (PM, architect, spec-writer) isolated cost
- Reviewer ladder timing + tool-call distribution per agent
- Specialist-pause rate tracking (recurring SOP issue)
- Marathon checkpoint pressure gauge
- Backlog state change events (replaces git-log walk)
- Decisions + learnings feeds

## Decisions (locked from brainstorm)

| Decision | Choice |
|---|---|
| Storage | Mirror to Postgres |
| Realtime | Webhook ingest + SignalR fan-out |
| Wave UI v1 | Full (list + detail + gantt + halt-reason chart) |
| Loop emission gaps | All four bundles in scope |
| Decommission criteria | Shadow-mode validation (14 consecutive days zero drift) |
| Cross-repo execution | Independent waves per repo, orchestrated from session |
| Auth | Per-app Bearer token |
| Approach shape | Parallel rails (each milestone touches both repos) |

## Architecture

```
┌─ loop repo (Bun/TS) ──────────────────────────┐         ┌─ runner repo (.NET 10 + React) ─┐
│                                                │         │                                  │
│  events.jsonl emitters ──┐                     │         │   POST /api/v2/ingest/loop-events
│  grades.jsonl mirror ────┤                     │  HTTPS  │      ↓ Bearer verify             │
│  auto-dispatch.jsonl ────┼──► webhook-sender   ├────────►│   IngestDispatcher (Worker)      │
│  wave events.jsonl ──────┤   (event-notifier   │ Bearer  │      ↓ route by event.kind       │
│  stop-check snapshot ────┘    new transport)   │         │   Per-stream handlers            │
│                                                │         │      ↓ idempotent upsert         │
│  filesystem fallback ──► loop-resync watcher   │         │   New Postgres tables            │
│                                                │ filesync│   (LoopEvent, AgentRun,          │
│                                                │  (poll) │    WaveRun, GradeRecord,         │
│                                                ◄─────────┤    HaltBadge, DispatchTrace)     │
│                                                │         │      ↓                           │
└────────────────────────────────────────────────┘         │   SignalR hub /hubs/loop-events  │
                                                            │      ↓                          │
                                                            │   React v2 pages (new routes)   │
                                                            └──────────────────────────────────┘
```

### Principles

- **Dual-write safety.** Loop always writes JSONL to disk. Webhook is
  best-effort. Runner worker periodically resyncs missing events from
  filesystem (existing `CrewIngestionService` extended).
- **Strict v1 isolation.** New API under `/api/v2/...`. Existing
  `/api/v1/crew-monitor` endpoints + Markdown handlers untouched until
  decommission milestone.
- **Idempotent ingest.** Every event carries `(source_path,
  line_offset)` or a natural composite key. Upsert on conflict.
- **Per-stream handlers.** One handler class per JSONL stream — no
  god-handler.
- **Shadow validation job.** Background worker diffs JSONL-derived
  state vs Markdown-derived state per slice. Persists deltas. Closes
  cutover gate when N consecutive runs hit zero drift.

## Components

### Loop side

| Module | Status | Purpose |
|---|---|---|
| `src/scripts/lib/webhook-sender.mts` | new | Bearer transport for `event-notifier.mts`. Retry-once, 5xx falls back to filesystem-resync. |
| `src/scripts/lib/grade-jsonl-writer.mts` | new | Append-only writer for `.claude/artifacts/loop/grades.jsonl`. One row per grade event: `{ts, sliceId, feature, spec, recordedAt, scores: {dim: float}, decisions: [{id, status, body}], timing, shape}`. Called from `slice-grade-write` after Markdown write. |
| `src/scripts/lib/event-emitter-dispatch.mts` | refactor | Central tap: every JSONL append also calls `webhook-sender` if `loop.notifications.webhook.url` configured. |
| `slice-events.mts` | add events | `specialist_pause`, `shape_classified`, `phase_gate_mode_detected`, `agent_completed.toolCalls`, `agent_dispatched.dispatchedAt`, `first_output_at`, `backlog_state_changed`. |
| `wave/events.mts` | add events | `wave_member_slice`, `worktree_cleaned`, `merge_conflict_detail`. |
| `schemas/loop-events/*.schema.json` | new | Versioned JSON Schemas pinned by both repos. CI validates emissions against schema. |

### Runner side

| Component | Status | Purpose |
|---|---|---|
| `AstraRunner.Api/Controllers/IngestController.cs` | new | `POST /api/v2/ingest/loop-events`. Bearer verify, batch enqueue, 202. |
| `AstraRunner.Worker/Ingest/LoopEventDispatcher.cs` | new | Routes batch by `event.kind` to per-stream handler. Idempotent upsert. Fires SignalR post-commit. |
| Per-stream handlers (`AstraRunner.Application/Ingest/Handlers/`) | new | `SliceEventHandler`, `WaveEventHandler`, `GradeJsonlHandler`, `AutoDispatchHandler`, `DispatchTraceHandler`, `HaltBadgeHandler`, `LearningHandler`, `BacklogStateHandler`. |
| `AstraRunner.Domain/Loop/` entities | new | `LoopEvent`, `SliceWorkflowEvent`, `AgentRun`, `WaveRun`, `WaveMember`, `WaveWorktreeOutcome`, `GradeRecord`, `HaltBadge`, `DispatchTrace`, `WorktreeAllocation`, `BacklogFlow`, `IngestDriftReport`. |
| `AstraRunner.Api/Hubs/LoopEventsHub.cs` | new | SignalR hub. Per-app, per-slice, per-wave groups. |
| `src/frontend/dashboard/src/v2/` | new | `SliceLiveDetail`, `SliceList`, `WaveList`, `WaveDetail`, `WaveGantt`, `AgentPerformance`, `RoleAgentCost`, `HaltBadges`, `Decisions`, `Learnings`, `IngestDrift` pages. |
| `AstraRunner.Worker/Shadow/ShadowDiffJob.cs` | new | Hourly. Derives state from JSONL tables, compares to Markdown-derived, persists `IngestDriftReport`. Drives cutover gate. |

## Data flow

### Live path

1. Loop emits event (example: `agent_completed` in builder).
   - Appends to `.claude/artifacts/loop/trajectories/SLICE-N-events.jsonl`.
   - Calls `webhook-sender.send({tenantId, appId, kind, payload, sourcePath, lineOffset})`.
2. Runner ingest endpoint:
   - Bearer verify → tenant resolve.
   - `IngestQueue.Enqueue` (in-memory channel) → 202.
   - Worker: `LoopEventDispatcher` routes to `SliceEventHandler`.
   - Upsert `SliceWorkflowEvent` + `AgentRun`.
   - `LoopEventsHub.Clients.Group("app:{appId}:slice:{sliceId}").Notify(event)`.
3. Browser (`SliceLiveDetail.tsx`):
   - SignalR subscribed to group on mount.
   - Appends event to local store, re-renders timeline.

Latency target: ≤2s emit → UI render.

### Filesystem-resync fallback

Worker scans `.claude/artifacts/loop/**/*.jsonl` per app on schedule.
Reads `(source_path, line_offset)` watermark from DB. Tails unread
lines. Pushes through same `LoopEventDispatcher`. Covers webhook drops,
runner downtime, post-migration replay.

### Idempotency

Composite key per stream:

- slice events: `(appId, sliceId, ts, kind)`
- agent runs: `(appId, sliceId, agent, dispatchedAt)`
- waves: `(appId, waveId)`
- grades: `(appId, sliceId, recordedAt)`
- halt badges: `(appId, sliceId|waveId, badgeKind, ts)`

Conflict → upsert latest. Replay-safe.

### Shadow validation

Hourly job. For each slice in window: derive `jsonlState` from
`GradeRecord` + `AgentRun` + `SliceWorkflowEvent`; derive `mdState`
from existing `GradeDimensionsHandler` path (untouched); diff; upsert
`IngestDriftReport`. Tracks `zero_drift_streak` metric.

Cutover gate: `zero_drift_streak >= 14` AND zero drift rows for grade,
slice workflow, agent runs, wave outcomes, backlog flow AND
`ingestLagSeconds < 30s` p95 over same window.

## Error handling

### Loop

| Failure | Behavior |
|---|---|
| Webhook 5xx / network | Log `auto-dispatch.jsonl` with `ok: false`. Continue. JSONL on disk is authoritative — resync covers it. |
| Webhook 401/403 | Disable webhook for session. Surface `webhook_auth_failed` halt-badge on next snapshot. |
| Webhook 429 | In-process backoff (1s/2s/4s, cap 3). Give up to filesystem-resync. |
| Loop cannot reach runner | No-op. Dual-write to disk continues. |
| Malformed JSONL line | Skip line, log `jsonl_parse_error`. Operator runs `/loop:validate-jsonl`. |

### Runner

| Failure | Behavior |
|---|---|
| Schema mismatch | 422 + structured error. No retry. Drift surfaces in `IngestDriftReport`. |
| Bad bearer | 401, no body, no DB write. |
| Tenant resolution fail | 404. |
| Unknown event kind | Persist envelope `LoopEvent` raw_payload. Skip typed handler. Emit `unknown_kind_count` metric. |
| Idempotent upsert race | DB unique-constraint catches. Handler treats as success. |
| SignalR notify fails post-commit | Swallow. Frontend re-fetches on reconnect. |
| Worker crash mid-batch | Watermark-based replay from disk. No event loss. |
| Shadow-diff drift found | Persist drift report. No auto-flip. Operator reviews. Reset `zero_drift_streak`. |

### Operator escape valves

- `POST /api/v2/ingest/resync?appId=...&since=...` — force filesystem re-scan from timestamp.
- `POST /api/v2/ingest/replay?appId=...&sliceId=...` — replay single slice from disk through full handler chain.
- `loop.json` flag `notifications.webhook.disabled: true` — kill switch on loop side.

## Testing

### Loop (Bun)

- `webhook-sender.test.mts` — Bearer construction, 5xx retry, 401 disable, 429 backoff.
- `grade-jsonl-writer.test.mts` — One row per grade event with `scores` map + `decisions` array; idempotent on re-grade (same `recordedAt`).
- `slice-events-new-fields.test.mts` — `specialist_pause`, `shape_classified`, `phase_gate_mode_detected`, `tool_calls`, `dispatched_at`, `first_output_at` present.
- `wave-events-new.test.mts` — `wave_member_slice`, `worktree_cleaned`, `merge_conflict_detail` emitted at correct lifecycle points.
- `event-emitter-dispatch.test.mts` — Every JSONL append fans out to webhook-sender exactly once when configured.
- `event-notifier-integration.test.mts` — End-to-end: emit → JSONL write + webhook called.

### Runner (.NET)

Unit:

- `IngestControllerTests` — Bearer pass/fail, tenant resolve, 202 on accept, 422 on schema mismatch.
- `LoopEventDispatcherTests` — Routes each kind to correct handler; unknown kind goes to raw store.
- `SliceEventHandlerTests` — Idempotent upsert (same key twice = one row), workflow_state transitions persist.
- `WaveEventHandlerTests` — Wave lifecycle persists with member rosters + halt reason.
- `GradeJsonlHandlerTests` — Verifies FEAT-165 dedup case using natural composite key.
- `HaltBadgeHandlerTests` — Snapshot fields map to typed columns.
- `ShadowDiffJobTests` — Detects drift between Markdown + JSONL-derived state.
- `WatermarkResyncTests` — Worker resumes from `(source_path, line_offset)` watermark; no duplicates after crash.

Integration:

- `IngestE2ETests` — Real Postgres (Testcontainers): POST sample payload → assert DB rows + SignalR notification fired (in-memory hub).
- `FilesystemResyncE2E` — Drop JSONL into temp dir, run watcher, assert handlers ran.
- `ShadowParityE2E` — Seed both Markdown grade + JSONL event for same slice, ShadowDiffJob writes zero-drift row.
- `WaveGanttE2E` — Multi-worktree wave fixture → assert wave detail API returns correct slice spans.

Frontend (Vitest + RTL):

- `SliceLiveDetail.test.tsx` — Subscribes SignalR group on mount, renders incoming event, unsubscribes on unmount.
- `WaveDetail.test.tsx` — Gantt renders from API fixture; halt-reason badge matches.
- `AgentPerformance.test.tsx` — Boxplot bins agents by name; reviewer ladder split correct.
- `IngestDrift.test.tsx` — Empty drift = green; non-empty = red with slice list.

### Cross-repo contract test

`schemas/loop-events/*.schema.json` versioned and pinned in both repos
(vendored copy or submodule). CI in both repos validates:

- Loop: every appended JSONL line validates against pinned schema.
- Runner: ingest endpoint rejects payloads that fail schema.

Drift detected at PR time, not in production.

### Cutover acceptance

- 14 consecutive days `zero_drift_streak` for grades, slice workflow, agent runs, wave outcomes, backlog flow.
- `ingestLagSeconds < 30s` p95 over same window.
- All v2 pages reach feature parity with v1 equivalents.

## Milestones (parallel rails)

Each milestone = paired loop + runner FEAT bundle. Loop wave runs in
`C:\work\mega\loop`; runner wave runs in `C:\work\mega\runner`. M(N+1)
starts when M(N) loop emits the schema and runner ingests it green.

### M0 — Foundations

**Loop FEATs (3):**

- L0-1: webhook-sender module + retry/auth.
- L0-2: `loop.json` config schema (tenantId, appId, bearer, url).
- L0-3: JSONL event schemas under `schemas/loop-events/` (versioned).

**Runner FEATs (5):**

- R0-1: `/api/v2` namespace scaffold + IngestController shell.
- R0-2: Bearer auth filter + per-app token entity + token mgmt endpoint.
- R0-3: `loop_*` EF schema migration baseline (LoopEvent envelope only).
- R0-4: SignalR hub scaffold + group routing.
- R0-5: v2 frontend router stub + empty page shells.

### M1 — Slice lifecycle live

**Loop FEATs (2):**

- L1-1: Wire slice-events.jsonl + loop.jsonl appends through webhook-sender.
- L1-2: grades.jsonl writer at slice-grade-write.

**Runner FEATs (5):**

- R1-1: SliceWorkflowEvent + AgentRun entities + migrations.
- R1-2: GradeRecord entity + migrations.
- R1-3: SliceEventHandler + GradeJsonlHandler.
- R1-4: SliceLiveDetail page (SignalR-fed).
- R1-5: SliceList v2 page (JSONL-derived).

### M2 — Wave surface

**Loop FEATs (3):**

- L2-1: wave_member_slice event.
- L2-2: worktree_cleaned + merge_conflict_detail events.
- L2-3: Wire waves/*/events.jsonl + waves/index.json through webhook.

**Runner FEATs (5):**

- R2-1: WaveRun + WaveMember + WaveWorktreeOutcome entities.
- R2-2: WaveEventHandler + index.json sync handler.
- R2-3: WaveList page.
- R2-4: WaveDetail page (halt-reason donut, pivot list).
- R2-5: Wave gantt component.

### M3 — Cost + agent perf

**Loop FEATs (2):**

- L3-1: tool_calls + dispatched_at + first_output_at on agent_completed.
- L3-2: Wire auto-dispatch.jsonl through webhook.

**Runner FEATs (4):**

- R3-1: AgentRun timing columns + AutoDispatchHandler.
- R3-2: AgentPerformance page (boxplot, reviewer ladder span, tool-call distribution).
- R3-3: RoleAgentCost page (PM/architect/spec-writer isolated cost).
- R3-4: Reviewer ladder Sankey chart.

### M4 — Ops hazard

**Loop FEATs (2):**

- L4-1: specialist_pause event + detector.
- L4-2: Emit stop-check snapshot per evaluation through webhook.

**Runner FEATs (3):**

- R4-1: HaltBadge entity + HaltBadgeHandler.
- R4-2: Ops/HaltBadges hazard timeline page.
- R4-3: Marathon checkpoint gauge component.

### M5 — Shape/phase-gate + decisions/learnings + backlog

**Loop FEATs (3):**

- L5-1: shape_classified event at slice_start.
- L5-2: phase_gate_mode_detected event at validator.
- L5-3: backlog_state_changed event (pending→triaged→in-progress→done).

**Runner FEATs (4):**

- R5-1: BacklogStateHandler + BacklogFlow entity (JSONL-derived).
- R5-2: LearningHandler + Learnings feed page.
- R5-3: Decisions feed page (DEC-* sourced from grades.jsonl `decisions` array on each grade event).
- R5-4: Slice shape + phase-gate-mode chips on SliceLiveDetail.

### M6 — Shadow validation

**Loop:** no new FEATs.

**Runner FEATs (3):**

- R6-1: IngestDriftReport entity + migrations.
- R6-2: ShadowDiffJob hourly (grades, slice workflow, agent runs, wave outcomes, backlog flow).
- R6-3: IngestDrift dashboard + `/api/v2/ingest/health` endpoint with zero_drift_streak + ingestLagSeconds.

### M7 — MD decommission gate

**Loop:** no FEATs.

**Runner FEATs (3):**

- R7-1: Feature flag `useJsonlForReads` per-app.
- R7-2: Flip handlers that previously parsed Markdown to read JSONL-mirror tables (e.g. `GradeDimensionsHandler` reads `GradeRecord` instead of CrewArtifact frontmatter; `BacklogFlowHandler` reads `BacklogFlow` instead of git log).
- R7-3: Archive shadow job + finalize decommission audit.

**Decision deferred at M7 start:** retire v1 endpoints entirely vs keep
v1 routes alive backed by JSONL-mirror data. Either way no Markdown
parsing remains in the runner code path.

### Totals

- Loop FEATs: 17 across M0–M5
- Runner FEATs: 32 across M0–M7
- Waves: 8 milestones × 2 repos = up to 16 wave runs (loop side empty in M6 + M7)

## Out of scope

- Modifying any existing v1 endpoint, page, or handler (until M7
  decommission).
- Removing the existing Markdown grade format — `slice-grade-write`
  continues writing Markdown grade files; `grades.jsonl` mirrors them.
- Multi-tenant routing changes beyond per-app Bearer.
- Cross-repo supervisor primitive (rejected during brainstorm).
- mTLS / certificate auth (rejected during brainstorm).
- Migrating already-stored historical Markdown grades to the new
  `GradeRecord` table — only new emissions populate the JSONL stream.
  Historical backfill is a separate follow-up if needed.

## Open questions (resolved during brainstorm)

All clarifying questions resolved. No deferred decisions.

## References

- Loop emission inventory: investigator agent ae15f59c966a1d2c8 (run 2026-06-15)
- Runner dashboard + API inventory: investigator agent a7e3319e98758d994 (run 2026-06-15)
- Halt-badge registry: `C:\work\mega\loop\docs\halt-badges.md`
- Wave-mode design: `C:\work\mega\loop\docs\superpowers\specs\2026-06-14-wave-mode-loop-design.md`
- Runner crew monitor controller: `C:\work\mega\runner\AstraRunner.Api\Controllers\CrewMonitorController.cs`
- Runner grade parser: `C:\work\mega\runner\AstraRunner.Application\...\GradeDimensionsHandler.cs`
- Runner backlog parser: `C:\work\mega\runner\AstraRunner.Application\...\BacklogFlowHandler.cs`
