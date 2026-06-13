---
feature: FEAT-173
status: active
---
# Run Brief: FEAT173 SLICE127: Auto-PR mode for parallel worktree dispatch - inferred title/description via gh instead of direct merge to main

- Created: 2026-06-13T14:49:54.428Z
- Tier: full
- Goal: Competitor gap (Maestro v0.15.3). Maestro offers one-click PR creation from any worktree with title/description inferred from commits, plus auto-PR-on-completion for unattended runs. Loop's dispatch finalize merges DONE children directly to main with no PR option. Proposal: add a --pr mode to dispatch finalize (and crew:parallel flow) that pushes each child branch and runs gh pr create with commit-derived title/body instead of merging. Complements FEAT-110 (Agent Merge post-PR repair loop) - thi
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `loop dispatch finalize --pr [--repo]`: pushes each DONE child branch to origin then runs `gh pr create --title <inferred> --body <inferred>` instead of merging to main
- Title inferred from last commit message (`git log -1 --format=%s` on child branch)
- Body inferred from `git log main..HEAD --oneline` formatted as bullet list
- Returns array of `{branch
  - prUrl}` in JSON output; existing `--no-merge` flag behavior preserved
- `src/tests/dispatch-pr-mode.test.mts` ≥4 tests using `_internals` mock for git + gh CLI calls
- Out Of Scope:
  - - PR auto-merge or auto-approve
- PR label/reviewer/milestone assignment
- Integration with FEAT-110 post-PR repair loop
- Planned Files: -
- Next Step: Begin implementation

