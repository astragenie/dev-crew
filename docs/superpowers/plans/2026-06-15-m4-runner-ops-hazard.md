# M4 — Ops Hazard (Runner Side) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Consume `halt_badge` + `slice.specialist_pause` envelopes. Persist `HaltBadge` row per fired badge. Build hazard timeline page + marathon checkpoint pressure gauge.

**Architecture:** Same pattern as M2/M3. Entity + handler + DI + v2 controller + frontend page + component.

**Parent Spec:** Milestone M4, FEATs R4-1, R4-2, R4-3.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/HaltBadge.cs` | new | `{Id, TenantId, AppId, BadgeKind, Ts, SliceId?, WaveId?, DetailsJson, ReceivedAt}`. Append-only. |
| `src/AstraRunner.Domain/Loop/SpecialistPause.cs` | new | `{Id, TenantId, AppId, SliceId, Agent, Reason?, Ts, ReceivedAt}`. Append-only. |
| `src/AstraRunner.Domain/Loop/Interfaces/IHaltBadgeRepository.cs` | new | Append, ListByApp, GroupByDay. |
| `src/AstraRunner.Domain/Loop/Interfaces/ISpecialistPauseRepository.cs` | new | Append, ListBySlice, ListByAppSince. |
| EF configs + repos + DbContext + DI + migration `AddOpsHazard` | new | Mirror M2/M3 pattern. |
| `src/AstraRunner.Application/Loop/Ingest/HaltBadgeHandler.cs` | new | `CanHandle("halt_badge")`. Persists row. Notifies app group. |
| `src/AstraRunner.Application/Loop/Ingest/SpecialistPauseHandler.cs` | new | `CanHandle("slice.specialist_pause")`. Persists. Notifies slice group. |
| `src/AstraRunner.Api/Controllers/V2/HaltBadgesController.cs` | new | `GET /api/v2/apps/{appId}/halt-badges?since` paginated; `GET .../halt-badges/timeline` stacked-bar data; `GET .../specialist-pauses` for slice. |
| `src/frontend/dashboard/src/v2/pages/HaltBadges.tsx` | modify | Replace M0 placeholder. Stacked-bar timeline per day per badge type + donut breakdown. |
| `src/frontend/dashboard/src/v2/components/MarathonCheckpointGauge.tsx` | new | Gauge: closes-since-last-retro vs warn/hard threshold from snapshot.marathonCheckpoint. |
| `src/frontend/dashboard/src/v2/components/HazardTimeline.tsx` | new | Recharts stacked bars. |
| `src/frontend/dashboard/src/v2/pages/SliceLiveDetail.tsx` | modify | Add specialist-pause indicator when slice has open pauses. |

---

## Tasks

1. **Domain** — 2 entities + 2 interfaces. Commit `feat(loop): M4 domain entities (HaltBadge, SpecialistPause)`.
2. **EF + repos + migration** — `AddOpsHazard`. Apply via script-pipe.
3. **HaltBadgeHandler + SpecialistPauseHandler** — 4 unit tests total.
4. **Integration tests** — 2 new repo test classes (3 tests each).
5. **HaltBadgesController** — 4 controller tests (direct-method-invocation).
6. **HaltBadges page** — replace M0 placeholder. TanStack Query + HazardTimeline component. 3 vitest tests.
7. **MarathonCheckpointGauge** — recharts radial bar. Inputs: `{closesSince, every, hardThreshold}`. 2 vitest tests.
8. **SliceLiveDetail update** — show specialist-pause indicator when open. 1 new vitest test.
9. **Final sweep** — dotnet test (regression filter must hold previous baseline), frontend tsc, migration apply.

Commit subjects mirror task list. Style fixups separate.
