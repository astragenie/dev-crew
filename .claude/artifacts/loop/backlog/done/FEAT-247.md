---
id: FEAT-247
status: done
priority: P1
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: []
tags: [dora, telemetry, observability, workflow]
needs_contract: false
needs_ux: false
slices: [SLICE-147]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Small, mechanical, additive field-forwarding + dual-emit into an emitter interface that already declares these fields (technical_risk 0.45, band: new pattern across 3 modules + 2 schema files but no new dependency and clean git-revert rollback since no historical data is mutated); real evidenced pain (CFR/MTTR have zero live signal) plus it unblocks astrarunner's A3 cross-repo FEAT, architect-reviewed and APPROVED-WITH-CONDITIONS -> P1, autonomous_safe true given pre-drafted, testable Given-When-Then ACs and a clean rollback path; effort 0.3 (3 points) confirmed against three same-domain cost analogs (FEAT-203/204/205), no decomposition gate triggered."
started_at: 2026-07-09
github_issue: 409
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/409"
slices_complete: [SLICE-147]
completed_at: 2026-07-10
---
## Description

DORA event-field conformance (plan item A2): moveFeature in src/scripts/lib/backlog-writer.mts forwards priority, category, relates_to, createdAt (from 'created') out of existingFm into emitBacklogStateChanged — the emitter (backlog-state-emitter.mts) already accepts these fields but the live path never passes them, so CFR/MTTR have zero live signal. Add an integration test through moveFeature itself (existing test only exercises the emitter directly). Also: timestamp normalization to canonical 'ts' at all producers — grade-writer.mts (emits recordedAt) and slice-events.mts (emits timestamp) dual-emit 'ts' alongside legacy fields for one release cycle; schemas/loop-events/grade-event.schema.json and agent-dispatch.schema.json updated to require 'ts' and tolerate legacy names. Source plan: .claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md item A2 (APPROVED-WITH-CONDITIONS); full Given-When-Then ACs already drafted in .claude/artifacts/crew/runs/2026-07-07-dora-acs-eta.md section A2. Blocks astrarunner's A3 aggregation FEAT (cross-repo).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a FEAT frontmatter with `priority`, `category`, `relates_to`, `created` set, When `moveFeature` (src/scripts/lib/backlog-writer.mts) transitions the FEAT to a new state, Then `emitBacklogStateChanged` is called with a `BacklogStateChangedInput` whose `priority`, `category`, `relates_to`, and `createdAt` fields are populated from `existingFm` (not just `featId`/`fromState`/`toState`) -- evidenced by a new integration test that invokes `moveFeature` itself, not just the emitter directly.
- AC-2: Given a FEAT frontmatter missing `relates_to`, When `moveFeature` runs, Then the `BacklogStateChangedInput.relates_to` passed to the emitter is explicitly `null` (not omitted from the call) -- evidenced by the same integration test's negative-case assertion.
- AC-3: Given `grade-writer.mts` and `slice-events.mts` construct their event payloads, When an event is emitted, Then each payload includes a `ts` field alongside its existing `recordedAt` (grade-writer.mts) or `timestamp` (slice-events.mts) field, with equal ISO-8601 values -- evidenced by unit tests on both emitters asserting both keys are present and equal.
- AC-4: Given `schemas/loop-events/grade-event.schema.json` and `schemas/loop-events/agent-dispatch.schema.json`, When a payload missing `ts` is validated, Then schema validation fails; When a payload has `ts` present and legacy fields (`recordedAt`/`timestamp`) absent, Then validation still passes -- evidenced by schema-validation tests covering both cases for both schema files.
- AC-5 (edge/no-op path): Given a FEAT frontmatter transition where `fromState === toState`, When `moveFeature` runs, Then `emitBacklogStateChanged` is NOT called -- evidenced by a test asserting zero fanout calls on same-state moves, guarding against the field-forwarding change accidentally firing on a no-op transition.
