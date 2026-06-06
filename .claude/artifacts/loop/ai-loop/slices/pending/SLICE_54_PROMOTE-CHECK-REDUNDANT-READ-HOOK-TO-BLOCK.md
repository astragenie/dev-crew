---
id: SLICE-54
status: pending
feature: FEAT-057
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
---
# SLICE-54: Promote check-redundant-read hook to block

Implements FEAT-057. See [feature file](../../../backlog/in-progress/FEAT-057.md) for product context.

## Objective

check-redundant-read hook currently logs only (hookHealth green = 0 errors, but does not gate). Cost-advisor saw 30 redundant Read calls in one slice. Hook should DENY at N redundant reads of same absolute path within session.

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
- feature FEAT-057 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
