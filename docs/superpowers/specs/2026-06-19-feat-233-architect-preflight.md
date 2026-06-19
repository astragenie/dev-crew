---
title: FEAT-233 Architect Pre-flight — Jsonl Discrepancy Engine
date: 2026-06-19
status: draft
scope: runner repo (DiscrepancyEvaluator jsonl replacement)
---

# FEAT-233 Architect Pre-flight — Jsonl Discrepancy Engine

## Goal

Replace `DiscrepancyEvaluator` (v1 md scanner post-processor) with a jsonl-side equivalent that runs on `LoopEvent` + `AgentRun` + `GradeRecord` + `RoleAgentDispatch` data instead of `CrewArtifact` + `CrewCostReport` + `CrewCostAdvise`.

## v1 evaluator inventory

Triggered post-md-scan from `CrewArtifactWatcher`. Per-`CrewSliceRun`:

1. Load slice run + open existing discrepancies.
2. Run all `IDiscrepancyCheck` instances. Each returns 0..N `CrewDiscrepancy` objects.
3. Persist new discrepancies. Resolve any prior discrepancy whose CheckType didn't appear in the new round.
4. Telegram alert on `Severity == "HIGH"`.

## 7 checks

| Check | Inputs (md) | Jsonl equivalent | Notes |
|---|---|---|---|
| `cost-outlier` | `repo.GetCostReportForSliceAsync(runId)` + `FindLatestCostReportsForAppAsync(appId, N)` | `IJsonlCostAggregator.GetForSliceAsync(appId, sliceId)` + `ListByAppAsync(appId, since, limit=N)` (FEAT-225) | jsonl side has Usd + DurationMs + Tokens; CacheHitPct lost. Outlier detection can use Usd alone — current rule is Usd > N×median, no CacheHitPct dependency. |
| `low-cache-hit` | `repo.GetCostReportForSliceAsync(runId)` (CacheHitPct field) | **NONE — drop check.** CacheHitPct is md-only; jsonl never tracks. | Acceptable loss — operator-facing only, low signal. |
| `low-grade-score` | `repo.ListArtifactsForRunAsync(runId)` filtered to Grade kind | `IGradeRecordRepository.ListBySliceAsync(appId, sliceId)` | Direct equivalent. Parse `ScoresJson` for low values. |
| `no-cost-advise` | cost-report + artifacts filtered to CostAdvise kind | **DEFER until FEAT-234 ships** (cost-advise jsonl) | Drop check temporarily OR keep md until FEAT-234. |
| `missing-gate` | artifacts filtered to gate kinds (review/validation) | `ISliceWorkflowEventRepository.ListBySliceAsync` filtered to `slice.gate_transition` events | Direct equivalent. Check that expected gates have transitioned. |
| `no-grade-stale` | artifacts filtered to RunBrief + Grade, time-since-RunBrief check | `ISliceWorkflowEventRepository.ListBySliceAsync` for slice-start + `IGradeRecordRepository.ListBySliceAsync` for grade presence | Direct equivalent. |
| `repeated-finding` | `GetCostAdviseForRepoAsync` (advise rows) | **DEFER until FEAT-234.** | Same as `no-cost-advise`. |

## Design decisions

### D1: Trigger source

**Option A — per-event reactive:** every `slice.workflow_state_changed` event with `to == "completed"` triggers evaluation for that slice. Real-time.

**Option B — periodic BackgroundService:** every N minutes scan all completed slices in the last window, re-evaluate.

**Recommend Option A.** Lower latency, matches existing v1 (which runs post-scan, i.e. per-write). Keep Option B as a backstop for late-arriving events.

### D2: Trigger insertion point

Add to `SliceEventHandler.HandleAsync` after the workflow-event upsert: if `kind == "slice.workflow_state_changed"` AND `to == "completed"`, enqueue a `JsonlDiscrepancyEvaluation` job. Async — don't block ingest.

Use existing `IUnitOfWork` outbox pattern if available, or a simple in-process queue + Worker consumer.

### D3: Where to persist results

**Option A — same `crew_discrepancies` table.** Mixed-source. Add a `Source` column (`md`|`jsonl`) so the cleanup FEAT can drop md rows after FEAT-236.

**Option B — new `jsonl_discrepancies` table.** Clean separation, easier shadow-mode comparison.

**Recommend Option B.** Clean separation per the scanner-audit doc's principle (never mix sources in one table). `ListDiscrepancies` handler reads both tables, prefers jsonl when feature flag is on.

### D4: Shadow mode + flip

- Feature flag `Discrepancies:UseJsonlEvaluator` per-app (default off).
- When OFF: v1 evaluator runs, jsonl evaluator also runs but writes to `jsonl_discrepancies` table; `ListDiscrepancies` reads md table only.
- When ON: both still run (until v1 is decommissioned in FEAT-236), `ListDiscrepancies` reads jsonl table.
- Shadow-mode comparison job: nightly diff between `crew_discrepancies` and `jsonl_discrepancies` per app. Drift logged + dashboarded.
- Operator flips flag after ≥7-day zero-drift window per app.

### D5: Checks deferred to FEAT-234

`no-cost-advise` + `repeated-finding` depend on `CrewCostAdvise` which has no jsonl equivalent until FEAT-234 ships. Two paths:

- **A.** Skip these checks in jsonl evaluator. `ListDiscrepancies` returns no rows for these CheckTypes when reading jsonl. Loss of signal until FEAT-234.
- **B.** Keep these checks md-only. `ListDiscrepancies` reads BOTH tables (jsonl + md filtered to the 2 deferred CheckTypes). Mixed-source read.

**Recommend A** — cleaner. Document as "advise-related discrepancies surface after FEAT-234." Defer signal loss to operator visibility.

## AC freeze for FEAT-233

(Refines the high-level AC in `triaged/FEAT-233.md`.)

1. New `JsonlDiscrepancyEvaluator` Application-layer service implementing the same 5 of 7 checks (skip `low-cache-hit`, `no-cost-advise`, `repeated-finding`).
2. New `JsonlDiscrepancy` entity + table `jsonl_discrepancies` (shape mirrors `CrewDiscrepancy`; adds `SliceId string` field since jsonl uses string sliceIds).
3. New `IJsonlDiscrepancyRepository` + concrete EF impl + migration `AddJsonlDiscrepancies`.
4. New `IDiscrepancyEvaluationConsumer` handler that triggers on `slice.workflow_state_changed` → `to == "completed"` events via `SliceEventHandler`. Async — does not block ingest.
5. Per-app feature flag `Application.UseJsonlDiscrepancies` (bool column, default false).
6. `ListDiscrepancies` handler reads `jsonl_discrepancies` when flag ON, falls back to `crew_discrepancies` when OFF.
7. Nightly `DiscrepancyDriftJob` BackgroundService computes per-app diff between the two tables, logs structured warning on non-zero drift.
8. Integration tests: 5 active checks reproduce v1 behavior on identical fixture; flag flip changes read source; drift job detects divergence.

## Decisions captured

| Decision | Choice |
|---|---|
| Trigger | Reactive on `slice.workflow_state_changed → completed` |
| Insertion | `SliceEventHandler` async enqueue |
| Persistence | New `jsonl_discrepancies` table |
| Flag scope | Per-app |
| Deferred checks | Skip 3 (no-cost-advise / repeated-finding / low-cache-hit). Operator accepts signal loss until FEAT-234. |
| Shadow window | ≥7 days zero-divergence per app before flip |

## Risks

- **Skipped check signal loss** — operators reliant on `no-cost-advise` lose the signal pre-FEAT-234. Mitigation: doc + dashboard "v1 surface" indicator on those CheckTypes.
- **Async enqueue durability** — in-process queue loses events on Worker restart. Mitigation: idempotent re-evaluation on next `slice.*` event for the same slice, OR use the existing `outbox_messages` table for transactional handoff (preferred).
- **Drift job cost** — nightly per-app full-table comparison could grow expensive. Mitigation: incremental diff using `LastUpdatedAt` cursor.

## Out of scope

- FEAT-234 (cost-advise jsonl replacement).
- FEAT-235 (readiness scorer jsonl replacement).
- FEAT-236 (full scanner kill — gated on 233+234+235 + observation).

## Next steps for builder

After this pre-flight is approved:
- Builder receives FEAT-233 with AC frozen per Section "AC freeze for FEAT-233."
- Implementation order: entity + migration → repo + DI → 5 check ports → consumer wiring → shadow-mode flag → drift job → tests. 2-3 weeks.
