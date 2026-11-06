---
id: SLICE-47
title: Implement FEAT-022
status: pending
feature: FEAT-022
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-47: Implement FEAT-022

Implements FEAT-022. See [feature file](../../../backlog/in-progress/FEAT-022.md) for product context.

## Objective

Audit T1: consumer-install smoke test for every shipped hook/CLI entry (red first)

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given today's tree, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then it FAILS naming at least `crew/hooks/subagent-gate-guard.mts`, `hooks/pre-push-gate.mts`, `crew/hooks/pre-tool-use-agent.mts`, `crew/hooks/otel-post-tool-use.mts`, `crew/scripts/crew.mts brief-me`, and `crew/scripts/crew.mts show-workflow-state` with "Cannot find".
- [ ] AC-2: Given `hooks/hooks.json` plus `commands/*.md` plus `agents/*.md`, When `listShippedEntrypoints` runs, Then the distinct file set contains the exact-counted 17 bun `.mts` hooks, the node `.mjs` hooks, `log_event.sh`, `crew/scripts/crew.mts`, and `src/scripts/loop.mts` (exact counts asserted, not ">20").
- [ ] AC-3: Given `stageConsumerCopy` output, When inspected, Then no `node_modules` directory exists at ANY depth under `pluginCopy`, and `consumerRepo` has exactly one git commit.
- [ ] AC-4: Given an entry listed in `EXPECTED_FAIL` that now passes, When the test runs, Then it FAILS with "remove from EXPECTED_FAIL" (ratchet).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-022 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
