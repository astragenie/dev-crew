---
feature: FEAT-086
status: active
---
# Run Brief: FEAT086 SLICE117: Cross-session learnings with automatic recall

- Created: 2026-06-13T10:57:49.468Z
- Tier: full
- Goal: Competitor gap audit (2026-05-28). Surfaced by:
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Add `deleteLearning(repoPath
  - id)` to `src/scripts/lib/learnings.mts`
- Add `learnings list`
  - `learnings search`
  - `learnings prune` subcommands to `loop.mts`
- Add `learningsDigest` to `buildBrief` return in `src/scripts/lib/brief.mts`
- Add 5 new `deleteLearning` tests to `src/tests/learnings.test.mts`
- Out Of Scope:
  - - `commands/brief.md` doc update
- `commands/learn.md` doc update
- Planned Files: -
- Next Step: Begin implementation

