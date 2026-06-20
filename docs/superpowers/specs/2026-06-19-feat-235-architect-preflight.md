---
title: FEAT-235 Architect Pre-flight — Jsonl Readiness Scoring
date: 2026-06-19
status: draft
scope: runner repo (ReadinessScore jsonl replacement)
---

# FEAT-235 Architect Pre-flight — Jsonl Readiness Scoring

## Goal

Replace v1 readiness scoring (`CrewScoringRequestedConsumer` reading `CrewArtifactKind.Grade` md artifacts → computing `ReadinessScore` + `ScoreDimension` rows) with a jsonl-side equivalent reading `GradeRecord` (already jsonl-mirrored since FEAT-209 / M6 wave).

## v1 inventory

**Producer:** `CrewScoringRequestedConsumer` (MassTransit IConsumer). Triggered by `CrewScoringRequested` message published from `CrewIngestionService` after md Grade artifact ingest. Reads `repo.ListArtifactsByKindAsync(appId, Grade, ct)` → parses each grade artifact's score dimensions → computes weighted composite → upserts `ReadinessScore` + `ScoreDimension[]` rows.

**Inputs (from md Grade artifact frontmatter):**
- Per-dimension scores (architecture, reliability, observability, production_readiness, security, test_confidence, product_completeness — 7 known dimensions today)
- Per-dimension weight (configurable via `scoring_weights` table)
- Slice id for traceability

**Storage:**
- `readiness_scores` (1 row per app) — composite + timestamp
- `score_dimensions` (N rows per readiness_score) — per-dimension breakdown

**Consumers:**
- `GetReadinessLeaderboard` handler — dashboard widget showing top-N apps by composite
- `GetReadinessOverTime` handler — chart of composite over time
- `GetAppStats.GetProductionReadinessAsync` — single-app composite card

## Design decisions (recommend)

### D1: Input source switch

Replace `repo.ListArtifactsByKindAsync(appId, Grade, ct)` (md path) with `IGradeRecordRepository.ListByAppSinceAsync(appId, since, ct)` (jsonl path).

Both surfaces emit the same per-dimension score JSON shape today (loop plugin emits `grade.recorded` with `scoresJson` field; md scanner parsed identical shape from artifact frontmatter). Confirmed via FEAT-225 + the existing `GradeDimensionsHandler` already on jsonl.

### D2: Trigger

**Option A — Reactive:** subscribe `JsonlGradeRecordedHandler` to `kind == "grade.recorded"` envelopes from `SliceEventHandler`. Per-grade re-score is cheap (one composite computation per app).

**Option B — Periodic:** BackgroundService that re-scores every N minutes for any app with new grades.

**Recommend A.** Real-time matches v1 behavior (scoring runs on every Grade artifact arrival). Cheap enough.

### D3: Storage compatibility

Two options:

- **Option X — Reuse existing tables.** Same `readiness_scores` + `score_dimensions`. New jsonl scorer writes to the same tables (overwriting per app on every grade event). Pros: no schema change, dashboard unaffected. Cons: mixed-source rows in single table during shadow mode.

- **Option Y — New `jsonl_readiness_scores` table.** Clean separation; `GetReadinessLeaderboard` reads jsonl table when flag on. Mirror FEAT-233 + FEAT-234 pattern.

**Recommend Y** for consistency with sibling decommission FEATs. Slightly more work upfront but cleaner cutover.

### D4: Shadow mode

14-day zero-drift window per app before flag flip. Drift job compares `readiness_scores.composite` vs `jsonl_readiness_scores.composite` for same app + timestamp window.

### D5: Weights

`scoring_weights` table is currently a global config (per-dimension weight). Keep it as-is — both v1 + jsonl readers consume the same weights. No migration.

## AC freeze for FEAT-235

1. New `JsonlReadinessScore` + `JsonlScoreDimension` entities + repos + EF config + migration `AddJsonlReadinessScores`.
2. New `JsonlReadinessScoreHandler` consuming `grade.recorded` envelopes from SliceEventHandler async-enqueue (use existing outbox pattern from FEAT-233 design).
3. Composite + per-dimension calculation identical to v1 `CrewScoringRequestedConsumer.ScoreApplicationAsync` (verbatim port — single source of truth for the formula).
4. `Application.UseJsonlReadinessScores bool` column + migration (default false).
5. `GetReadinessLeaderboard` + `GetReadinessOverTime` + `GetAppStats.GetProductionReadinessAsync` read jsonl tables when flag on, md tables when off.
6. Drift job (shared infra with FEAT-233 + FEAT-234) gains a readiness comparison surface.
7. Per-handler unit + integration tests.
8. 14-day shadow window per app before flag flip.

## Out of scope

- New scoring dimensions or weight changes (separate FEAT).
- Discrepancy engine (FEAT-233).
- Cost-advise (FEAT-234).

## Effort estimate

~2 weeks. Smaller than FEAT-233 (no new logic — port verbatim), larger than FEAT-234 (entity + handler + shadow job + 3 consumer flips).

## Related

- Parent audit: `docs/superpowers/specs/2026-06-19-m7-scanner-decommission-audit.md`.
- Sibling: FEAT-233, FEAT-234 pre-flights.
- Unblocks: FEAT-236 along with FEAT-233 + FEAT-234.
