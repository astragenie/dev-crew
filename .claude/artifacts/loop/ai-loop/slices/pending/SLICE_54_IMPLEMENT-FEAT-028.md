---
id: SLICE-54
title: Implement FEAT-028
status: pending
feature: FEAT-028
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-54: Implement FEAT-028

Implements FEAT-028. See [feature file](../../../backlog/in-progress/FEAT-028.md) for product context.

## Objective

Audit T6: one builder report contract (marker-first block); no publishing before review; validator rules

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given each of the four builder prompts, When `builder-report-contract.test.mts` runs, Then the marker-first block spec appears exactly once and none of them contain `report-to-pr`, `gh pr create`, `SendMessage`, or `git push`; every agent stays at or under 300 lines.
- [ ] AC-2: Given the new 4-line marker-first block as a fixture, When `crew/tests` for `incomplete-detector` and `subagent-gate-guard` run, Then both PASS unchanged (DONE is detected; the red gate still blocks).
- [ ] AC-3: Given a fixture agent containing `node ./scripts/x.mts`, When `validate-agents.mts` runs, Then it exits `1` naming `no-relative-script-path`; given a fixture agent with no `tools:` that dispatches a non-allowlisted peer, Then it exits `1` naming `peer-dispatch`; given the real tree, Then it exits `0`.
- [ ] AC-4: Given `commands/build.md`, Then it no longer contains "REQUIRE a `write-handoff`"; given `.claude/artifacts/loop/decisions/`, Then `DEC-040.md` exists.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-028 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
