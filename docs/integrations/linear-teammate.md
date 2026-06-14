# Linear Teammate Integration (FEAT-102)

> **Status:** Phase 1 — webhook handler + mention parser shipped. Full round-trip (issue → FEAT → PR → Linear status) in follow-on slice.

## Setup

1. Create a Linear webhook pointing to your server at `/webhook/linear`.
2. Set the `LOOP_LINEAR_WEBHOOK_SECRET` env var to your Linear webhook secret.
3. Run the webhook server (follow-on: `bun scripts/linear-sync/server.mts`).

## Supported @crew commands

| Mention | Action |
|---------|--------|
| `@crew triage` | Run PM triage on the issue body |
| `@crew build` | Dispatch crew:builder against the issue |
| `@crew status` | Post current slice status as a comment |

## Architecture

The mention parser (`scripts/linear-sync/mention-parser.mts`) extracts `@crew <cmd>` from comment bodies.
The webhook handler (`scripts/linear-sync/webhook-handler.mts`) routes Linear payloads to crew mentions.
A follow-on slice will add the HTTP webhook server and Linear API reply client.
