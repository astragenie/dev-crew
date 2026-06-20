---
title: FEAT-234 Architect Pre-flight — Jsonl Cost-Advise
date: 2026-06-19
status: draft
scope: runner repo (CrewCostAdvise jsonl replacement)
---

# FEAT-234 Architect Pre-flight — Jsonl Cost-Advise

## Goal

Replace the v1 md-scanner cost-advise pipeline (`CostAdviseParser` + `CrewIngestionService.BuildCostAdvise` + `CrewCostAdvise` table) with a jsonl-side equivalent so `CrewArtifactWatcher` can stop processing `cost-advise.md` files. Closes one of the three remaining md-only carve-outs (along with discrepancies = FEAT-233, readiness = FEAT-235) blocking full scanner kill (FEAT-236).

## v1 inventory

**Production today:**

- **Loop plugin's `crew` skill** writes `*-cost-advise.md` files into `.claude/artifacts/crew/` per slice. The md frontmatter + body carry: `target_slice_id`, list of recommendations (severity, rule_id, message, suggestion), aggregate flags, baseline metrics (USD median/p75, cache-hit median).
- **`CostAdviseParser`** (runner) extracts those into a `ParsedCrewArtifact.DerivedFields` dict.
- **`CrewIngestionService.BuildCostAdvise`** maps to `CrewCostAdvise` entity → `AddCostAdviseAsync` → upsert idempotent on artifact id.
- **`NotifyHighAdvisorRecommendationsAsync`** Telegram alert on HIGH severity.

**Consumed by:**

- `GetRepoOverview` (cost-advise count in summary)
- `AdvisorFlagsPage` FE (lists CostAdvise rows → "Flags" UI; already v1-badged)
- `RepeatedFindingCheck` discrepancy check
- FEAT-233 evaluator (deferred subset — `no-cost-advise` + `repeated-finding`)

## Design decisions (recommend)

### D1: Generation locus — loop side, not runner side

**Option A — Loop plugin emits `cost.advise_recorded` envelope** with the same payload shape as today's md frontmatter (target_slice_id, recommendations, aggregate_flags, baselines). Runner ingests via SliceEventHandler-style handler → persists to new `jsonl_cost_advises` table. Telegram notify on HIGH on ingest.

**Option B — Runner generates advises** from `RoleAgentDispatch` cost rollups using its own rule set. Removes loop-side dependency.

**Recommend A.** Cost-advise rules today live in the loop plugin (with the cost watcher that has the deepest cost context). Moving rules to runner = re-implementing semantics. Loop emits is consistent with how grades + agent runs already work.

### D2: Storage

New `jsonl_cost_advises` table — mirrors `crew_cost_advises` columns minus md-specific (`crew_artifact_id`, `crew_slice_run_id` guids). Adds: `slice_id` (string), `kind = 'cost.advise_recorded'` for ingest provenance.

### D3: Wire-up

- New `CostAdviseHandler : ILoopEventHandler` registered for `kind == "cost.advise_recorded"`. Persists envelope payload via `IJsonlCostAdviseRepository.UpsertAsync` (idempotent on `(app_id, slice_id, rule_id)` or whatever stable key the loop emits).
- Telegram notify path mirrors the v1 NotifyHighAdvisorRecommendationsAsync — same severity threshold, same tenant lookup.
- Feature flag `Application.UseJsonlCostAdvises` per-app default off. `AdvisorFlagsPage` API endpoint reads from jsonl table when flag on, md table when off.

### D4: Shadow mode

Both pipelines run in parallel for ≥14 days per app before flag flip. Drift job nightly compares row counts + content hashes per `(app, slice, rule_id)`. Operator flips after zero drift.

### D5: Loop-side spec

Loop plugin needs a new emission. Suggested envelope:

```jsonl
{"kind":"cost.advise_recorded","emittedAt":"...","payload":{"sliceId":"SLICE-N","targetSliceId":"SLICE-N","recommendations":[{"severity":"HIGH","ruleId":"redundant-read","message":"...","suggestion":"..."}],"aggregateFlags":[...],"baselineUsdMedian":12.34,"baselineUsdP75":18.50,"baselineCacheHitMedian":0.75}}
```

Cross-repo FEAT in loop repo — name TBD when this lands.

## AC freeze for FEAT-234

1. New `JsonlCostAdvise` entity + `IJsonlCostAdviseRepository` + EF config + migration.
2. New `CostAdviseHandler : ILoopEventHandler` consuming `cost.advise_recorded` envelopes; HIGH severity triggers Telegram notify.
3. `Application.UseJsonlCostAdvises bool` column + migration (default false).
4. `AdvisorFlagsPage` controller endpoint (or its handler) reads jsonl table when flag on.
5. Drift job (shared infra with FEAT-233 `DiscrepancyDriftJob`) gains a cost-advise comparison surface.
6. Per-handler integration tests + 7-14 day shadow window per app.

## Out of scope

- Loop-side emission (cross-repo follow-up — file in loop backlog as `LOOP-FEAT-N`).
- Generation rule changes (any new rule = separate FEAT on loop side).
- Discrepancy engine (FEAT-233 covers).
- Readiness scoring (FEAT-235 covers).

## Effort estimate

1-2 weeks runner-side after loop emission is wire-compatible. Smaller than FEAT-233 because no new evaluator logic — pure passthrough.

## Related

- Parent audit: `docs/superpowers/specs/2026-06-19-m7-scanner-decommission-audit.md`.
- Sibling: FEAT-233 (`docs/superpowers/specs/2026-06-19-feat-233-architect-preflight.md`).
- Unblocks: FEAT-236 + FEAT-233's deferred 2 checks.
