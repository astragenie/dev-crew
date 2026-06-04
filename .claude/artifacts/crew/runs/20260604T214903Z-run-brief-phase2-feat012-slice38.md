---
phase: "2"
feature: FEAT-012
---
# Run Brief: PHASE2 FEAT012 SLICE38

- Created: 2026-06-04T21:49:03.081Z
- Goal: Add a `checkpointCommit(repoPath, ctx)` primitive that writes a structured WIP commit when the working tree has changes. Foundation for continuous auto-commit safety nets during long sessions. Ship squash and workflow wiring are out of scope here.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New module `src/scripts/lib/checkpoint-commit.mts` exporting `checkpointCommit`
- Commit subject format: `wip(checkpoint): <sliceId> — <summary>` (truncated to 72 chars)
- Commit body: structured optional sections — `## Decisions`
  - `## Remaining work`
  - `## Failed approaches` (omit empty sections)
- No-op path: when working tree is clean
  - return `{ committed: false
  - reason: "clean" }` without error
- Unit tests in `src/tests/checkpoint-commit.test.mts` covering: commit written with body
  - clean no-op
  - body sections
  - subject truncation at 72 chars
  - staged-only flag
- Export `checkpointCommit` from `src/scripts/lib/slice-linker.mts` top-level re-export
- Compiled `.mjs` output in `scripts/lib/checkpoint-commit.mjs`
- Out Of Scope:
  - - Auto-triggering during session (no hooks
  - no timers)
- Integration with `startSlice` / `completeSlice` workflow
- Ship squash filter (WIP commit removal before PR) — future slice
- CLI command (`loop checkpoint`) — future slice
- Staged-only vs full-tree selection logic beyond the `stagedOnly` flag. When `stagedOnly` is false (default)
  - the implementation runs `git add -u` before committing; whe
- Planned Files: -
- Next Step: Begin implementation

