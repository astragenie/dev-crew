---
id: SLICE-48
title: Implement FEAT-023
status: pending
feature: FEAT-023
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-48: Implement FEAT-023

Implements FEAT-023. See [feature file](../../../backlog/in-progress/FEAT-023.md) for product context.

## Objective

Audit T3: CI docs-only exemption treats prompts as code; gate fails closed

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given stdin `agents/reviewer.md`, `skills/workflow/x/SKILL.md`, or `commands/build.md`, When `docs-only.sh` runs, Then it prints `code=true`; given `docs/a.md\nREADME.md\n`, Then `code=false`; given empty stdin, Then `code=true`; given `.claude/artifacts/loop/backlog/triaged/FEAT-001.md`, Then `code=true`.
- [ ] AC-2: Given `gate.sh "" success`, Then exit `1`; `gate.sh "true" failure`, Then exit `1`; `gate.sh "true" success`, Then exit `0`; `gate.sh "false" skipped`, Then exit `0`.
- [ ] AC-3: Given `docs/ci-gates.md`, When inspected, Then it contains the literal strings `src/scripts/ci/docs-only.sh` and `src/scripts/ci/gate.sh`, and `bun src/scripts/generate-metrics-band.mts --check` is green with the gate list order unchanged.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-023 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
