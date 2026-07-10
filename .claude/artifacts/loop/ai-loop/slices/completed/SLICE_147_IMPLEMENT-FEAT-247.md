---
id: SLICE-147
title: Implement FEAT-247
status: completed
feature: FEAT-247
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-07-09
updated: 2026-07-10
github_issue: 410
github_url: "https://github.com/astragenie/runner-plugin/issues/410"
touches_files: [src/scripts/lib/backlog-writer.mts, src/scripts/lib/backlog-state-emitter.mts, src/scripts/lib/grade-writer.mts, src/scripts/lib/slice-events.mts, schemas/loop-events/grade-event.schema.json, schemas/loop-events/agent-dispatch.schema.json, src/tests/backlog-writer.test.mts, src/tests/grade.test.mts]
completed_at: 2026-07-10
---
# SLICE-147: Implement FEAT-247

Implements FEAT-247. See [feature file](../../../backlog/in-progress/FEAT-247.md) for product context.

## Objective

DORA event-field conformance (plan item A2): moveFeature in src/scripts/lib/backlog-writer.mts forwards priority, category, relates_to, createdAt (from 'created') out of existingFm into emitBacklogStateChanged — the emitter (backlog-state-emitter.mts) already accepts these fields but the live path never passes them, so CFR/MTTR have zero live signal. Add an integration test through moveFeature itself (existing test only exercises the emitter directly). Also: timestamp normalization to canonical 'ts' at all producers — grade-writer.mts (emits recordedAt) and slice-events.mts (emits timestamp) dual-emit 'ts' alongside legacy fields for one release cycle; schemas/loop-events/grade-event.schema.json and agent-dispatch.schema.json updated to require 'ts' and tolerate legacy names. Source plan: .claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md item A2 (APPROVED-WITH-CONDITIONS); full Given-When-Then ACs already drafted in .claude/artifacts/crew/runs/2026-07-07-dora-acs-eta.md section A2. Blocks astrarunner's A3 aggregation FEAT (cross-repo).

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a FEAT frontmatter with `priority`, `category`, `relates_to`, `created` set, When `moveFeature` (src/scripts/lib/backlog-writer.mts) transitions the FEAT to a new state, Then `emitBacklogStateChanged` is called with a `BacklogStateChangedInput` whose `priority`, `category`, `relates_to`, and `createdAt` fields are populated from `existingFm` (not just `featId`/`fromState`/`toState`) -- evidenced by a new integration test that invokes `moveFeature` itself, not just the emitter directly.
- [ ] AC-2: Given a FEAT frontmatter missing `relates_to`, When `moveFeature` runs, Then the `BacklogStateChangedInput.relates_to` passed to the emitter is explicitly `null` (not omitted from the call) -- evidenced by the same integration test's negative-case assertion.
- [ ] AC-3: Given `grade-writer.mts` and `slice-events.mts` construct their event payloads, When an event is emitted, Then each payload includes a `ts` field alongside its existing `recordedAt` (grade-writer.mts) or `timestamp` (slice-events.mts) field, with equal ISO-8601 values -- evidenced by unit tests on both emitters asserting both keys are present and equal.
- [ ] AC-4: Given `schemas/loop-events/grade-event.schema.json` and `schemas/loop-events/agent-dispatch.schema.json`, When a payload missing `ts` is validated, Then schema validation fails; When a payload has `ts` present and legacy fields (`recordedAt`/`timestamp`) absent, Then validation still passes -- evidenced by schema-validation tests covering both cases for both schema files.
- [ ] AC-5 (edge/no-op path): Given a FEAT frontmatter transition where `fromState === toState`, When `moveFeature` runs, Then `emitBacklogStateChanged` is NOT called -- evidenced by a test asserting zero fanout calls on same-state moves, guarding against the field-forwarding change accidentally firing on a no-op transition.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-247 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
