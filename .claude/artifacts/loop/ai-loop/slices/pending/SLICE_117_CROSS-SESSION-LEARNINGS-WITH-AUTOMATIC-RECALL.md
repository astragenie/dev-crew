---
id: SLICE-117
title: Cross-session learnings with automatic recall
status: pending
feature: FEAT-086
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 254
github_url: "https://github.com/sergeymilashico/loop/issues/254"
---
# SLICE-117: Cross-session learnings with automatic recall

Implements FEAT-086. See [feature file](../../../backlog/in-progress/FEAT-086.md) for product context.

## Objective

Competitor gap audit (2026-05-28). Surfaced by:

## In scope

- Add `deleteLearning(repoPath, id)` to `src/scripts/lib/learnings.mts`
- Add `learnings list`, `learnings search`, `learnings prune` subcommands to `loop.mts`
- Add `learningsDigest` to `buildBrief` return in `src/scripts/lib/brief.mts`
- Add 5 new `deleteLearning` tests to `src/tests/learnings.test.mts`

## Out of scope

- `commands/brief.md` doc update
- `commands/learn.md` doc update

## Acceptance criteria

- [ ] AC-1: All tests pass (bun test) and linter is clean (bun run lint)
- [ ] AC-2: `learnings list`, `learnings search`, `learnings prune` subcommands work end-to-end; `brief` output includes `learningsDigest` field; all 5 new `deleteLearning` tests pass

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-086 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
