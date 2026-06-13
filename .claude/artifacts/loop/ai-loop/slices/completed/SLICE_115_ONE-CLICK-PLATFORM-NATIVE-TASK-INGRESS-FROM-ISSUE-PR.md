---
id: SLICE-115
title: One-click platform-native task ingress from Issue / PR
status: completed
feature: FEAT-111
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 244
github_url: "https://github.com/sergeymilashico/loop/issues/244"
completed_at: 2026-06-13
---
# SLICE-115: One-click platform-native task ingress from Issue / PR

Implements FEAT-111. See [feature file](../../../backlog/in-progress/FEAT-111.md) for product context.

## Objective

Add `--from-issue <url>` flag to `/loop:backlog-add` slash command so a GitHub Issue URL auto-populates FEAT frontmatter (title, body, github_issue, github_url) via `gh issue view`.

## In scope

- `--from-issue <url>` flag added to `commands/backlog-add.md` slash command flow
- `src/scripts/lib/from-issue.mts` (or extension of backlog-add script) that calls `gh issue view <url> --json title,body,number,url`
- Graceful error if `gh` CLI not available, not authenticated, or issue is inaccessible
- Unit tests for frontmatter generation from gh JSON output

## Out of scope

- PR ingress (Issues only for this slice)
- Changes to loop.json github.repo field

## Acceptance criteria

- [ ] AC-1: `bun test src/tests/ --timeout 60000` passes and `bun run lint` is clean
- [ ] AC-2: Running `bun src/scripts/loop.mts backlog-add --from-issue <github-issue-url>` (or the slash command equivalent) fetches issue metadata via `gh issue view` and writes a FEAT file with `title`, `github_issue` (number), and `github_url` fields pre-filled
- [ ] AC-3: When `gh` is not available or returns a non-zero exit code, the command exits with a clear error message and does not create a partial FEAT file
- [ ] AC-4: Unit tests cover: happy path frontmatter generation, missing gh CLI error, private/inaccessible issue error
- [ ] AC-5: `bunx tsc --project tsconfig.json --noEmit` passes

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-111 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (does --from-issue flag match all ACs? error paths handled?)
- Reviewer B: production-readiness, security (gh token exposure?), observability
