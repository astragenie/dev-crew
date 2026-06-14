---
id: SLICE-127
title: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main
status: completed
feature: FEAT-173
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 267
github_url: "https://github.com/sergeymilashico/loop/issues/267"
completed_at: 2026-06-13
---
# SLICE-127: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main

Implements FEAT-173. See [feature file](../../../backlog/in-progress/FEAT-173.md) for product context.

## Objective

Competitor gap (Maestro v0.15.3). Maestro offers one-click PR creation from any worktree with title/description inferred from commits, plus auto-PR-on-completion for unattended runs. Loop's dispatch finalize merges DONE children directly to main with no PR option. Proposal: add a --pr mode to dispatch finalize (and crew:parallel flow) that pushes each child branch and runs gh pr create with commit-derived title/body instead of merging. Complements FEAT-110 (Agent Merge post-PR repair loop) - this is the PR-creation half. Scoring: impact 2 / effort 1 / fit 3 (composite 7).

## In scope

- `loop dispatch finalize --pr [--repo]`: pushes each DONE child branch to origin then runs `gh pr create --title <inferred> --body <inferred>` instead of merging to main
- Title inferred from last commit message (`git log -1 --format=%s` on child branch)
- Body inferred from `git log main..HEAD --oneline` formatted as bullet list
- Returns array of `{branch, prUrl}` in JSON output; existing `--no-merge` flag behavior preserved
- `src/tests/dispatch-pr-mode.test.mts` ≥4 tests using `_internals` mock for git + gh CLI calls

## Out of scope

- PR auto-merge or auto-approve
- PR label/reviewer/milestone assignment
- Integration with FEAT-110 post-PR repair loop

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test`) and linter is clean (`bun run lint`)
- [ ] AC-2: When `--pr` flag is set, `dispatchFinalizePr(children, repoPath)` calls `gh pr create` once per DONE child with `--title` derived from that child's last git commit message and `--body` containing the commit log summary. Returns array of PR URLs. Verified by ≥4 tests using `_internals` mock.

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
