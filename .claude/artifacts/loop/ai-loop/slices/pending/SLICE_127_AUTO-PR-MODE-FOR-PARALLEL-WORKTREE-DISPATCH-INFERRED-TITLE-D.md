---
id: SLICE-127
title: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main
status: pending
feature: FEAT-173
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 267
github_url: "https://github.com/sergeymilashico/loop/issues/267"
---
# SLICE-127: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main

Implements FEAT-173. See [feature file](../../../backlog/in-progress/FEAT-173.md) for product context.

## Objective

Competitor gap (Maestro v0.15.3). Maestro offers one-click PR creation from any worktree with title/description inferred from commits, plus auto-PR-on-completion for unattended runs. Loop's dispatch finalize merges DONE children directly to main with no PR option. Proposal: add a --pr mode to dispatch finalize (and crew:parallel flow) that pushes each child branch and runs gh pr create with commit-derived title/body instead of merging. Complements FEAT-110 (Agent Merge post-PR repair loop) - this is the PR-creation half. Scoring: impact 2 / effort 1 / fit 3 (composite 7).

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
- feature FEAT-173 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
