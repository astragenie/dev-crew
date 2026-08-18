# M2 — Wave Surface (Runner Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up the runner-side consumer for wave events. Persist `WaveRun`, `WaveMember`, `WaveWorktreeOutcome` rows. Maintain a rolling `WaveIndexEntry` table (latest 50). Add `WaveEventHandler` + `WaveIndexSyncHandler` to the M1 dispatcher. Build v2 `WavesController` + `WaveList` page + `WaveDetail` page (halt-reason donut, pivot list, gantt component). Strict v1 isolation.

**Architecture:** Same shape as M1 — entities + EF migration + handler + dispatcher registration + API + frontend pages. Wave events flow: webhook → IngestController → IIngestQueue → IngestDispatcherWorker → LoopEventDispatcher → `WaveEventHandler` (for `wave.*` kinds, excluding `wave.index_updated`) → persists WaveRun + WaveMember + WaveWorktreeOutcome rows → notifier fans out to `app:{appId}:wave:{waveId}` SignalR group. `wave.index_updated` routes to a dedicated `WaveIndexSyncHandler` that overwrites the rolling `WaveIndexEntry` table (idempotent on `(AppId, WaveId)`).

**Tech Stack:** .NET 10, EF Core 10, PostgreSQL 17, SignalR, xUnit + FluentAssertions + NSubstitute + Testcontainers.PostgreSql, React 19 + Vite + TypeScript, `@microsoft/signalr`, `recharts` (already in repo for v1 charts — reuse for donut + gantt).

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M2, Runner FEATs R2-1, R2-2, R2-3, R2-4, R2-5).

**Wave-run target:** `C:\work\mega\runner`. Commit on main per user preference.

---

## File Structure

### Domain entities + interfaces

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/WaveRun.cs` | new | `{Id, TenantId, AppId, WaveId, StartedAt, FinalizedAt?, CompletedAt?, Status (running/passed/failed/halted), HaltReason?, Size?, RejectedCount?, PassCount?, FailCount?, DurationMs?, PostMergeTestStatus? (PASS/FAIL/skipped), RawJson, ReceivedAt}`. Private setters + `Create` factory + `Update*` state mutators. |
| `src/AstraRunner.Domain/Loop/WaveMember.cs` | new | `{Id, TenantId, AppId, WaveId, SliceId, Position, JoinedAt, RawJson, ReceivedAt}`. Unique on `(AppId, WaveId, SliceId)`. |
| `src/AstraRunner.Domain/Loop/WaveWorktreeOutcome.cs` | new | `{Id, TenantId, AppId, WaveId, SliceId, Branch?, Path?, OutcomeKind (worktree_cleaned/merge_conflict_detail), Status?, ConflictedPathsJson?, BaseSha?, HeadSha?, Ts, RawJson, ReceivedAt}`. Captures both worktree_cleaned and merge_conflict_detail events on the same table. |
| `src/AstraRunner.Domain/Loop/WaveIndexEntry.cs` | new | `{AppId, WaveId, Size, PassCount, FailCount, PostMergeTestStatus?, DurationMs?, RecordedAt}`. Composite PK `(AppId, WaveId)`. Rolling rolling-50 maintained by sync handler. |
| `src/AstraRunner.Domain/Loop/Interfaces/IWaveRunRepository.cs` | new | Upsert, GetByWaveId, ListByAppSince, UpdateOnLifecycle. |
| `src/AstraRunner.Domain/Loop/Interfaces/IWaveMemberRepository.cs` | new | Upsert (idempotent on unique key), ListByWave. |
| `src/AstraRunner.Domain/Loop/Interfaces/IWaveWorktreeOutcomeRepository.cs` | new | Append (always insert — outcomes don't dedupe), ListByWave. |
| `src/AstraRunner.Domain/Loop/Interfaces/IWaveIndexEntryRepository.cs` | new | UpsertBatch (replaces the rolling rolling-50), ListByApp. |

### Infrastructure (EF + repos + migration)

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/WaveRunConfiguration.cs` | new | Table `wave_runs`. PK Id. Unique `(AppId, WaveId)`. Indexes `(AppId, StartedAt)`, `(AppId, Status)`. |
| `.../WaveMemberConfiguration.cs` | new | Table `wave_members`. Unique `(AppId, WaveId, SliceId)`. Index `(AppId, WaveId)`. |
| `.../WaveWorktreeOutcomeConfiguration.cs` | new | Table `wave_worktree_outcomes`. PK Id. Index `(AppId, WaveId, Ts)`. |
| `.../WaveIndexEntryConfiguration.cs` | new | Table `wave_index_entries`. Composite PK `(AppId, WaveId)`. Index `(AppId, RecordedAt DESC)`. |
| `src/AstraRunner.Infrastructure/Loop/WaveRunRepository.cs` | new | EF impl. |
| `.../WaveMemberRepository.cs` | new | EF impl. |
| `.../WaveWorktreeOutcomeRepository.cs` | new | EF impl. |
| `.../WaveIndexEntryRepository.cs` | new | EF impl — `UpsertBatch` overwrites entries by composite key in a single transaction. |
| `src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs` | modify | Add 4 `DbSet<>`. |
| `src/AstraRunner.Infrastructure/DependencyInjection.cs` | modify | Register 4 repositories Scoped. |
| `src/AstraRunner.Infrastructure/Migrations/<ts>_AddWaveSurface.cs` | new | EF migration. |

### Application (handlers)

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Application/Loop/Ingest/WaveEventHandler.cs` | new | Implements `ILoopEventHandler`. `CanHandle(kind)`: returns `kind.StartsWith("wave.")` AND `kind != "wave.index_updated"`. Routes by kind: `wave.wave_started` → create WaveRun running; `wave.plan_built` → update size + rejectedCount; `wave.wave_dispatched` → annotate with runId; `wave.wave_member_slice` → upsert WaveMember; `wave.wave_finalized` → update finalizedAt + merged/conflicts/failed counts; `wave.post_merge_test` → update PostMergeTestStatus; `wave.wave_pivoted` → log pivots (append to WaveWorktreeOutcome with OutcomeKind="pivot"); `wave.wave_completed` → update completedAt + status + haltReason + duration; `wave.worktree_cleaned` + `wave.merge_conflict_detail` → append WaveWorktreeOutcome. After persist, calls `ILoopEventsNotifier.NotifyWaveAsync`. |
| `src/AstraRunner.Application/Loop/Ingest/WaveIndexSyncHandler.cs` | new | Implements `ILoopEventHandler`. `CanHandle(kind)`: returns `kind == "wave.index_updated"`. Parses `payload.index` array, calls `IWaveIndexEntryRepository.UpsertBatch`. Notifies app-level group. |
| Dispatcher registration (Worker `Program.cs`) | modify | Register both new handlers as `ILoopEventHandler` in DI. The existing `LoopEventDispatcher` already picks them up via `IEnumerable<ILoopEventHandler>`. |

### API + frontend

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Api/Controllers/V2/WavesController.cs` | new | `GET /api/v2/apps/{appId}/waves` paginated list (joins WaveRun + last index entry). `GET /api/v2/apps/{appId}/waves/{waveId}` detail (members + outcomes + halt reason). Clerk JWT auth. |
| `src/frontend/dashboard/src/v2/pages/WaveList.tsx` | modify | Replace M0 placeholder. Table: waveId, started, status, size, pass/fail, halt reason. Click → `/v2/waves/:waveId`. |
| `src/frontend/dashboard/src/v2/pages/WaveDetail.tsx` | modify | Replace M0 placeholder. Header: status, haltReason, duration. Halt-reason donut (recharts `PieChart` with two slices: pass vs fail vs pivoted). Pivot list. Wave gantt: rows = member slices, x-axis = time, bars = slice workflow lifespan. Live SignalR subscription to `app:{appId}:wave:{waveId}`. |
| `src/frontend/dashboard/src/v2/components/WaveGantt.tsx` | new | Recharts horizontal bar chart with custom time-axis. Inputs: array of `{ sliceId, dispatchedAt, completedAt?, status }`. |
| `src/frontend/dashboard/src/v2/components/HaltReasonDonut.tsx` | new | Recharts `PieChart`. Inputs: counts `{ passed, failed, conflict, pivoted }`. |
| `src/frontend/dashboard/src/v2/lib/api-client.ts` | modify | Add `getWaves`, `getWaveDetail` typed methods. |
| `src/frontend/dashboard/src/v2/lib/signalr-client.ts` | modify | Add `subscribeWave(connection, appId, waveId, onEvent)` helper. |

### Tests

| Path | Status |
|---|---|
| `tests/AstraRunner.Tests/Unit/Loop/WaveEventHandlerTests.cs` | new — 7 tests (one per kind transition) |
| `tests/AstraRunner.Tests/Unit/Loop/WaveIndexSyncHandlerTests.cs` | new — 2 tests (upsert + notifier) |
| `tests/AstraRunner.Tests/Integration/Loop/WaveRunRepositoryTests.cs` | new — 4 tests |
| `tests/AstraRunner.Tests/Integration/Loop/WaveMemberRepositoryTests.cs` | new — 3 tests |
| `tests/AstraRunner.Tests/Integration/Loop/WaveWorktreeOutcomeRepositoryTests.cs` | new — 3 tests |
| `tests/AstraRunner.Tests/Integration/Loop/WaveIndexEntryRepositoryTests.cs` | new — 3 tests |
| `tests/AstraRunner.Tests/Integration/Api/V2/WavesControllerTests.cs` | new — 4 tests (list, detail, empty, cross-tenant) |
| `src/frontend/dashboard/src/v2/pages/__tests__/WaveList.test.tsx` | new — 3 tests |
| `src/frontend/dashboard/src/v2/pages/__tests__/WaveDetail.test.tsx` | new — 3 tests |
| `src/frontend/dashboard/src/v2/components/__tests__/WaveGantt.test.tsx` | new — 2 tests |
| `src/frontend/dashboard/src/v2/components/__tests__/HaltReasonDonut.test.tsx` | new — 2 tests |

---

### Task 1: 4 domain entities + 4 repository interfaces

Follow the M1 Task 1 pattern verbatim (private setters + private parameterless ctor + `public static Create(...)` factory + `default!` on required strings). Mirror the M0 `AppToken.cs` template.

WaveRun has mutator methods: `UpdatePlan(size, rejectedCount)`, `UpdateDispatch(runId, sliceIds)`, `UpdateFinalize(merged, conflicts, failed)`, `UpdatePostMergeTest(status)`, `UpdateCompletion(completedAt, status, haltReason, durationMs, passCount, failCount)`. Repository's `UpdateOnLifecycle` patches the appropriate fields based on event kind.

Commit: `feat(loop): M2 wave entities (WaveRun, WaveMember, WaveWorktreeOutcome, WaveIndexEntry)`.

---

### Task 2: EF configurations + repository impls + migration

Mirror M1 Task 2 pattern. 4 configurations + 4 repos + DbContext registration + DI + migration.

Migration name: `AddWaveSurface`. Generate via `dotnet ef migrations add AddWaveSurface --project src/AstraRunner.Infrastructure --startup-project src/AstraRunner.Api --output-dir Migrations`.

Apply via `dotnet ef migrations script --idempotent` → psql pipe (the design-time `database update` is broken on this branch per the M1 finding).

Commit: `feat(loop): EF migration + repos for wave_runs, wave_members, wave_worktree_outcomes, wave_index_entries`.

---

### Task 3: WaveEventHandler

Implements `ILoopEventHandler`. Single class handles 9 kinds. Use a switch expression over `envelope.Kind` to dispatch to internal methods. Each method parses payload via `JsonDocument`, builds the entity (or fetches existing + mutates), upserts via the appropriate repo, calls `ILoopEventsNotifier.NotifyWaveAsync(appId, waveId, payloadJson, ct)`.

7 unit tests with NSubstitute repos + notifier — one test per kind that exercises a state mutation.

Commit: `feat(ingest): WaveEventHandler persists wave lifecycle rows`.

---

### Task 4: WaveIndexSyncHandler

Implements `ILoopEventHandler`. `CanHandle("wave.index_updated") == true`. Parses `payload.index` array, calls `_indexRepo.UpsertBatch(appId, entries, ct)`. Notifies app group.

2 unit tests: upsert overwrites; notifier called.

Commit: `feat(ingest): WaveIndexSyncHandler maintains rolling index table`.

---

### Task 5: Integration tests for 4 wave repos

Mirror M1 Task 7 pattern. Testcontainers PG + `EnsureCreatedAsync` + private DbContext.

Commit: `test(loop): integration tests for wave repositories`.

---

### Task 6: v2 WavesController API

Two endpoints. Direct-method-invocation tests per M0/M1 precedent.

Commit: `feat(api): v2 WavesController (list + detail)`.

---

### Task 7: WaveList page

Replace M0 placeholder. TanStack Query → `apiClient.getWaves(appId)`. Table render.

Commit: `feat(dashboard): WaveList page with TanStack Query`.

---

### Task 8: HaltReasonDonut + WaveGantt components

Two pure presentational components. Recharts (already in repo). Vitest snapshot + render tests.

Commit: `feat(dashboard): HaltReasonDonut + WaveGantt components`.

---

### Task 9: WaveDetail page

Replace M0 placeholder. Composes donut + gantt + member list + outcome timeline. SignalR subscription via `subscribeWave` helper. Initial fetch from `getWaveDetail`.

Commit: `feat(dashboard): WaveDetail page with live SignalR`.

---

### Task 10: Final green sweep

- [ ] `dotnet test` — full backend M0+M1+M2 surface PASS.
- [ ] `cd src/frontend/dashboard && npx tsc --noEmit` — clean.
- [ ] `npm run build` — pre-existing vite/rolldown bug acknowledged; not a M2 regression.
- [ ] Apply migration to local PG via script-pipe.
- [ ] `git diff main..HEAD -- src/AstraRunner.Api/Controllers/[!V2]/*` empty.

---

## Self-Review Notes

- R2-1 → Tasks 1 + 2.
- R2-2 → Tasks 3 + 4.
- R2-3 → Task 7.
- R2-4 → Tasks 8 + 9.
- R2-5 → Task 8 (gantt component).

## Out of scope

- Cost / agent perf (M3).
- Halt-badge events (M4).
- Shape/phase-gate (M5).

## Carry-over pre-existing defects

- vite/rolldown Windows symlink bug on `npm run build` — known, deferred.
- `dotnet ef database update` triggers unrelated loopobserver validation_runs migration replay — apply via script-pipe.
