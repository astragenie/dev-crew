# M3 — Cost + Agent Perf + Live Agent Narrative (Runner Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up the runner-side consumer for M3's three event streams. Persist enriched `AgentRun` rows (timing + tool call count), per-dispatch `RoleAgentDispatch` rows (PM/architect/spec-writer cost isolation), `AgentProgress` rows (live narrative), `ToolCall` rows (per-tool-invocation telemetry). Wire new handlers into the M1 dispatcher. Build 4 v2 frontend pages/charts: AgentPerformance, RoleAgentCost, ReviewerLadderSankey, and live narrative panel inside `SliceLiveDetail`.

**Architecture:** Same pattern as M1+M2. Add entities → EF migration → repos → handlers → DI registration → API → frontend. `AutoDispatchHandler` routes `agent.dispatch` envelopes (one row per role-agent dispatch with cost/tokens). `SliceEventHandler` (M1) extended to populate new AgentRun timing fields. `AgentProgressHandler` + `ToolCallHandler` added for the two narrative streams. After persist, each handler calls `ILoopEventsNotifier.NotifySliceAsync` to push live to slice group.

**Tech Stack:** .NET 10, EF Core 10, PostgreSQL 17, SignalR, xUnit + FluentAssertions + NSubstitute + Testcontainers.PostgreSql, React 19 + Vite + TypeScript, `@microsoft/signalr`, recharts.

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M3, Runner FEATs R3-1, R3-2, R3-3, R3-4, R3-5, R3-6).

**Wave-run target:** `C:\work\mega\runner`. Commit on main.

---

## File Structure

### Domain

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/RoleAgentDispatch.cs` | new | `{Id, TenantId, AppId, Ts, Agent, ParentCommand, Ok, Skipped?, SkipReason?, CostUsd?, DurationMs?, InputTokens?, OutputTokens?, StepType?, ReceivedAt}`. One row per `agent.dispatch` envelope. |
| `src/AstraRunner.Domain/Loop/AgentProgress.cs` | new | `{Id, TenantId, AppId, SliceId, Agent, Stage, Description, Ts, ReceivedAt}`. Append-only — never updated. |
| `src/AstraRunner.Domain/Loop/ToolCall.cs` | new | `{Id, TenantId, AppId, SliceId, Agent, ToolName, ArgsJson?, DurationMs?, Ts, ReceivedAt}`. Append-only. |
| `src/AstraRunner.Domain/Loop/Interfaces/IRoleAgentDispatchRepository.cs` | new | Upsert (idempotent on `(AppId, Agent, Ts)`), ListByApp, ListByAgentSince. |
| `src/AstraRunner.Domain/Loop/Interfaces/IAgentProgressRepository.cs` | new | Append, ListBySlice, GetLatestByAgent. |
| `src/AstraRunner.Domain/Loop/Interfaces/IToolCallRepository.cs` | new | Append, ListBySlice, ListByAgentSince. |

### Infrastructure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/RoleAgentDispatchConfiguration.cs` | new | Table `role_agent_dispatches`. Index `(AppId, Ts)`, `(AppId, Agent, Ts)`. |
| `.../AgentProgressConfiguration.cs` | new | Table `agent_progress`. Index `(AppId, SliceId, Ts)`, `(AppId, Agent, Ts)`. |
| `.../ToolCallConfiguration.cs` | new | Table `tool_calls`. Index `(AppId, SliceId, Ts)`, `(AppId, Agent, ToolName)`. |
| `src/AstraRunner.Infrastructure/Loop/RoleAgentDispatchRepository.cs` | new | EF impl. |
| `.../AgentProgressRepository.cs` | new | EF impl. |
| `.../ToolCallRepository.cs` | new | EF impl. |
| `src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs` | modify | Add 3 DbSets. |
| `src/AstraRunner.Infrastructure/DependencyInjection.cs` | modify | Register 3 repos Scoped. |
| `src/AstraRunner.Infrastructure/Migrations/<ts>_AddAgentPerfAndNarrative.cs` | new | EF migration. |
| `src/AstraRunner.Application/Loop/Ingest/AutoDispatchHandler.cs` | new | Handles `agent.dispatch`. Persists RoleAgentDispatch. Notifier: app group. |
| `src/AstraRunner.Application/Loop/Ingest/AgentProgressHandler.cs` | new | Handles `slice.agent_progress`. Persists AgentProgress. Notifier: slice group. |
| `src/AstraRunner.Application/Loop/Ingest/ToolCallHandler.cs` | new | Handles `agent.tool_call`. Persists ToolCall. Notifier: slice group. |
| `src/AstraRunner.Application/Loop/Ingest/SliceEventHandler.cs` | modify | When `kind == "slice.agent_completed"`, populate `AgentRun.ToolCalls` + `FirstOutputAt` from payload (M3 schema additions). |
| Dispatcher DI registration | modify | Register 3 new handlers — `LoopEventDispatcher` picks them up via `IEnumerable<ILoopEventHandler>`. |

### API + frontend

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Api/Controllers/V2/AgentsController.cs` | new | `GET /api/v2/apps/{appId}/agents/performance` — per-agent boxplot data + reviewer ladder span. `GET /api/v2/apps/{appId}/agents/role-cost` — PM/architect/spec-writer cost by day. `GET /api/v2/apps/{appId}/agents/reviewer-ladder` — Sankey input. Clerk JWT auth. |
| `src/AstraRunner.Api/Controllers/V2/SlicesController.cs` | modify | Add `GET /api/v2/apps/{appId}/slices/{sliceId}/progress` (AgentProgress timeline) + `/tool-calls` (ToolCall timeline). |
| `src/frontend/dashboard/src/v2/pages/AgentPerformance.tsx` | modify | Replace M0 placeholder. Boxplot of agent duration distribution (recharts BarChart with quantiles), reviewer ladder span chart, tool-call distribution per agent (stacked bar). |
| `src/frontend/dashboard/src/v2/pages/RoleAgentCost.tsx` | modify | Replace M0 placeholder. Time-series chart of cost per role-agent (PM, architect, spec-writer, document-writer, researcher). |
| `src/frontend/dashboard/src/v2/components/ReviewerLadderSankey.tsx` | new | Recharts Sankey: reviewer A vs reviewer B vs validator durations. |
| `src/frontend/dashboard/src/v2/components/AgentNarrativePanel.tsx` | new | Live panel for SliceLiveDetail. Shows latest AgentProgress (stage + description) + live tool calls. |
| `src/frontend/dashboard/src/v2/pages/SliceLiveDetail.tsx` | modify | Mount AgentNarrativePanel above the existing timeline. Subscribe to `slice.agent_progress` + `agent.tool_call` events on the SignalR group. |
| `src/frontend/dashboard/src/v2/components/ToolCallTimeline.tsx` | new | Horizontal timeline of tool calls per agent inside SliceLiveDetail. |
| `src/frontend/dashboard/src/v2/lib/api-client.ts` | modify | Add `getAgentPerformance`, `getRoleAgentCost`, `getReviewerLadder`, `getSliceProgress`, `getSliceToolCalls`. |

### Tests

| Path | Tests |
|---|---|
| `tests/AstraRunner.Tests/Unit/Loop/AutoDispatchHandlerTests.cs` | 3 |
| `tests/AstraRunner.Tests/Unit/Loop/AgentProgressHandlerTests.cs` | 2 |
| `tests/AstraRunner.Tests/Unit/Loop/ToolCallHandlerTests.cs` | 2 |
| `tests/AstraRunner.Tests/Unit/Loop/SliceEventHandlerTimingTests.cs` | 2 (toolCalls + firstOutputAt update on agent_completed) |
| `tests/AstraRunner.Tests/Integration/Loop/RoleAgentDispatchRepositoryTests.cs` | 3 |
| `tests/AstraRunner.Tests/Integration/Loop/AgentProgressRepositoryTests.cs` | 3 |
| `tests/AstraRunner.Tests/Integration/Loop/ToolCallRepositoryTests.cs` | 3 |
| `tests/AstraRunner.Tests/Integration/Api/V2/AgentsControllerTests.cs` | 4 |
| `src/frontend/dashboard/src/v2/pages/__tests__/AgentPerformance.test.tsx` | 3 |
| `src/frontend/dashboard/src/v2/pages/__tests__/RoleAgentCost.test.tsx` | 2 |
| `src/frontend/dashboard/src/v2/components/__tests__/ReviewerLadderSankey.test.tsx` | 2 |
| `src/frontend/dashboard/src/v2/components/__tests__/AgentNarrativePanel.test.tsx` | 3 |
| `src/frontend/dashboard/src/v2/components/__tests__/ToolCallTimeline.test.tsx` | 2 |

---

### Task 1: 3 domain entities + 3 repo interfaces

Mirror M1 Task 1 / M2 Task 1 pattern. House style: private setters, private parameterless ctor, `public static Create(...)` factory, `default!` on required strings.

`AgentProgress` + `ToolCall` are append-only (no mutators). `RoleAgentDispatch` is upsert-idempotent on `(AppId, Agent, Ts)`.

Commit: `feat(loop): M3 domain entities (RoleAgentDispatch, AgentProgress, ToolCall)`.

---

### Task 2: EF configurations + 3 repo impls + migration

Mirror M2 Task 2 pattern. 3 configurations + 3 repos + DbContext registration + DI + migration.

Migration name: `AddAgentPerfAndNarrative`. Generate via `dotnet ef migrations add ... --startup-project src/AstraRunner.Api`. Apply via `dotnet ef migrations script --idempotent` → psql pipe (M0/M1/M2 precedent — design-time `database update` is broken).

Commit: `feat(loop): EF migration + repos for role_agent_dispatches + agent_progress + tool_calls`.

---

### Task 3: AutoDispatchHandler

Implements `ILoopEventHandler`. `CanHandle("agent.dispatch") == true`. Parses payload (`agent`, `ts/timestamp`, `parentCommand`, `ok`, `costUsd`, `durationMs`, `inputTokens`, `outputTokens`, `stepType`, `skipped`, `skipReason`). Builds `RoleAgentDispatch`, upserts. Notifies app group with payload JSON.

3 unit tests with NSubstitute repo + notifier.

Commit: `feat(ingest): AutoDispatchHandler persists role-agent dispatch cost rows`.

---

### Task 4: AgentProgressHandler + ToolCallHandler

`AgentProgressHandler.CanHandle("slice.agent_progress")` → appends row + notifies slice group.
`ToolCallHandler.CanHandle("agent.tool_call")` → appends row + notifies slice group.

4 unit tests total (2 each).

Commit: `feat(ingest): AgentProgressHandler + ToolCallHandler for live narrative`.

---

### Task 5: SliceEventHandler timing-field extension

Modify M1 `SliceEventHandler`. When `kind == "slice.agent_completed"`, extract `firstOutputAt` + `toolCalls` from payload and pass through to `AgentRun.MarkCompleted` (extend the mutator signature if needed). Backward-compatible: if fields absent, leave nulls.

2 unit tests: with timing fields, without timing fields.

Commit: `feat(slice-handler): populate AgentRun firstOutputAt + toolCalls from agent_completed payload`.

---

### Task 6: Integration tests for 3 new repos

Mirror M1 Task 7 + M2 Task 5 pattern. Testcontainers PG + `EnsureCreatedAsync` + private DbContext.

Commit: `test(loop): integration tests for M3 repositories`.

---

### Task 7: v2 AgentsController + Slices progress/tool endpoints

`AgentsController` with 3 endpoints. `SlicesController` modify: add 2 timeline endpoints. Direct-method-invocation tests.

Commit: `feat(api): v2 AgentsController + SliceDetail progress/tool-call endpoints`.

---

### Task 8: AgentPerformance + RoleAgentCost pages

Replace M0 placeholders. Use recharts. TanStack Query against new API endpoints. Vitest tests.

Commit: `feat(dashboard): AgentPerformance + RoleAgentCost pages`.

---

### Task 9: ReviewerLadderSankey component

New recharts Sankey. Inputs: durations for reviewer A → validator → reviewer B → outcome. Vitest tests.

Commit: `feat(dashboard): ReviewerLadderSankey recharts component`.

---

### Task 10: AgentNarrativePanel + ToolCallTimeline + SliceLiveDetail integration

`AgentNarrativePanel`: live panel showing latest AgentProgress per agent + most recent stage + description. Subscribes to slice SignalR group, filters incoming events by kind.
`ToolCallTimeline`: horizontal timeline of tool invocations grouped by agent.

Modify `SliceLiveDetail` to mount both new components above the existing workflow timeline.

Vitest tests for both components + updated SliceLiveDetail test.

Commit: `feat(dashboard): live AgentNarrativePanel + ToolCallTimeline on SliceLiveDetail`.

---

### Task 11: Final green sweep

- [ ] `dotnet test` — full M0+M1+M2+M3 surface PASS.
- [ ] `cd src/frontend/dashboard && npx tsc --noEmit` — clean.
- [ ] Migration applied via script-pipe.
- [ ] `git diff main..HEAD -- src/AstraRunner.Api/Controllers/[!V2]/*` empty.

---

## Self-Review Notes

- R3-1 → Tasks 2 + 3 + 5 (AgentRun timing + AutoDispatchHandler).
- R3-2 → Task 8 (AgentPerformance page).
- R3-3 → Task 8 (RoleAgentCost page).
- R3-4 → Task 9 (ReviewerLadderSankey).
- R3-5 → Tasks 4 + 10 (AgentProgress entity + handler + live panel).
- R3-6 → Tasks 4 + 10 (ToolCall entity + handler + timeline component).

## Carry-over pre-existing defects
- vite/rolldown Windows symlink bug on `npm run build` — known, deferred.
- `dotnet ef database update` triggers unrelated loopobserver migration replay — apply via script-pipe.
- pnpm minimumReleaseAgeExclude bug — `--config.minimumReleaseAge=0` workaround.
