---
id: SLICE-37
status: pending
feature: FEAT-012
phase: 2
priority: P2
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
---
# SLICE-37: Checkpoint commit primitive

Implements FEAT-012 SLICE-A. See [feature file](../../../backlog/in-progress/FEAT-012.md) for product context.

## Objective

Add a `checkpointCommit(repoPath, ctx)` primitive that writes a structured WIP commit when
the working tree has changes. This is the foundation for continuous auto-commit safety nets
during long-running slice sessions. Ship squash and workflow wiring are out of scope here.

## In scope

- New module `src/scripts/lib/checkpoint-commit.mts` exporting `checkpointCommit`
- Commit subject format: `wip(checkpoint): <sliceId> — <summary>`
- Commit body: structured sections — `## Decisions`, `## Remaining work`, `## Failed approaches` (omit empty sections)
- No-op path: when working tree is clean, return `{ committed: false, reason: "clean" }` without error
- Unit tests in `src/tests/checkpoint-commit.test.mts` covering: commit written, clean no-op, body sections, subject truncation at 72 chars
- Export `checkpointCommit` from `src/scripts/lib/slice-linker.mts` (or a new top-level re-export)

## Out of scope

- Auto-triggering during session (no hooks, no timers)
- Integration with `startSlice` / `completeSlice` workflow
- Ship squash filter (WIP commit removal before PR) — future slice
- CLI command (`loop checkpoint`) — future slice
- Staged-only vs full-tree selection logic

## Acceptance criteria

- [ ] AC-1: `checkpointCommit(repoPath, { sliceId, summary, decisions?, remainingWork?, failedApproaches? })` writes a git commit with subject `wip(checkpoint): <sliceId> — <summary>` (subject ≤ 72 chars, truncated with `…` if needed) and body containing only the non-empty sections from ctx. Evidence: test asserts commit exists via `git log --oneline -1` output match.
- [ ] AC-2: Returns `{ committed: false, reason: "clean" }` when `git status --porcelain` is empty. No commit created, no error thrown. Evidence: test calls function on clean repo, asserts return value and zero new commits.
- [ ] AC-3: Commit body includes `## Decisions` section with provided decisions text when `ctx.decisions` is non-empty; omits the section when not provided. Evidence: test asserts `git show HEAD` body content.
- [ ] AC-4: All tests pass (`npm test`), lint clean (`npm run lint`), format clean (`npm run format:check`), typecheck passes (`npm run typecheck`).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- Crew `final-synthesis` artifact written
- feature FEAT-012 stays `in-progress` (more slices follow for wiring + squash)

## Reviewer ladder

- Reviewer A: crew:reviewer
- Reviewer B: crew:reviewer

## Implementation notes

- Use `child_process.execSync` or `execa` (already in deps) for git commands — check what pattern existing modules use
- `checkpointCommit` should never throw on clean tree — always returns the result shape
- Keep module under 150 lines; complexity cap 15
- Check `src/scripts/lib/trajectory-writer.mts` for git exec pattern reference
