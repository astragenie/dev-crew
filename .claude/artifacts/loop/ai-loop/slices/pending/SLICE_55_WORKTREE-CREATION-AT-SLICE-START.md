---
id: SLICE-55
status: superseded
feature: FEAT-060
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
---
# SLICE-55: Worktree creation at slice-start

Implements FEAT-060. See [feature file](../../../backlog/in-progress/FEAT-060.md) for product context.

## Objective

Slices currently share the repo working tree. If one slice's edits break the build mid-way, subsequent slices cannot proceed in parallel and the operator's editor is held hostage by the active slice. Worktrees fix this.

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
- feature FEAT-060 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
