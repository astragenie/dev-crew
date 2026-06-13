---
id: SLICE-120
title: "Loop event notifications - OS notification / webhook / custom command on slice complete, halt-badge, cost alert"
status: pending
feature: FEAT-171
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 258
github_url: "https://github.com/sergeymilashico/loop/issues/258"
---
# SLICE-120: Loop event notifications - OS notification / webhook / custom command on slice complete, halt-badge, cost alert

Implements FEAT-171. See [feature file](../../../backlog/in-progress/FEAT-171.md) for product context.

## Objective

Competitor gap (Maestro, RunMaestro/Maestro v0.15.3, local clone C:\work\mega\Maestro). Maestro ships OS notifications, text-to-speech announcements, and arbitrary custom-command execution when an agent completes a task. Loop has zero ambient awareness: no alert on slice complete, halt-badge emission, or cost alert - the user must watch the terminal. Proposal: hook-driven notification surface on loop lifecycle events (slice start/complete, halt-badge, cost-advisor high severity), configurable in .claude/loop.json (osNotification | webhook | customCommand). Reinforces weakest grade signal (observability 0.66). Scoring: impact 3 / effort 1 / fit 3 (composite 8).

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
- feature FEAT-171 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
