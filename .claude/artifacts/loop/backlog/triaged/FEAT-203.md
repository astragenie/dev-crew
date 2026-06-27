---
id: FEAT-203
status: triaged
priority: P2
category: feat
target_release: null
created: 2026-06-27
updated: 2026-06-27
depends_on: []
slices: []
derived_from: null
tags: [fullstack, dashboard, observability, dora, feature-gate, cross-repo]
needs_contract: false
needs_ux: false
github_issue: null
github_milestone: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.7
pm_technical_risk: 0.55
pm_dependency_depth: 0.4
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-06-27
autonomous_safe: true
triage_notes: "P2 per composite 0.53. customer_impact 0.55: industry-standard DORA + founder/CEO visibility per body; demand evidence is competitive-parity (Pulse/Otta) + strategic, not grade-cited user pain. effort_estimate 0.65: ~18h across 5 slices, cross-repo (loop SLICE-A blocks runner SLICE-B..E), no exact cost analog — closest analogs M5.5/M6 wave FEAT-207..211 ran ~$30-50 each; 5 such slices sized 0.65 band. strategic_alignment 0.7: ships reusable feature-gate primitive that LEARN ledger, prior-failures, GEPA reuse downstream — roadmap leverage beyond DORA itself. technical_risk 0.55 (band 0.3-0.5 edging into 0.6-0.8): envelope schema bump is additive+optional (safe contract evolution), materialized view + backfill is new pattern in runner repo, feature-gate primitive is new horizontal contract; rollback for SLICE-A = git revert, SLICE-B rollback needs DROP MV + backfill cleanup — manageable. dependency_depth 0.4: SLICE-A blocks rest; runner ingest must accept new optional envelope fields; cross-repo dispatch failure named as operator-takeover risk in body. Decomposition gate (Framework 6): effort 0.65 → 13 Fibonacci points → body supplies 5 slices summing >13 points, satisfied. Weak-dim check (Framework 4): last-5 grade averages all >=0.82, no <0.80 dimension to inject extra AC for. autonomous_safe true — ACs are Given-When-Then concrete, signal definitions precise, slices well-bounded, named risks have mitigations. Pre-mortem: (1) likely failure = runner ingest rejecting new envelope fields if schema gate is too strict — mitigated by additive-optional fields per body; (2) rollback = revert SLICE-A schema + DROP MATERIALIZED VIEW dora_metrics_mv on SLICE-B revert; (3) coverage gap = no current test exercises cross-repo envelope round-trip, so SLICE-A AC1 must add a schema-contract test."
---
# FEAT-203: DORA dashboard with feature-gated rollout

## Why

Pulse (Otta's hub) computes DORA from webhook joins. We already have a richer event stream — we just don't aggregate it. Adds industry-standard delivery metrics (Deploy Frequency, Lead Time, Change Failure Rate, MTTR) plus a reusable feature-gate primitive that future telemetry features (LEARN ledger, prior-failures, GEPA) will reuse.

## What

Four DORA metrics computed from the runner event store, surfaced as a dashboard widget + drill-down page, behind a per-tenant feature flag. Tier classification (Elite/High/Medium/Low) per the 2023 DORA report bands. Default window 30d (toggle 7d/30d/90d). Per-app primary, "All apps" rollup secondary.

## Signal definitions

- **Deploy Frequency** = count of `slice.workflow_state_changed` events with `toState=done` per rolling window.
- **Lead Time** = median(`grade.recorded.ts` − `loop.backlog_state_changed` first `toState=triaged` ts) per window.
- **Change Failure Rate** = count(FEATs with `category=fix` AND `relates_to` pointing at a FEAT that closed within prior 7d) / count(all closes), per window.
- **MTTR** = median(time from `loop.backlog_state_changed` `toState=triaged` with `priority=P0` → `toState=done` for same featId) per window.

## Loop-side envelope gap (needs SLICE-A first)

Current `loop.backlog_state_changed` payload (`src/scripts/lib/backlog-state-emitter.mts:36-44`) carries only `{featId, fromState, toState, ts}`. Missing for DORA:

- `priority` (P0..P4) — MTTR needs P0 detection
- `category` (feat|fix|chore) — CFR needs fix detection
- `relates_to` (FEAT-N | null) — CFR needs link from fix → original
- `createdAt` (ISO ts) — Lead time start anchor

`slice.workflow_state_changed` with `toState=done` covers deploy-frequency. `grade.recorded` covers tier-classifier overlay.

## Acceptance criteria

- AC-1: Given a FEAT moves between backlog states, When `emitBacklogStateChanged` fires, Then the envelope carries `priority` (P0..P4), `category` (feat|fix|chore), `relates_to` (string|null), `createdAt` (ISO ts) in addition to existing `featId/fromState/toState/ts`, AND `schemas/loop-events/slice-event.schema.json` is updated, AND `bun run lint` clean + `bun test src/tests/` green.
- AC-2: Given PM agent scores a FEAT during `/runner:intake` or `/runner:triage`, When the FEAT title matches `^(fix|hotfix):` OR body declares `relates_to:`, Then the frontmatter gets `category: fix` + `relates_to: FEAT-N`, AND the emit path reads these fields onto the envelope.
- AC-3: Given the runner ingest receives `loop.backlog_state_changed` + `slice.workflow_state_changed` + `grade.recorded` events, When the materialized view `dora_metrics_mv` refreshes (every 5 min default, configurable via `Features:Dora:RefreshSeconds`), Then it exposes one row per `(tenantId, appId, window, metric, value, tier)`, AND a backfill SQL replays history from event-store `min(ts)`, runs once on first materialized-view create, skipped if event count > 1M.
- AC-4: Given a `Features:Dora:Enabled` flag in appsettings AND optional `TenantFeatureFlag` row per-tenant override, When any endpoint or page guarded by `[FeatureGate("dora")]` / `<FeatureGate name="dora">` is hit by a tenant with the flag off, Then backend returns HTTP 404 with `{feature, state: "disabled"}` body, AND frontend hides the nav link + redirects the route, AND the primitive is reusable for non-DORA features, AND a 60s in-process cache covers per-request flag lookups.
- AC-5: Given feature enabled for tenant, When `GET /api/v1/dora?window=7d|30d|90d&tenantId=X&appId=Y` is called with valid AppToken, Then response is `{window, computedAt, metrics:{deployFreq, leadTime, cfr, mttr}, tier:{deployFreq, leadTime, cfr, mttr, overall}}`, AND auth uses existing `lrt_*` bearer, AND 401 on missing/invalid token, 404 on feature disabled, AND `appId=all` returns the rollup across all apps in the tenant.
- AC-6: Given feature enabled, When tenant lands on `/dashboard`, Then top-right widget shows 4 metric cards with tier-colored band (green elite, blue high, yellow medium, red low), AND each card links to `/dashboard/dora?metric=<name>`, AND polls every 5 min via existing Tier 0 `refetchInterval`.
- AC-7: Given feature enabled AND `/dashboard/dora` route hit, When the page mounts, Then it renders 4 recharts line charts (last 90d trend per metric) + window toggle (7d/30d/90d, default 30d) + tier-band overlay + per-app filter + "All apps" rollup option, AND SSE live-pill shows freshness <= 30s, AND default window selection persists in localStorage per user.
- AC-8: Given a tenant-admin opens settings, When they toggle the DORA feature, Then flag persists in `tenant_features` row, AND the change reflects in `/api/v1/me.features` within 30s, AND backend view-refresh job skips work when disabled (no wasted CPU).

## Slices

- SLICE-A (loop, plugin-dev, ~3h): envelope + schema bump + PM contract — AC-1, AC-2
- SLICE-B (runner, be, ~6h): read-model + materialized view + backfill + feature-gate primitive — AC-3, AC-4
- SLICE-C (runner, be, ~3h): REST endpoint + tier-classifier + tests — AC-5
- SLICE-D (runner, fe, ~4h): home widget + detail page + featureGate component + recharts — AC-6, AC-7
- SLICE-E (runner, fullstack, ~2h): tenant toggle UI + persistence — AC-8

Sequencing: SLICE-A solo first → SLICE-B solo → SLICE-C + SLICE-D wave-parallel → SLICE-E last.

## Effort estimate

~18h ≈ 2 days. Adds reusable feature-gate primitive.

## Risks

- New envelope fields may break older runner ingest consumers — mitigate by making all new fields optional with sensible defaults.
- Backfill on 6mo of events could be slow — cap at 1M events.
- Per-tenant flag check on every request — mitigate with 60s in-process cache.
- Cross-repo dispatch failures (loop SLICE-A blocks all runner slices) — operator takeover after 10min stuck per established pattern.

## Out of scope

- 5th DORA metric (Reliability/SLO)
- GitHub-tag-based deploy detection
- Cross-tenant DORA benchmarking (privacy)
- A/B per-user feature flag tier (global + per-tenant only for v1)
- GEPA ledger integration (separate FEAT)
