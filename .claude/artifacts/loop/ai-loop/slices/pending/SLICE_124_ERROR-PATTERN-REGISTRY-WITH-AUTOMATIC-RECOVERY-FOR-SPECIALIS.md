---
id: SLICE-124
title: Error-pattern registry with automatic recovery for specialist dispatch failures
status: pending
feature: FEAT-174
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 263
github_url: "https://github.com/sergeymilashico/loop/issues/263"
---
# SLICE-124: Error-pattern registry with automatic recovery for specialist dispatch failures

Implements FEAT-174. See [feature file](../../../backlog/in-progress/FEAT-174.md) for product context.

## Objective

Competitor gap (Maestro v0.15.3). Maestro maintains a per-agent error-pattern registry that detects known failure signatures in agent output and triggers automatic recovery plus user-friendly messages. Loop handles the recurring specialist-pause failure mode (builder/reviewer/validator pauses without writing artifact) only via a manual SOP doc (docs/sop/specialist-pause-handling.md). Proposal: codify the SOP into machine-checkable patterns (pause-without-artifact, empty artifact, truncated output, budget-exceeded mid-task) with a registry consulted at dispatch-result time; on match, apply the documented recovery action automatically and log to learnings.jsonl. Adjacent to FEAT-130 (stuck-detector) which covers runaway loops, not output-pattern recovery. Scoring: impact 2 / effort 2 / fit 3 (composite 6).

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
- feature FEAT-174 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
