---
id: SLICE-122
title: Promotion ratchet for grade lessons — promote-or-archive gate at slice close
status: pending
feature: FEAT-178
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 261
github_url: "https://github.com/sergeymilashico/loop/issues/261"
---
# SLICE-122: Promotion ratchet for grade lessons — promote-or-archive gate at slice close

Implements FEAT-178. See [feature file](../../../backlog/in-progress/FEAT-178.md) for product context.

## Objective

Adopt the AgentOps promotion ratchet (C:/work/mega/agentops, docs/architecture/operating-loop.md): a learning is only durable if it climbs a ladder — noticed once -> dies with the handoff; repeated twice -> promoted to a learnings store entry; changes future behavior -> becomes a planning rule injected at dispatch; must-never-regress -> becomes a validation/stop gate. Today grade lessons/surprises/followups are write-only: nothing forces them to change behavior, and weak dimensions (e.g. product_completeness) persist across slices.

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
- feature FEAT-178 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
