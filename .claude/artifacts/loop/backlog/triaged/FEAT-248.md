---
id: FEAT-248
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-247]
tags: [dora, telemetry, tooling]
needs_contract: false
needs_ux: false
slices: []
derived_from: null
pm_customer_impact: 0.4
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.5
pm_technical_risk: 0.6
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-07-09
autonomous_safe: false
triage_notes: "New single module + CLI subcommand, no existing pattern to extend (unlike FEAT-247's field-forwarding into an already-declared interface), technical_risk 0.6 (schema/data-shape band: synthetic events persist cross-repo in astrarunner's append-only event store, rollback needs targeted row cleanup not a plain git revert) triggers the mandatory pre-mortem; explicitly optional/convenience scope with a tolerable workaround (wait for live data) keeps customer_impact and priority below FEAT-247's -> P2, autonomousSafe false pending human review of partial-frontmatter and idempotency handling; effort 0.35 (3 points) calibrated against FEAT-204/205 single-dispatch analogs, no decomposition gate triggered; blocked on FEAT-247 shipping first (dependency_depth 0.3, single unresolved same-repo dependency, not yet reflected in FEAT-248.md's depends_on frontmatter)."
---
## Description

DORA backfill-assist (plan item A3 sub-scope, plugin side, optional): one-shot emitter that walks done-FEAT frontmatter (created / started_at / completed_at) and emits synthetic loop.backlog_state_changed transition events marked backfilled: true, so astrarunner's DORA rolling windows (LeadTime etc.) populate immediately instead of waiting 1-4 weeks for live events. New module (e.g. src/scripts/lib/backlog-backfill-emitter.mts) plus a one-shot loop.mts CLI subcommand. Unit test asserts envelope shape + backfilled flag. Depends on FEAT-247 (A2 field conformance) only — not on astrarunner's A3 SQL; can ship and run in parallel with A3. Source plan: .claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md (backfill assist under item A3); AC in 2026-07-07-dora-acs-eta.md section A3 AC-6.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1 (happy path, adapted from plan A3 AC-6): Given a done FEAT file with `created`, `started_at`, `completed_at` set in frontmatter, When the new one-shot backfill emitter module (e.g. `src/scripts/lib/backlog-backfill-emitter.mts`) runs via its `loop.mts` CLI subcommand, Then it emits one synthetic `loop.backlog_state_changed` envelope per recorded transition (triaged, in-progress, done) for that FEAT, each payload extending `BacklogStateChangedInput` (src/scripts/lib/backlog-state-emitter.mts) with `backfilled: true` -- evidenced by a unit test asserting envelope shape (featId/fromState/toState/ts/backfilled) for a seeded done-FEAT fixture.
- AC-2 (edge/error path -- partial frontmatter): Given a done FEAT file with `completed_at` set but `started_at` missing (e.g. moved directly pending-to-done without an in-progress stop), When the backfill emitter processes it, Then it skips emitting a synthetic transition for the missing state and does NOT fabricate a timestamp -- evidenced by a unit test seeding a FEAT with `completed_at` but no `started_at`, asserting only transitions with real recorded timestamps are emitted.
- AC-3 (idempotency / re-run safety): Given the backfill emitter has already emitted synthetic events for a FEAT in a prior run, When the one-shot CLI subcommand is invoked again against the same done-FEAT set, Then it does not emit duplicate synthetic events for the same FEAT/transition pair (e.g. via an on-disk or in-payload marker checked before emit, or an explicit `--force` re-emit flag) -- evidenced by a test asserting a second run against the same fixture set produces zero additional emitted envelopes without `--force`.
- AC-4 (CLI contract): Given an operator runs the one-shot backfill CLI subcommand against a repo with N done FEATs, When it completes, Then it prints a summary count of FEATs scanned and synthetic events emitted, and exits `0` on success -- evidenced by a CLI test asserting exit code and a summary line containing both counts.
