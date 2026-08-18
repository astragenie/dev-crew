---
title: M7 Scanner Decommission — Audit & Plan
date: 2026-06-19
status: draft
scope: runner repo (md scanner retirement)
---

# M7 Scanner Decommission — Audit & Plan

## Why

After Wave A + B + C (FEAT-225/226/227/228/230) + the FEAT-A pre-Sunset flip of AgentsBySliceHandler, all dashboard handlers that CAN be flipped are jsonl-backed. The v1 md scanner (`CrewArtifactWatcher` BackgroundService + supporting infrastructure) can now be planned for retirement. This doc maps what the scanner does, what still depends on it, and sequences its kill.

## What the scanner does today

**Primary BackgroundService:** `src/AstraRunner.Infrastructure/CrewMonitor/Watcher/CrewArtifactWatcher.cs` (`: BackgroundService`).

**Outputs (md side, persisted to Postgres):**

| Table | Producer | Cutover state |
|---|---|---|
| `crew_artifacts` | Watcher parses `.claude/artifacts/crew/**/*.md` files | Still produced — handlers no longer read |
| `crew_slice_runs` | Watcher infers slice runs from artifact filenames | Still produced — handlers no longer read |
| `crew_discrepancies` | DiscrepancyEvaluator (post-artifact-write) | Still consumed by ListDiscrepancies handler (permanent md surface) |
| `crew_recommendations` | Recommendation engine (post-discrepancy) | Still consumed — recommendations dashboard |
| `crew_cost_reports` | Cost-bundle parser (per slice) | Still consumed by AgentsBySliceHandler cost-points (zero values, permanent md carve-out) |
| `crew_cost_advises` | Cost-advisor (post-cost-report) | Still consumed by GetRepoOverview carve-out + dashboard |
| `readiness_scores` | Readiness scorer (post-grade) | Still consumed |
| `scoring_weights` | Static config | n/a |

**Sibling worker:** `src/AstraRunner.Infrastructure/Scanner/FileSystemWatcherService.cs` — file-system watcher feeding the artifact watcher. Same lifecycle.

## Dependents that prevent immediate kill

1. **`ListDiscrepancies` handler** — reads `crew_discrepancies` table. Permanent md surface (no jsonl equivalent designed).
2. **`AdvisorFlagsPage` (FE)** — reads `CrewCostAdvise` derived flags. Permanent md surface; "v1 surface" badge added 2026-06-19.
3. **`GetRepoOverview` cost carve-out** — `crewRepo.ListCostReportsAsync` + `GetCostAdviseForRepoAsync`. Carve-out by design (jsonl cost aggregator covers summary; md retains detail).
4. **`AgentsBySliceHandler` cost-points** — currently returns 0m (md cost lookup removed in FEAT-A). No actual cost data shown; harmless if scanner stops emitting.
5. **`ReadinessScores` consumers** — dashboard readiness widgets. Read md-produced scores.
6. **`RecommendationsList` (if any)** — operator-facing recommendations page (if it exists).

## Decommission options

### Option 1 — Keep scanner running, narrow scope

Reduce scanner workload to only the surfaces actually still read: discrepancies, cost reports, cost advises, recommendations, readiness scores. Disable: SliceWorkflowEvent parsing (jsonl owns this), AgentReport parsing (jsonl owns), GradeRecord parsing (jsonl owns).

Pros: preserves all current functionality; cuts scanner cycle time + I/O significantly.
Cons: scanner stays in code base; complexity not reduced.

### Option 2 — Full kill, accept feature loss

Stop the watcher entirely. Discrepancies, cost reports, cost advises, recommendations, readiness scores stop being produced. Tables retain historical data but no new rows.

Pros: scanner code can be deleted; significant infrastructure simplification.
Cons: 4-5 dashboard surfaces silently stop updating. Unacceptable without operator sign-off + user communication.

### Option 3 — Stage 1 narrow + Stage 2 full kill (recommended)

**Stage 1 (1-2 weeks):** narrow the scanner per Option 1. Verify dashboard parity (discrepancies/cost/advise/readiness still update). Drop the unused parsers from `CrewArtifactWatcher`. Saves ~60% scanner CPU + I/O.

**Stage 2 (3+ months out):** ship jsonl-side replacements for the remaining 5 md-dependent surfaces. Then Option 2 kill is safe.

## Recommended sequence

1. **FEAT-232** (Stage 1 narrow scope) — disable SliceWorkflowEvent + AgentReport + GradeRecord parsing in `CrewArtifactWatcher`. Keep discrepancies + cost + advise + readiness parsing. ~1-2 days. Low risk — handlers already off these tables.
2. **FEAT-233** (Stage 2 jsonl-side discrepancy engine) — design + implement. Likely large (~2-4 weeks); requires understanding the discrepancy evaluator semantics first.
3. **FEAT-234** (Stage 2 jsonl-side cost-advise) — design + implement. Less critical than discrepancies.
4. **FEAT-235** (Stage 2 readiness scoring on jsonl) — design + implement.
5. **FEAT-236** (full scanner kill) — after FEAT-233/234/235 land + 30-day observation window with zero md dashboard regressions. Delete `CrewArtifactWatcher`, `FileSystemWatcherService`, parser code, related tables (archive don't drop).

## Risks

- **Hidden md consumers** — any handler I missed. Mitigation: full grep `grep -rln "ICrewArtifactRepository" src/AstraRunner.Application/` before each Stage 2 FEAT.
- **Operator workflow dependencies** — operators may script against `crew_artifacts` directly. Communicate FEAT-236 well in advance.
- **Historical data archival** — `crew_artifacts` has years of data potentially. Decide retention policy before drop.

## What this audit does NOT prescribe

- Specific Stage 2 designs (each replacement FEAT will scope).
- Production rollout sequencing (operator-led, not auto-dispatch).
- Communication plan with external users (if any).

## Related

- `docs/superpowers/specs/2026-06-19-m7-handler-cutover-audit.md` — handler-side cutover record.
- `docs/specs/2026-06-19-agents-breakdown-jsonl-audit.md` (runner repo) — DistinctSkills gap fix.
- Memory: [[wave-b-landed-2026-06-19]], [[feat-230-done-2026-06-19]].
