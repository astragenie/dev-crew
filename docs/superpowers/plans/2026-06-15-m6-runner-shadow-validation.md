# M6 — Shadow Validation (Runner Side Only) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Validate jsonl-derived state matches md-derived state per slice. Hourly background job. Cutover gate metric.

**Parent Spec:** Milestone M6, FEATs R6-1, R6-2, R6-3.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/IngestDriftReport.cs` | new | `{Id, TenantId, AppId, SliceId, RunAt, DeltaJson, ZeroDrift, Surface}`. Per-slice per-surface delta. |
| `src/AstraRunner.Domain/Loop/Interfaces/IIngestDriftReportRepository.cs` | new | Upsert, ListByAppSince, GetZeroDriftStreak. |
| EF + repo + DbContext + DI + migration `AddIngestDriftReports` | new | Mirror M2/M3 pattern. |
| `src/AstraRunner.Worker/Shadow/ShadowDiffJob.cs` | new | `BackgroundService`. Hourly. For each app, for each surface (grades, slice workflow, agent runs, wave outcomes, backlog flow): derive jsonl-state via repo queries, derive md-state via existing v1 md handlers (call internally), diff, upsert IngestDriftReport. |
| `src/AstraRunner.Application/Loop/Shadow/SurfaceDiffer.cs` | new | Per-surface diff strategy. 5 implementations. |
| `src/AstraRunner.Api/Controllers/V2/IngestHealthController.cs` | new | `GET /api/v2/ingest/health` returns `{zeroDriftStreak, ingestLagSecondsP95, lastDriftAt}`. |
| `src/frontend/dashboard/src/v2/pages/IngestDrift.tsx` | modify | Replace placeholder. Drift dashboard: streak counter, per-surface breakdown, recent drift events. |

---

## Tasks

1. **Domain entity + repo** + migration.
2. **5 SurfaceDiffer implementations** with unit tests.
3. **ShadowDiffJob** BackgroundService + integration test (Testcontainers PG).
4. **IngestHealthController** + 3 controller tests.
5. **IngestDrift page** with streak counter + per-surface breakdown.
6. **Final sweep** — backend regression, frontend tsc, migration apply.

Commit subjects:
- `feat(loop): M6 IngestDriftReport entity + repo + migration`
- `feat(shadow): SurfaceDiffer implementations for 5 jsonl/md surface pairs`
- `feat(worker): ShadowDiffJob hourly background service`
- `feat(api): v2 ingest/health endpoint + IngestHealthController`
- `feat(dashboard): IngestDrift page with streak counter + surface breakdown`
