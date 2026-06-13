# GitHub @crew PR-Comment Teammate (FEAT-101)

This integration lets you mention `@crew` in any GitHub pull request comment or
review comment to trigger automated crew actions — code review, fix requests, or
explanations — directly from the PR thread.

## Prerequisites

| Requirement | Notes |
|---|---|
| `ANTHROPIC_API_KEY` secret | Set in your GitHub repo Settings → Secrets and variables → Actions |
| GitHub Actions enabled | The workflow runs on the `ubuntu-latest` runner |
| Bun | Installed automatically by the `oven-sh/setup-bun@v2` Action step |

## Required permissions

The `crew-pr-comment.yml` workflow declares the following permissions:

```yaml
permissions:
  issues: write        # post reply comments
  pull-requests: write # post PR review comments
  contents: read       # checkout the repo to run the parser
```

No additional setup is needed — GitHub Actions provides the `GITHUB_TOKEN`
automatically.

## Supported @crew commands

| Mention | Intent | Action |
|---|---|---|
| `@crew review` | `review` | Triggers a crew code review on the PR diff |
| `@crew fix <description>` | `fix` | Requests a targeted fix; description is passed as context |
| `@crew explain` | `explain` | Asks crew to explain the code change in context |

Mentions are **case-insensitive** and may have leading whitespace.
The `fix` description is sanitised (backticks and quotes stripped) before use.

## How it works

1. A PR comment or review comment is created.
2. The `crew-pr-comment` workflow triggers on `issue_comment.created` or
   `pull_request_review_comment.created`.
3. The `gh-mention-parser` step runs `bun src/scripts/lib/gh-mention-parser.mts`
   to extract the intent.
4. If a supported mention is found, the `Dispatch crew action` step runs with
   the parsed intent and sanitised body.
5. Results are posted back to the PR thread.

## Rate limiting

A JSON state file (`.github/crew-dispatch-state.json`) tracks active dispatches
per PR. If a dispatch is already running for a PR, new mentions are blocked until
the active dispatch completes. This prevents concurrent overlapping dispatches on
a busy PR thread.

The state file is written and read by `src/scripts/lib/gh-rate-limiter.mts`.

## First run example

Post this comment on any open pull request:

```
@crew review
```

The workflow will trigger within seconds. When the review completes, a reply is
posted to the same thread with a verdict (`PASS`, `FAIL`, or `needs-info`),
a brief summary, and a link to the full artifact.

You can also request a targeted fix:

```
@crew fix the error handling in the auth middleware looks wrong — it swallows 401s
```

The description (everything after `fix`) is passed as plain text context to the
crew builder. Do not include shell syntax — it will be stripped.

## Workflow file

`.github/workflows/crew-pr-comment.yml`

## Module reference

| Module | Purpose |
|---|---|
| `src/scripts/lib/gh-mention-parser.mts` | Parses `@crew <intent>` from comment text |
| `src/scripts/lib/gh-reply-formatter.mts` | Formats the reply posted back to GitHub |
| `src/scripts/lib/gh-rate-limiter.mts` | Prevents concurrent dispatches for the same PR |
