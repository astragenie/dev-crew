# M5 — Shape/Phase-Gate + Decisions/Learnings + Backlog (Runner Side) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Consume M5 emissions. Persist backlog flow, decisions, learnings. Render Decisions + Learnings feed pages. Add shape/phase-gate chips on SliceLiveDetail.

**Parent Spec:** Milestone M5, FEATs R5-1, R5-2, R5-3, R5-4.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/BacklogFlow.cs` | new | `{Id, TenantId, AppId, FeatId, FromState?, ToState, Ts, ReceivedAt}`. |
| `src/AstraRunner.Domain/Loop/DecisionRecord.cs` | new | `{Id, TenantId, AppId, SliceId, DecId, Status, Body, RecordedAt, ReceivedAt}`. Idempotent on `(AppId, DecId)`. |
| `src/AstraRunner.Domain/Loop/Learning.cs` | new | `{Id, TenantId, AppId, Key, Insight, Confidence?, Source?, SliceId?, Ts, ReceivedAt}`. Append-only. |
| `src/AstraRunner.Domain/Loop/SliceShape.cs` | new | `{Id, TenantId, AppId, SliceId, Shape, Rationale?, InlinePathUsed, Ts}` upsert `(AppId, SliceId)`. |
| EF configs + repos + DbContext + DI + migration `AddM5Surface` | new | Mirror M2/M3 pattern. |
| Handlers: `BacklogStateHandler`, `DecisionsHandler` (extracts from grades.jsonl decisions array, ingested via M1 GradeJsonlHandler — extend it OR add new handler for `decision.recorded` kind if loop emits as separate), `LearningHandler` (reads `learnings.jsonl` — wire L5 emission for `loop.learning_recorded` kind), `SliceShapeHandler` (kind `slice.shape_classified`). | new | Per-handler unit tests. |
| `src/AstraRunner.Api/Controllers/V2/BacklogController.cs` | new | `GET /api/v2/apps/{appId}/backlog/flow?since` time series. |
| `src/AstraRunner.Api/Controllers/V2/DecisionsController.cs` | new | `GET /api/v2/apps/{appId}/decisions` list with filter. |
| `src/AstraRunner.Api/Controllers/V2/LearningsController.cs` | new | `GET /api/v2/apps/{appId}/learnings` list. |
| `src/frontend/dashboard/src/v2/pages/Decisions.tsx` | modify | Replace placeholder. DEC-* feed table + click → detail panel. 3 vitest tests. |
| `src/frontend/dashboard/src/v2/pages/Learnings.tsx` | modify | Replace placeholder. Learnings feed. 3 vitest tests. |
| `src/frontend/dashboard/src/v2/components/SliceShapeChip.tsx` | new | Render `Shape + InlinePathUsed?` badge. |
| `src/frontend/dashboard/src/v2/components/PhaseGateModeChip.tsx` | new | Render `serial/parallel` badge. |
| `src/frontend/dashboard/src/v2/pages/SliceLiveDetail.tsx` | modify | Mount both chips in slice header. |

---

## Tasks

1. **Domain** — 4 entities + 4 interfaces. Commit `feat(loop): M5 domain entities (BacklogFlow, DecisionRecord, Learning, SliceShape)`.
2. **EF + repos + migration** — `AddM5Surface`. Apply via script-pipe.
3. **4 handlers + DI registration** — 8 unit tests.
4. **Integration tests** — 4 new repo test classes (3 tests each).
5. **3 controllers** — 6 controller tests total.
6. **Decisions + Learnings pages** — replace placeholders. TanStack Query.
7. **Shape + PhaseGateMode chips** — mounted on SliceLiveDetail.
8. **Final sweep** — dotnet test (regression filter), frontend tsc, migration apply.

Commit subjects mirror task list.
