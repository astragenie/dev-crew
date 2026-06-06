---
id: SLICE-56
status: completed
feature: FEAT-060
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-56: Worktree creation at slice-start

Implements FEAT-060. See [feature file](../../../backlog/in-progress/FEAT-060.md) for product context.

## Objective

Slices currently share the repo working tree. If one slice's edits break the build mid-way, subsequent slices cannot proceed in parallel and the operator's editor is held hostage by the active slice. Worktrees fix this.

## In scope

- New `src/scripts/lib/worktree-manager.mts` helper — `ensureSliceWorktree(repoPath, sliceId, { config })` creates worktree + branch when gated config flag is on, otherwise no-op
- Hook into `src/scripts/lib/slice-linker/start-slice.mts::startSlice` after `pinSessionId` — best-effort, never blocks slice-start
- New `loop.json` config: `loop.worktreeMode` (default false), `loop.worktreeRoot` (default `../<repoBasename>-worktrees`)
- Populate `workflow-state.currentRun.worktreePath` + slice frontmatter `worktreePath`
- Unit tests for git-failure path (mocked exec), idempotent reuse, gated-off no-op

## Out of scope

- Subagent dispatch awareness of worktree path (FEAT-061)
- Auto-merge logic (FEAT-062)
- Worktree cleanup on slice-complete (FEAT-062)
- Cross-slice parallelism enabled by worktrees (separate concern)
- Crew CLI awareness of worktree (FEAT-061)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `node scripts/loop.mjs slice start --id SLICE-NN` creates a git worktree at `<loop.worktreeRoot>/<SLICE-NN>/` when `loop.worktreeMode: true` AND slice has no existing `worktreePath`
- [ ] AC-3: A new branch `slice/<SLICE-NN>-<feat-id>` is checked out in the worktree, branched off current `main`
- [ ] AC-4: `workflow-state.currentRun.worktreePath` AND slice frontmatter `worktreePath` populated with the absolute path; both readable by downstream tools
- [ ] AC-5: Re-running `slice start` on an existing worktree (state already has `worktreePath` pointing at an existing dir) reuses the path silently — no error, no branch reset
- [ ] AC-6: When `loop.worktreeMode: false` (default) slice-start behavior is identical to today's — no worktree created, no frontmatter mutation, no state mutation
- [ ] AC-7: New `loop.worktreeRoot` config respected; when absent defaults to `../<basename(repoPath)>-worktrees` (sibling dir)
- [ ] AC-8: Git failure path (e.g. dirty tree, worktree-add error) halts slice-start with a clear actionable error message; leaves no partial state — slice frontmatter NOT mutated, workflow-state NOT mutated
- [ ] AC-9: Unit tests cover: gated-off no-op, gated-on creates+writes state, idempotent re-entry, git-failure surfaces error without partial state, custom worktreeRoot path honored

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-060 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — git worktree CLI invocation correctness, idempotent reuse logic, failure-path leaves no partial state, config resolution edge cases (default/custom worktreeRoot, missing flag)
- Reviewer B: scope discipline — FEAT-061 territory (CLI/subagent worktree awareness) NOT touched; FEAT-062 territory (merge/cleanup) NOT touched; existing slice-start path stays identical when `worktreeMode: false`
