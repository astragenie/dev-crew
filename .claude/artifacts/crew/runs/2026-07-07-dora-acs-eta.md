# DORA implementation — ACs, autonomous_safe, ETA — 2026-07-07

Input: `2026-07-07-dora-implementation-plan.md` (APPROVED-WITH-CONDITIONS, opus
architect-reviewer). Companion facts: `.claude/artifacts/crew/reviews/2026-07-07-dora-cross-repo-review.md`.
Scope: A1–A4 (A5 excluded — product-gated, no ETA attempted). ACs follow the
FEAT-277 inline-AC contract (`agents/pm.md` § "Inline AC + SPEC drafting") —
Given-When-Then, each naming its evidence.

## A1 — honesty hotfix (astrarunner)

**ACs**

- AC-1: Given the DORA MV row for LeadTime/Cfr/Mttr holds stub value `0.0`, When `DoraController.Project()` builds the response DTO, Then each stub metric's `implemented` field is `false` and its `tier` is NOT `"Elite"` — evidenced by a `DoraControllerTests` case asserting `implemented=false` and `tier != Elite` for all three stub metrics.
- AC-2 [COND-2]: Given Overall-tier computation with one or more `implemented=false` metrics, When Overall is derived, Then it equals the worst tier over `implemented=true` metrics only — evidenced by a controller test seeding DeployFreq=Elite (real) + 3 stubs and asserting Overall == DeployFreq's tier, not a value degraded by stub-derived tiers.
- AC-3: Given `dora.ts` receives a non-2xx/network error with no explicit mock/dev flag set, When the dashboard fetches DORA data, Then it renders an error/disabled state, not the hardcoded "High tier" mock — evidenced by a FE test asserting no mock payload renders on fetch rejection.
- AC-4: Given a `404` (feature flag off) response, When `DoraWidget` renders, Then it shows a feature-disabled state distinct from the error state — evidenced by a FE test asserting distinct UI text/state for 404 vs 5xx.
- AC-5: Given a metric with `implemented: false`, When `DoraDetail` renders it, Then it shows an explicit "not yet measured" label instead of a tier badge — evidenced by an RTL/snapshot test.

**autonomous_safe: true** — mechanical honesty fix (DTO field + controller branch + FE state rendering), no schema/data-shape change, tests specified per AC.

## A2 — event-field conformance (runner-plugin)

**ACs**

- AC-1: Given a FEAT frontmatter with `priority`, `category`, `relates_to`, `created` set, When `moveFeature` transitions the FEAT, Then `emitBacklogStateChanged` receives all four fields (not just `featId/fromState/toState`) — evidenced by a new integration test that invokes `moveFeature` itself (the existing test only calls the emitter directly, per the review's finding that CI green proves nothing about the live path).
- AC-2: Given a FEAT frontmatter missing `relates_to`, When `moveFeature` runs, Then the emitted envelope carries `relates_to: null` explicitly (not omitted) — evidenced by the same integration test's negative case.
- AC-3: Given `grade-writer.mts` and `slice-events.mts` construct an event payload, When emitted, Then each includes a `ts` field alongside its existing `recordedAt`/`timestamp` field (dual-emit) — evidenced by unit tests on both emitters asserting both keys present with equal values.
- AC-4: Given `grade-event.schema.json` / `agent-dispatch.schema.json`, When validated against a payload missing `ts`, Then validation fails; When validated with `ts` present and legacy names absent, Then it still passes — evidenced by schema-validation tests for both cases.
- AC-5 (cross-repo): Given an astrarunner ingest handler receives an envelope carrying only a legacy timestamp field, When it processes the event, Then it falls back to `recordedAt`/`timestamp` without erroring — evidenced by an astrarunner-side handler test tracked under that repo's own FEAT (not this repo's slice).

**autonomous_safe: true** — additive/optional fields, mechanical forwarding, dual-emit is a bounded, tolerant transition; existing test pattern extends cleanly.

## A3 — real LeadTime/CFR/MTTR aggregation (astrarunner)

**ACs**

- AC-1: Given persisted `loop_events` rows for a featId's `toState=triaged` transition and its `grade.recorded` event, When the new LeadTime MV SQL runs, Then it computes the duration between first `triaged` ts and `grade.recorded` ts per featId within the rolling window — evidenced by a Testcontainers/pg integration test seeding raw jsonb rows and asserting the computed value.
- AC-2: Given closed FEATs in a 7-day window where `category=fix` AND `relates_to` is set, When the CFR SQL runs, Then CFR = (matching closes) / (all closes) for that window — evidenced by a pg integration test with a mixed seed (fix+relates_to / fix without / non-fix) asserting the exact ratio.
- AC-3: Given a featId with `priority=P0` transitioning `triaged`→`done`, When the MTTR (interim proxy) SQL runs, Then it returns that duration AND the DTO/UI label reads "interim — P0 feature turnaround, not SRE incident MTTR" — evidenced by a controller/DTO test asserting the label string plus a pg test asserting the value.
- AC-4 [COND-1]: Given the query source decision, When A3's SQL is authored, Then it reads `loop_events` raw payload jsonb via the same CTE idiom as the existing DeployFreq query and does NOT add columns/migrations to `BacklogFlow` — evidenced by migration-diff review confirming zero `BacklogFlow` schema changes.
- AC-5: Given a metric's new SQL has landed and is verified, When `DoraController.Project()` builds the DTO, Then that metric's `implemented` flips to `true` and tier classification resumes via `DoraTierClassifier` on the real value — evidenced by a controller test added per metric as it lands.
- AC-6 (backfill-assist, optional, runner-plugin side): Given a done FEAT with `created/started_at/completed_at` in frontmatter, When the plugin's one-shot backfill emitter runs, Then it emits synthetic `loop.backlog_state_changed` events marked `backfilled: true` for that FEAT's transitions — evidenced by a runner-plugin unit test asserting envelope shape + the `backfilled` flag.

**autonomous_safe: false** — new MV SQL with zero existing pg-integration coverage in this codebase today (plan's Risk #1); a materialized-view rewrite is a data-shape change, landing in the PM technical_risk 0.6–0.8 band (new pattern + schema/data-shape change per `agents/pm.md` rubric). Needs human review of aggregation correctness before merge, on top of the hard dependency on A2 shipping first.

## A4 — real deployment signal (astrarunner + infra)

**ACs**

- AC-1 [COND-3, hard gate]: Given the DEC on `deployFreq` key continuity has NOT been recorded, When any builder attempts A4, Then work MUST NOT proceed — this is a prerequisite, not a builder judgment call.
- AC-2a: Given the DEC resolves to option (a) key-repoint, When the new deploy-signal SQL lands, Then the `deployFreq` DTO key's meaning changes and pre-cutover trend-chart history is documented as non-comparable — evidenced by a CHANGELOG/release-note entry (and a UI disclaimer if the DEC requires one).
- AC-2b: Given the DEC resolves to option (b) new key, When the new deploy-signal SQL lands, Then a new `devVelocity` key ships alongside the unchanged `deployFreq` proxy — evidenced by a controller test asserting both keys present with their respective sources.
- AC-3: Given a GitHub Deployments/Releases webhook (or CD callback) delivers a `deploy.recorded` event, When `ILoopEventHandler` processes it, Then it feeds the DeployFreq CTE and is retrievable via the DORA endpoint — evidenced by an integration test posting a synthetic webhook payload and asserting the metric updates.
- AC-4: Given tier cutoffs today live in both `DoraTierClassifier.cs` and MV SQL literals, When A4 ships, Then the MV no longer carries its own rounded literals (classifier is single source) — evidenced by a test verifying MV output matches classifier thresholds exactly.

**autonomous_safe: false** — hard-blocked on a DEC not yet recorded; even post-DEC, webhook auth/delivery reliability and multi-tenant repo→tenant mapping are new external-dependency risk (0.6–0.8+ band per plan Risk #3/#5).

## ETA

Assumptions: single machine per repo; sequential slice-build marathon cadence (no wave-mode parallel dispatch assumed); runner-plugin's reviewer ladder is `["A"]` (single reviewer) and `validation.satisfiedByReview: true` (no separate validator dispatch) — both confirmed for this repo. **Astrarunner's own `.claude/loop.json` reviewer-ladder/validation settings are not visible from this repo** — A1/A3/A4 estimates assume a comparable single-reviewer, review-satisfies-validation setup; if astrarunner runs the two-reviewer default plus an independent validator, add ~30–50% to its slice-count ETAs.

| Item | Slices | Wall-clock | Notes |
|---|---|---|---|
| A1 | 2 (BE: DTO+controller+tests; FE: states+mock-flag+tests) | 0.5–1 day | independent BE/FE halves, can run same day |
| A2 | 2 (field-forwarding+integration test; ts dual-emit across 2 emitters+2 schemas) | 1 day | this repo, direct visibility |
| A3 | 4 core (pg/Testcontainers infra setup; LeadTime SQL+test; CFR SQL+test; MTTR SQL+test) + 1 optional (backfill-assist) | 2.5–3.5 days core, +0.5 day backfill | infra-setup slice is new-pattern risk; backfill-assist only depends on A2, can run in parallel with A3 rather than after it |
| **Total A1→A3** | **8 core (9 incl. backfill)** | **~4–5.5 days** | assumes A2 ships and is verified live in astrarunner before A3's SQL slices start |
| A4 (post-DEC) | 3 (webhook ingestion+handler; threshold-dedup refactor; DEC-driven key-continuity implementation) | 1.5–2 days after DEC lands | DEC turnaround itself is unbounded — not a loop-estimable quantity |

## Suggested FEAT split

1. **FEAT (astrarunner)** — "DORA honesty hotfix: stop classifying stub metrics as Elite" → A1. No cross-repo dependency.
2. **FEAT (runner-plugin)** — "DORA event-field conformance: forward priority/category/relates_to/createdAt + ts normalization" → A2. No inbound dependency; blocks item 3.
3. **FEAT (astrarunner)** — "Real LeadTime/CFR/MTTR aggregation via raw-jsonb CTE" → A3 core SQL. Frontmatter: `relates_to: <runner-plugin FEAT-2 id>` (cross-repo — plain `depends_on` only resolves same-repo ids) with a body note that live A2 events must be flowing before this FEAT's slices start.
4. **FEAT (runner-plugin, optional)** — "Backfill-assist: synthetic backlog-transition events from done-FEAT frontmatter" → A3's backfill-assist sub-scope, split out because it is plugin-side work, not astrarunner-side, despite being described under A3 in the plan. Depends only on FEAT-2 (A2), not on FEAT-3's SQL — can ship and run in parallel with FEAT-3.
5. **FEAT (astrarunner)** — "Real deployment signal for DeployFreq" → A4. Frontmatter should record a `blocked_by: <DEC id>` note; the DEC does not exist yet, so this FEAT should enter the backlog as `pm_composite_priority: needs-review` (PM escape valve) until the DEC is recorded, not as a scored/ready item.

That's 5 FEATs across two repos (3 astrarunner, 2 runner-plugin), one of them gated pre-score on a DEC.

## Risks affecting ETA confidence

1. **Data-lag caveat** (from the plan): CFR/MTTR windows (7d/30d) only fill with live events once A2 ships. Without the backfill-assist FEAT, charts stay meaningful only ~1–4 weeks post-deploy; CFR still needs real fix-closes regardless of backfill. This doesn't change build ETA but does change when the *feature* looks complete to a stakeholder — worth stating in FEAT-3's body so it isn't read as a bug.
2. **pg-test infra availability**: A3 requires the first Testcontainers/pg-level integration test in this area of astrarunner (current suite mocks the repository; MV SQL has zero coverage per the review). If that harness doesn't already exist in astrarunner CI, add a half-day to a day to A3's infra-setup slice — this is the single largest source of ETA uncertainty in the whole plan.
3. **DEC turnaround**: A4 cannot be scored, split into slices, or given a start date until the superseding decision on `deployFreq` key continuity [COND-3] is recorded. Treat A4's ETA as "1.5–2 days of build time, start date unknown."
4. **Cross-repo loop coordination**: A2 (runner-plugin) and A3 (astrarunner) run in two separate backlogs/loop instances. Nothing currently enforces that A3 waits for A2 to be live and verified rather than just merged — the `relates_to` frontmatter note in FEAT-3 is advisory, not a gate. A human or the astrarunner PM should confirm A2's live-path fix (the integration test through `moveFeature`, not just the emitter) is actually deployed before FEAT-3 slices start, or A3's SQL will aggregate over an empty/incomplete field set.

## AC coverage note

All ACs above are testable with named evidence (test file/kind or artifact). No AC could not be made testable — the one place I flagged rather than asserted is A4 AC-2a/2b, which forks into two mutually exclusive ACs because the DEC hasn't chosen between them yet; both are written now so intake doesn't stall a second time once the DEC lands.
