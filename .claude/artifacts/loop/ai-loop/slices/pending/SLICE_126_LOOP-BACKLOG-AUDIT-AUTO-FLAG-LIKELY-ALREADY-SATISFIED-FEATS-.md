---
id: SLICE-126
title: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence
status: pending
feature: FEAT-182
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 266
github_url: "https://github.com/sergeymilashico/loop/issues/266"
---
# SLICE-126: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence

Implements FEAT-182. See [feature file](../../../backlog/in-progress/FEAT-182.md) for product context.

## Objective

Adopt ao beads audit (C:/work/mega/agentops cli beads audit): scan triaged/pending FEATs and cross-check acceptance hints against the current codebase + done/ siblings; flag (not auto-close) FEATs whose ACs appear already satisfied, each with file:line evidence. Keeps long-lived queues honest — stale FEATs survive triage because nobody re-derives them against shipped code.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: <replace with a concrete, testable acceptance criterion>

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-182 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
