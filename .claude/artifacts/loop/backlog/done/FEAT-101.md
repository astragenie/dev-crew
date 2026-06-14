---
id: FEAT-101
status: done
priority: P2
category: competitor-gap
target_release: "0.49.0"
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-128]
derived_from: null
source_competitors: [OpenAI Codex, Claude Code, Cline, OpenHands]
autonomous_safe: false
tags: [crew, github, integration]
needs_contract: true
needs_ux: false
github_issue: 177
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/177"
started_at: 2026-06-13
slices_complete: [SLICE-128]
completed_at: 2026-06-13
---
# FEAT-101: GitHub `@crew` PR-comment teammate

## Source

2026-06-08 platform positioning audit §8 CREW-NEXT-1.
docs/research/2026-06-08-platform-positioning/strategy.md

## Problem

Codex (`@codex review`), Claude Code (`@claude`), Cline (Actions samples), OpenHands all let a PR reviewer or commenter mention an `@<bot>` to trigger an agent run against the PR. Crew has `gh CLI` usage in slash flows but no first-class webhook receiver — no way for a teammate to delegate review/fix to Crew from a PR comment.

## Proposal

Ship a GitHub Action + webhook receiver that listens for `@crew review` / `@crew fix <description>` in PR comments and issue comments. Dispatch the matching `crew:reviewer` / `crew:builder` against the PR head SHA with the comment body as prompt. Post back a structured summary comment with verdict + link to the artifact in `.claude/artifacts/crew/reviews/` or `.claude/artifacts/crew/runs/`.

## Acceptance criteria

- `actions/crew-pr-comment.yml` GH Action triggered on `issue_comment` and `pull_request_review_comment` events.
- Mention parser: `@crew review`, `@crew fix <description>`, `@crew explain`.
- Each dispatch is a fresh Claude Code session inside the Action runner; reuses the existing `crew:*` agents.
- Reply posted to original PR thread with verdict (PASS/FAIL/needs-info) + first 200 chars of artifact summary + GH link to full artifact (committed under `.claude/artifacts/crew/`).
- Rate limit: max 1 active dispatch per PR.
- Tests: webhook payload parser, mention regex, reply-formatter snapshot test.
- `docs/integrations/github-pr-comment-teammate.md` documents setup.

## Out of scope

- Cross-org webhook (single-repo-install only in v1).
- Linear sync — that's FEAT-102.

## References

- OpenAI Codex GH integration: https://developers.openai.com/codex/integrations/github
- Claude Code @claude: https://code.claude.com/docs/en/github-actions
- Strategy doc: docs/research/2026-06-08-platform-positioning/strategy.md §8
