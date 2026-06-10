---
id: SLICE-38
status: completed
feature: FEAT-012
phase: 2
priority: P2
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 43
github_url: "https://github.com/sergeymilashico/loop/issues/43"
---
# SLICE-38: Checkpoint commit primitive

Implements FEAT-012 SLICE-A. See [feature file](../../../backlog/in-progress/FEAT-012.md) for product context.

## Objective

Add a `checkpointCommit(repoPath, ctx)` primitive that writes a structured WIP commit when
the working tree has changes. Foundation for continuous auto-commit safety nets during long
sessions. Ship squash and workflow wiring are out of scope here.

## In scope

- New module `src/scripts/lib/checkpoint-commit.mts` exporting `checkpointCommit`
- Commit subject format: `wip(checkpoint): <sliceId> — <summary>` (truncated to 72 chars)
- Commit body: structured optional sections — `## Decisions`, `## Remaining work`, `## Failed approaches` (omit empty sections)
- No-op path: when working tree is clean, return `{ committed: false, reason: "clean" }` without error
- Unit tests in `src/tests/checkpoint-commit.test.mts` covering: commit written with body, clean no-op, body sections, subject truncation at 72 chars, staged-only flag
- Export `checkpointCommit` from `src/scripts/lib/slice-linker.mts` top-level re-export
- Compiled `.mjs` output in `scripts/lib/checkpoint-commit.mjs`

## Out of scope

- Auto-triggering during session (no hooks, no timers)
- Integration with `startSlice` / `completeSlice` workflow
- Ship squash filter (WIP commit removal before PR) — future slice
- CLI command (`loop checkpoint`) — future slice
- Staged-only vs full-tree selection logic beyond the `stagedOnly` flag. When `stagedOnly` is false (default), the implementation runs `git add -u` before committing; when true, it commits the index as-is.

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter is clean (`npm run lint`), typecheck passes, format-check passes, manifest validator passes, content-length validator passes
- [ ] AC-2: `checkpointCommit({ repoPath, sliceId, summary, decisions?, remainingWork?, failedApproaches?, stagedOnly? })` exists in `scripts/lib/checkpoint-commit.mjs` and returns `{ committed: boolean, sha?: string, reason?: string }`
- [ ] AC-3: When working tree is clean, returns `{ committed: false, reason: "clean" }` without invoking git commit
- [ ] AC-4: Commit subject is `wip(checkpoint): <sliceId> — <summary>` truncated to 72 JS string code-units (`.length <= 72`) with `…` suffix when over limit
- [ ] AC-5: Commit body includes only non-empty structured sections (`## Decisions`, `## Remaining work`, `## Failed approaches`)
- [ ] AC-6: `checkpointCommit` is re-exported from `src/scripts/lib/slice-linker.mts`

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-012 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: loop:architect (read-only design + AC review)
- Reviewer B: loop:researcher (existing patterns audit)
