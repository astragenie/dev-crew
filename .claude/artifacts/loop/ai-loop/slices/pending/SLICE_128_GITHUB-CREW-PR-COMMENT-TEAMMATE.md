---
id: SLICE-128
title: GitHub `@crew` PR-comment teammate
status: done
feature: FEAT-101
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 268
github_url: "https://github.com/sergeymilashico/loop/issues/268"
---
# SLICE-128: GitHub `@crew` PR-comment teammate

Implements FEAT-101. See [feature file](../../../backlog/in-progress/FEAT-101.md) for product context.

## Objective

2026-06-08 platform positioning audit §8 CREW-NEXT-1.

## In scope

- `.github/workflows/crew-pr-comment.yml` — GitHub Action triggered on `issue_comment` and `pull_request_review_comment` events
- `src/scripts/lib/gh-mention-parser.mts` — mention parser for `@crew review`, `@crew fix <description>`, `@crew explain`
- `src/scripts/lib/gh-reply-formatter.mts` — reply formatter: verdict + 200-char summary + artifact GH link
- `src/scripts/lib/gh-rate-limiter.mts` — per-PR rate limit (max 1 active dispatch); state stored in `.github/crew-dispatch-state.json`
- Tests: `src/tests/gh-mention-parser.test.mts`, `src/tests/gh-reply-formatter.test.mts`, `src/tests/gh-rate-limiter.test.mts`
- `docs/integrations/github-pr-comment-teammate.md` — setup guide

## Out of scope

- Cross-org webhook (single-repo-install only in v1)
- Linear sync (FEAT-102)
- Building or running actual Claude Code sessions inside the Action (scaffold only — Action YAML invokes `npx claude` / `bunx claude` as documented shell step)

## Acceptance criteria

- [ ] AC-1: `actions/crew-pr-comment.yml` triggers on `issue_comment.created` and `pull_request_review_comment.created` events; workflow file valid per `act --list` or schema check.
- [ ] AC-2: Mention parser correctly extracts intent from `@crew review`, `@crew fix <text>`, `@crew explain` in both PR body and comment body; unknown mentions return `null`. Test: ≥8 cases covering valid + invalid + edge inputs.
- [ ] AC-3: Reply formatter produces a comment body ≤ 1000 chars containing verdict tag (`PASS`/`FAIL`/`needs-info`), first 200 chars of artifact summary, and a relative GitHub link to the artifact path under `.claude/artifacts/crew/`.
- [ ] AC-4: Rate limiter prevents a second dispatch while one is active on the same PR number; returns `{ blocked: true, activeDispatchId }`. State file is updated atomically (read-modify-write with a lockfile or `.tmp` swap).
- [ ] AC-5: `bun test src/tests/` passes (all new tests green); `bun run lint` clean (zero warnings, cyclomatic complexity ≤ 15 per module).
- [ ] AC-6: `docs/integrations/github-pr-comment-teammate.md` documents prerequisites (GH Actions secret `ANTHROPIC_API_KEY`), required repo permissions, and a "First run" example.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-101 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (mention parser edge cases, reply formatter truncation, rate limiter atomicity)
- Reviewer B: security (prompt-injection in mention text, secret handling in Action YAML, lockfile race) + production-readiness
