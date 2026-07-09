---
id: PM-REVIEW-FEAT-248
feature: FEAT-248
reviewed_at: 2026-07-09
pm_customer_impact: 0.4
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.5
pm_technical_risk: 0.6
pm_dependency_depth: 0.3
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-248

## Demand Assessment

- **Evidence:** Quoted from `.claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md` line 106-109 (under A3): "Backfill assist [S, optional]: plugin one-shot emits synthetic backlog transition events from done-FEAT frontmatter (created/started_at/completed_at) so windows populate before weeks of live data accumulate. Marked backfilled: true in payload." And the plan's own Data-lag caveat (line 141-145): "CFR/MTTR windows (7d/30d) only fill with live events after A2 ships. Without backfill, charts meaningful ~1-4 weeks post-deploy." Stakeholder: same DORA dashboard consumers as FEAT-247, but this is explicitly the optional convenience sub-scope, not the load-bearing fix -- the plan itself labels it `[S, optional]`. Current workaround: wait 1-4 weeks for live events to accumulate naturally (tolerable, not broken) -- this is why customer_impact is scored below FEAT-247's.

## Scope Challenge

- **Scope notes:** Smallest deliverable per `.claude/artifacts/crew/runs/2026-07-07-dora-acs-eta.md` section A3 AC-6: a new module (plan suggests `src/scripts/lib/backlog-backfill-emitter.mts`) plus a one-shot `loop.mts` CLI subcommand that walks done-FEAT frontmatter and emits synthetic `loop.backlog_state_changed` events marked `backfilled: true`. Confirmed no existing capability overlaps: `grep -rn backfill src/scripts/lib/` returns zero matches on disk. Dependency (Framework 3): task brief and FEAT-248 body both state "Depends on FEAT-247 (A2 field conformance) only -- not on astrarunner's A3 SQL." FEAT-248.md frontmatter currently shows `depends_on: []` -- this should be corrected to `depends_on: ["FEAT-247"]` via the backlog tooling (PM has no Edit access to backlog files per the pm agent boundary; flagging here for pm-apply / a follow-up `/runner:backlog-*` command) since this repo's `depends_on` only resolves same-repo ids and both FEATs are same-repo. Effort calibration (Framework 5): single new module + CLI subcommand + unit test is comparable in shape to FEAT-204/SLICE-137 ($14.46, 20.0min) and FEAT-205/SLICE-138 ($19.73, 20.4min) single-dispatch analogs, but effort_estimate is set slightly higher (0.35 vs FEAT-247's 0.3) because this is new code with no existing pattern to extend (FEAT-247 extends an emitter interface that already declares the fields it needs), consistent with the plan's own '[S, optional]' sizing and the ETA table's '+0.5 day' backfill-assist estimate layered onto the A3 slice count. Maps to 3 Fibonacci points via pm-effort-mapper.mts -- under the 8-point decomposition-gate threshold, no proposed_slices block needed. Grade weak-dimension check: last-5 grade averages (loop-snapshot.md) all >= 0.80, no weak dimension to target. Lessons digest (SLICE-95..99) has no lesson naming this FEAT's domain directly.

## Scores

- customer_impact: 0.40
- effort_estimate: 0.35
- strategic_alignment: 0.50
- technical_risk: 0.60
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: New single module + CLI subcommand, no existing pattern to extend (unlike FEAT-247's field-forwarding into an already-declared interface), technical_risk 0.6 (schema/data-shape band: synthetic events persist cross-repo in astrarunner's append-only event store, rollback needs targeted row cleanup not a plain git revert) triggers the mandatory pre-mortem; explicitly optional/convenience scope with a tolerable workaround (wait for live data) keeps customer_impact and priority below FEAT-247's -> P2, autonomousSafe false pending human review of partial-frontmatter and idempotency handling; effort 0.35 (3 points) calibrated against FEAT-204/205 single-dispatch analogs, no decomposition gate triggered; blocked on FEAT-247 shipping first (dependency_depth 0.3, single unresolved same-repo dependency, not yet reflected in FEAT-248.md's depends_on frontmatter).

## Risks

- Pre-mortem Q1 (why review/validation could fail in 2 weeks): the emitter may double-count or fabricate transition timestamps for FEATs with partial frontmatter (e.g. `completed_at` set but `started_at` missing, from a fast pending-to-done move) producing synthetic events that skew astrarunner's LeadTime aggregation with incorrect durations -- caught late because a unit test asserting envelope *shape* + the `backfilled` flag (per AC-6) does not by itself assert correctness against realistic partial-data fixtures.
- Pre-mortem Q2 (rollback mechanics): NOT a simple git revert. This emitter's output is a live webhook fanout that astrarunner's `RawEnvelopeHandler` persists append-only (per the plan's Current-state section, line 37-40) -- a buggy run's `backfilled: true` rows must be identified and deleted from astrarunner's `loop_events` table (cross-repo data cleanup), then re-run only after the fix ships. This is the schema/data-shape band's 'rollback needs migration or state cleanup' case, not a plugin-side-only revert -- the `backfilled` flag at least makes the affected rows identifiable, which bounds (but does not eliminate) the cleanup cost.
- Pre-mortem Q3 (coverage gap an existing test won't catch): none of today's `backlog-state-emitter`-style tests exercise reading real done-FEAT frontmatter files or walking the whole `done/` directory -- they hand-construct the `BacklogStateChangedInput` directly. A bug in the frontmatter-walking/aggregation loop (wrong glob, off-by-one on directory nesting, silently skipping FEATs) would slip past all existing emitter-level tests since none of them derive input from disk the way this new one-shot scanner must.
- Because this FEAT writes synthetic historical data into a downstream, cross-repo, append-only event store with cleanup-on-error cost higher than this repo's own git history, autonomousSafe is set false pending a human review of the partial-frontmatter handling and idempotency/re-run behavior described in AC-2/AC-3 below -- this is a stricter bar than FEAT-247 despite the smaller code footprint.
