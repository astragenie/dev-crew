# DORA cross-repo review — runner-plugin + astrarunner (2026-07-07)

Objective: assess whether DORA four-keys is implemented properly end-to-end
(loop plugin → ingest → astrarunner DoraReports → dashboard), ahead of a
"implement DORA properly" effort. Two read-only Explore agents; findings below.

## Verdict

Not proper. 1 of 4 metrics has real aggregation and it measures the wrong
proxy; the other 3 are hardcoded zeros that a controller bug renders as
fabricated "Elite" tiers; the plugin-side event stream never carries the
fields those 3 metrics need; the dashboard silently substitutes mock data on
any backend failure.

## astrarunner (C:\work\mega\runner) findings

- **DeployFreq** — real SQL over `astrarunner.loop_events`
  (`kind='slice.workflow_state_changed' AND toState='done'`), but proxy is
  dev-loop slice closes, NOT production deployments. No GitHub
  Deployments/Releases webhook, no CD callback, no release-tag ingestion
  anywhere.
- **LeadTime / Cfr / Mttr** — scaffolded fakes. MV migration
  (`Migrations/20260627090402_Feat203_DoraMetricsAndFeatureFlags.cs:73-95`)
  CROSS JOINs metric names against one deploy_freq CTE; other 3 metrics get
  `COALESCE(NULL, 0.0)` + tier `'Low'`.
- **Serving bug (P0 within DORA scope)**: `DoraController.Project()`
  (`Controllers/DoraController.cs:121-125`) discards the MV `Tier` column and
  recomputes via `DoraTierClassifier.Classify(kind, 0.0)`. Since LeadTime/
  Cfr/Mttr thresholds are "≤ X → Elite", value 0.0 classifies **Elite** —
  every tenant sees best-possible ratings for 3 fake metrics.
- **FE fake fallback**: `dashboard/src/api/resources/dora.ts:120-146` returns
  a hand-tuned "High tier" mock dataset on ANY error/404/empty — no visible
  mock affordance in UI.
- No incident model, no PR/commit ingestion, no deploy-failure flag anywhere
  in Domain — CFR/MTTR cannot be computed without new ingestion sources.
- Threshold duplication: DeployFreq tier cutoffs live in both
  `DoraTierClassifier.cs` (exact fractions) and MV SQL (rounded literals).
- Tests: `DoraControllerTests` mock the repository (11 tests);
  `DoraTierClassifierTests` solid (28); zero tests exercise the MV SQL.
- Multi-tenant modeling itself is sound (tenant_id mandatory, claim-derived
  tenant with Forbid on mismatch, per-tenant feature flags).

## runner-plugin (this repo) findings

- **Emitter wired, call site not.** `backlog-state-emitter.mts:44-60`
  supports `priority/category/relates_to/createdAt`; schema
  (`schemas/loop-events/slice-event.schema.json:28-31`) defines them; but the
  only production caller `backlog-writer.mts:214-224` (`moveFeature`) emits
  only `{featId, fromState, toState}`. FEAT frontmatter HAS the values
  (pm.md fix-classification writes `category`/`relates_to`; intake writes
  `priority`) — they never reach the envelope. **Net: CFR and MTTR have zero
  live signal.** FEAT-203 is marked done but AC-2 is a no-op in the live
  path; the test only calls the emitter directly, never `moveFeature`.
- **Field-name mismatches vs FEAT-203 signal defs**: grade events carry
  `recordedAt` (grade-writer.mts:388) not `ts`; slice events carry
  `timestamp` (slice-events.mts) not `ts` per schema.
- Transport exists: generic webhook fanout (`webhook-fanout.mts` →
  `webhook-sender.mts`, Bearer + retry), URL via `LOOP_INGEST_URL` /
  ASTRARUNNER_ENV / loop.json.
- Useful untapped timestamps: FEAT frontmatter `created`, `started_at`,
  `completed_at` (backlog-writer.mts:186-196) — could backfill
  lead-time/MTTR without event history.
- Reaction machinery today: `/runner:pr-fix` (one-shot categorize+fix-plan,
  circuit breaker), `pr-watch.mts::runPrWatch` (in-process while(true) poll
  of one PR, cost ceiling + retries), `/runner:intake --from-issue`,
  `github-sync.mjs::bootstrapFromGithub` (open issues → FEAT files). **No
  scheduler anywhere** — no cron workflow, no daemon; everything one-shot.

## Fix order (proposed)

1. astrarunner hotfix: serve honest data — controller must not classify
   stubbed 0.0 as Elite (return tier from MV or mark metrics
   `implemented: false` in DTO); FE must label mock fallback or stop faking.
2. runner-plugin: forward `priority/category/relates_to/createdAt` from
   frontmatter in `moveFeature`; add integration test through `moveFeature`;
   reconcile `ts`/`recordedAt`/`timestamp` naming (or make ingest tolerant).
3. astrarunner: real LeadTime/CFR/MTTR SQL per FEAT-203 signal defs once (2)
   ships events with the needed fields; persist per-transition history on
   ingest side.
4. Real deployment signal for DeployFreq (GitHub Deployments/Releases webhook
   or CD callback) — separate FEAT; keep slice-close proxy as explicit
   "dev velocity" metric, don't sell it as deploy frequency.
5. Incident model (open/resolve events) for true MTTR — longest lead item.

## Watcher (parallel track)

No existing scheduler; recommended shape: dedicated Claude Code session per
dev machine running `/loop 5m` with a watch prompt (gh issue list + gh run
list + PR checks), reacting via `/runner:intake --from-issue`,
`/runner:pr-fix`, `/crew:fix`. Pattern to imitate: `pr-watch.mts` loop
(poll → classify → dispatch → cost ceiling + circuit breaker). Candidate
future FEAT: `/runner:watch` command encapsulating the check+react step so
the loop prompt is one line and state (seen-issue ids, attempt counts)
persists under `.claude/artifacts/loop/watch/`.
