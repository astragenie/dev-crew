---
id: PM-REVIEW-FEAT-247
feature: FEAT-247
reviewed_at: 2026-07-09
pm_customer_impact: 0.55
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-247

## Demand Assessment

- **Evidence:** Quoted from `.claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md` line 27-31: "backlog-writer.mts::moveFeature (:219-223) emits only {featId, fromState, toState}; priority/category/relates_to/createdAt are parsed into existingFm (:185) but never forwarded -> CFR + MTTR have zero live signal." Confirmed on disk: `src/scripts/lib/backlog-writer.mts:214-224` (moveFeature's live emitBacklogStateChanged call) passes only featId/fromState/toState, while `src/scripts/lib/backlog-state-emitter.mts:20-58` (BacklogStateChangedInput) already declares and accepts priority/category/relates_to/createdAt as optional fields with explicit comments "DORA: priority tier ... Required for MTTR P0 detection" / "Required for CFR fix detection". Stakeholder: astrarunner's DORA dashboard consumers / the loop's own telemetry mission (blocks astrarunner's A3 aggregation FEAT per plan Sequencing section: "A3 (needs A2 fields flowing)").

## Scope Challenge

- **Scope notes:** Smallest deliverable = exactly plan item A2: (1) forward priority/category/relates_to/createdAt out of existingFm in moveFeature, (2) add an integration test through moveFeature itself (current test only exercises the emitter directly per plan line 65-67), (3) dual-emit ts in grade-writer.mts and slice-events.mts alongside recordedAt/timestamp, (4) update grade-event.schema.json + agent-dispatch.schema.json to require ts, tolerate legacy names. Nothing to cut further -- all four pieces are one cohesive AC set per the pre-drafted ACs in `.claude/artifacts/crew/runs/2026-07-07-dora-acs-eta.md` section A2. No overlap with existing capability -- grep confirms `src/scripts/lib/backlog-state-emitter.mts` already accepts these fields (dead capability today, this FEAT activates it) and `grep -rn backfill src/scripts/lib/` returns zero hits (FEAT-248's module doesn't exist yet, no double-build risk). Effort calibration (Framework 5): blast radius (3 emitter/writer modules + 2 schema files) closely matches the DORA-schema slice cluster FEAT-203/SLICE-136 ($7.74, 15.6min, single dispatch, `.claude/artifacts/crew/cost/20260701T233140Z-cost-report-slice-feat203-slice136.md`), FEAT-204/SLICE-137 ($14.46, 20.0min) and FEAT-205/SLICE-138 ($19.73, 20.4min) -- all single-project, single-subagent-dispatch, non-aggregate reports. effort_estimate 0.3 (-> 3 Fibonacci points via pm-effort-mapper.mts bands) is consistent with those actuals; well under the 8-point decomposition-gate threshold (FEAT-168), so no proposed_slices block needed. Grade weak-dimension check (Framework 4): last-5 grade averages in loop-snapshot.md are all >= 0.80 (architecture_quality 0.846, reliability 0.86, observability 0.82, production_readiness 0.872, security 0.88, test_confidence 0.914, product_completeness 0.844) -- no weak dimension to target with a dedicated AC this cycle. Lessons digest (`bun src/scripts/loop.mts lessons recent 5`, SLICE-95..99) has no lesson naming this FEAT's domain (event-schema conformance / DORA field forwarding) -- none quoted, none apply directly.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.30
- strategic_alignment: 0.65
- technical_risk: 0.45
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: Small, mechanical, additive field-forwarding + dual-emit into an emitter interface that already declares these fields (technical_risk 0.45, band: new pattern across 3 modules + 2 schema files but no new dependency and clean git-revert rollback since no historical data is mutated); real evidenced pain (CFR/MTTR have zero live signal) plus it unblocks astrarunner's A3 cross-repo FEAT, architect-reviewed and APPROVED-WITH-CONDITIONS -> P1, autonomous_safe true given pre-drafted, testable Given-When-Then ACs and a clean rollback path; effort 0.3 (3 points) confirmed against three same-domain cost analogs (FEAT-203/204/205), no decomposition gate triggered.

## Risks

- Pre-mortem Q1 (why review/validation could fail in 2 weeks): the new moveFeature integration test may under-cover the negative case (AC-2: relates_to must be explicit null, not omitted) or trip on `deriveRepoRootFromBacklogPath`'s path-depth assumption (`src/scripts/lib/backlog-writer.mts:236-240`) if the test harness doesn't lay out `.claude/artifacts/loop/backlog/<state>/<file>.md` at the canonical depth -- reviewer would flag insufficient AC coverage rather than a functional bug.
- Pre-mortem Q2 (rollback mechanics): revert-only. The change is additive/dual-emit -- no historical rows are mutated, only forward event emission changes -- so `git revert` of the squashed commit is sufficient PROVIDED the schema-file edits (grade-event.schema.json, agent-dispatch.schema.json) are reverted in the same unit; reverting only the producer code while leaving `ts` required in schema would break CI schema-validation on the reverted producers.
- Pre-mortem Q3 (coverage gap an existing test won't catch): the current emitter-level test (calls `emitBacklogStateChanged` directly) already passes today and would KEEP passing even if `moveFeature` regressed to never forwarding the new fields, because it never exercises the live `moveFeature` call path -- this is verbatim the gap the plan's cross-repo review flagged ("CI green currently proves nothing about the live path") and is exactly what this FEAT's AC-1 closes.
- Cross-repo coordination risk (plan Risk #2, quoted): "Dual-emit/tolerance window adds temporary schema ambiguity -- bound it (one release cycle) and record removal as follow-up chore." This repo's AC-5 (astrarunner ingest handler tolerating legacy timestamp names) is tracked under astrarunner's own FEAT, not this slice -- if that side doesn't land in sync, downstream ingestion could still rely on legacy fields past the intended one-cycle window.
