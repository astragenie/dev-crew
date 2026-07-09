# DORA implementation plan (standalone Track A) — 2026-07-07

**Status: APPROVED-WITH-CONDITIONS** (opus architect-reviewer, 2026-07-07).
Conditions folded in below (marked [COND-n]).

Scope: DORA four-keys correctness only. Watcher/provider work lives in
`2026-07-07-dora-watcher-provider-plan.md` (Tracks B/C) and proceeds
independently. Source review:
`.claude/artifacts/crew/reviews/2026-07-07-dora-cross-repo-review.md`
(all claims below fact-checked with file:line evidence by opus researcher
2026-07-07).

## Current state (validated)

- Only DeployFreq has real aggregation, and it counts dev-loop slice closes
  (`loop_events` `kind='slice.workflow_state_changed' AND toState='done'`),
  not deployments.
- LeadTime/CFR/MTTR are stubbed 0.0 in `dora_metrics_mv`
  (`Migrations/20260627090402_Feat203_DoraMetricsAndFeatureFlags.cs:50-95`).
- `DoraController.Project()` (DoraController.cs:116-125) ignores the MV
  `Tier` column and classifies via `DoraTierClassifier` — thresholds are
  "lower is better, <= Elite", so 0.0 → **Elite** for all three stub
  metrics. Every tenant sees fabricated best-possible ratings.
- Dashboard `dora.ts:132-146` returns hand-tuned mock data on ANY error/
  404/empty — no visible mock affordance.
- Plugin side: `backlog-writer.mts::moveFeature` (:219-223) emits only
  `{featId, fromState, toState}`; `priority/category/relates_to/createdAt`
  are parsed into `existingFm` (:185) but never forwarded → CFR + MTTR have
  zero live signal. Frontmatter values exist (pm.md:198-200 writes
  category/relates_to; backlog-writer.mts:42,191-196 stamps
  created/started_at/completed_at).
- Timestamp drift: canonical field is `ts` (FEAT-203 +
  slice-event.schema.json:6,11); `grade-writer.mts:372,388,394` emits
  `recordedAt`; `slice-events.mts:30` emits `timestamp`;
  `grade-event.schema.json` / `agent-dispatch.schema.json` codify the
  drifted names. Backlog emitter already compliant.
- Ingest side already persists every `loop.backlog_state_changed`
  transition append-only (`BacklogStateHandler.cs` + `RawEnvelopeHandler`
  invoked first unconditionally) — per-transition history exists; the MV
  just doesn't query it yet.

## Work items

### A1 — honesty hotfix (astrarunner) [S]

- `DoraController.Project()` returns `implemented: false` (new DTO field)
  for LeadTime/Cfr/Mttr while their MV values are stubs; do NOT classify
  stub 0.0. (Alternative considered: serve MV `Tier` — rejected, still
  shows fake 'Low' as if measured.)
- Dashboard: render explicit "not yet measured" state for
  `implemented: false` metrics (DoraWidget + DoraDetail).
- `dora.ts` mock fallback: mock ONLY behind explicit mock/dev flag; real
  errors surface as error/disabled state, 404 (feature off) renders
  feature-disabled state.
- [COND-2] Overall tier semantics under partial implementation: Overall =
  worst tier over `implemented: true` metrics ONLY. Stub-derived tiers must
  not fold into Overall (else the Elite-bug just moves one layer down).
- Tests: controller test asserting stub metrics are not classified Elite
  and excluded from Overall; FE test for not-measured + error states.

### A2 — event-field conformance (plugin) [S-M]

- `moveFeature` forwards `priority`, `category`, `relates_to`, `createdAt`
  (from `created`) out of `existingFm` into `emitBacklogStateChanged`.
- Integration test through `moveFeature` (existing test only exercises the
  emitter directly — CI green currently proves nothing about the live
  path).
- Timestamp normalization to canonical `ts` at all producers:
  `grade-writer.mts` and `slice-events.mts` emit `ts` alongside existing
  fields (dual-emit for deprecation window); schemas
  (`grade-event.schema.json`, `agent-dispatch.schema.json`) updated to
  require `ts`, tolerate legacy names.
- Ingest side (astrarunner): handlers accept `ts` with fallback to
  `recordedAt`/`timestamp` for the window; no rewrite of already-stored
  rows (readers use COALESCE-style resolution instead).

### A3 — real LeadTime/CFR/MTTR aggregation (astrarunner) [M — only via
raw-jsonb CTE route; typed-projection alternative would be L]

New MV SQL per FEAT-203 signal definitions, querying persisted transition
history.

- [COND-1] **Query source is `loop_events` raw payload jsonb extraction**
  (same idiom as existing DeployFreq CTE) — NOT the `BacklogFlow` projection
  table. Rationale: `BacklogStateHandler.cs` extracts only
  featId/toState/fromState/ts and `BacklogFlow` has no columns for
  priority/category/relates_to/createdAt; A2's new envelope fields reach the
  DB only via `RawEnvelopeHandler`'s verbatim payload persistence. Do NOT
  add BacklogFlow columns/migration — explicit non-goal here. If pilot query
  performance forces typed projection columns later, that is a separate
  L-sized FEAT (see sizing branch below).
- [COND-4, watch-item] jsonb-extraction query cost on `loop_events` at
  refresh time — monitor post-ship (refresh duration metric), not a blocker.

- LeadTime: `grade.recorded` ts − first `loop.backlog_state_changed`
  `toState=triaged` ts per featId (rolling window).
- CFR: closes with `category=fix` AND `relates_to` set / all closes, 7d
  window.
- MTTR (interim proxy): `priority=P0` featId triaged→done duration.
  Labeled "interim — P0 feature turnaround, not SRE incident MTTR" in
  DTO/UI.
- Flip `implemented: true` per metric as its SQL lands; tier classification
  resumes via `DoraTierClassifier` on real values.
- Test the aggregation SQL itself (Testcontainers/pg integration test) —
  current suite mocks the repository; MV SQL has zero coverage.
- Backfill assist [S, optional]: plugin one-shot emits synthetic
  backlog transition events from done-FEAT frontmatter
  (`created/started_at/completed_at`) so windows populate before weeks of
  live data accumulate. Marked `backfilled: true` in payload.

### A4 — real deployment signal (astrarunner + infra) [M, gated on DEC]

- BLOCKER: superseding decision record required — FEAT-203's accepted AC
  defines DeployFreq as slice `toState=done`; changing that contradicts a
  done FEAT. Proposal: current metric renamed "Dev velocity" (kept, it's
  useful); DeployFreq re-pointed at real deploy events.
- [COND-3] The DEC must explicitly decide `deployFreq` DTO key continuity:
  either (a) key silently repoints to the new signal (breaks trend-chart
  history comparability under unchanged name), or (b) new key
  (`devVelocity`) ships alongside, `deployFreq` keeps meaning the proxy
  until a follow-up migration. Product-facing choice — belongs in the DEC
  text, not left to a builder/doc-writer.
- Ingestion: GitHub Deployments/Releases webhook (or CD pipeline callback —
  decide per actual CD setup) → new event kind `deploy.recorded` →
  `ILoopEventHandler` → feeds DeployFreq CTE.
- Threshold dedup: single source for tier cutoffs (classifier), MV stops
  carrying its own rounded literals.

### A5 — incident model (later) [L, gated on product decision]

- True MTTR needs incident open/resolve events; P0 proxy (A3) holds until
  product defines incident source (alerting? manual? astrarunner ops?).
  Out of scope for this plan's ETA; listed for completeness.

## Sequencing

A1 ∥ A2 (independent, start together) → A3 (needs A2 fields flowing) →
A4 (needs DEC) → A5 (needs product decision). Backfill assist any time
after A2.

## Data-lag caveat

CFR/MTTR windows (7d/30d) only fill with live events after A2 ships.
Without backfill, charts meaningful ~1-4 weeks post-deploy; with backfill,
immediately for lead-time-like metrics, CFR still needs real fix-closes.

## Risks

1. MV SQL untested today — A3 must add pg-level tests, not extend the mock
   suite.
2. Dual-emit/tolerance window adds temporary schema ambiguity — bound it
   (one release cycle) and record removal as follow-up chore.
3. A4 webhook auth/delivery reliability (missed deploy events skew
   DeployFreq) — needs resync path similar to existing
   LoopResyncCoordinator.
4. Renaming DeployFreq without DEC breaks FEAT-203 traceability — DEC is a
   hard gate.
5. Multi-tenant: deploy webhook ingestion must map repo → tenantId/appId
   (same mapping problem as watcher B2 — reuse one mapping source).
