---
id: SLICE-24
title: Merged CI workflow (~30 gates) + clause-registry port
status: completed
feature: FEAT-005
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-4
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-24: Merged CI workflow (~30 gates) + clause-registry port

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: single merged CI.

- [x] AC-A: One root ci.yml, 41 gates (18 root + 9 crew blocking + 6 advisory + tsc/biome/suites); crew/.github deleted; docs/ci-gates.md numbered fresh; all verified by local end-to-end execution + reviewer spot-executions (incl. de-vacuousized crew validators now checking real trees). EVIDENCE: handoff 20260819T084404Z + review 20260819T090000Z approved.
- [x] AC-B: 4 malformed learnings.jsonl entries fixed with ledger; validate-branding-scrub standing gate added (self-tripping-filename bug found+fixed); routing-table stale tokens fixed; validate-all advisory tier aligned with ratified decision.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-005 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
