---
id: FEAT-102
status: in-progress
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-123]
derived_from: null
source_competitors: [OpenAI Codex, OpenHands]
autonomous_safe: false
tags: [crew, loop, linear, integration]
needs_contract: true
needs_ux: true
github_issue: 178
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/178"
started_at: 2026-06-13
---
# FEAT-102: Linear teammate flow (assign-to-Crew)

## Source

2026-06-08 positioning audit §8 CREW-NEXT-2.

## Problem

Codex (Codex for Linear: assign issue to Codex as teammate, `@Codex` in comments, triage rules auto-delegate) and OpenHands (Cloud native Linear) score 3 on Linear integration. Crew has only the NoopProvider / LinearProvider stub from FEAT-024 — not a teammate flow. Most startups run Linear; without this, Crew is invisible to PM-driven workflows.

## Proposal

First-party Linear adapter that:
1. Watches issue assignment to a designated Linear "Crew bot" user.
2. On assignment, dispatches `/loop:spec-decompose` (if SPEC-shaped) or `crew:build` (if FEAT-shaped) against the issue body.
3. Posts back status updates: triage result, slice start, slice complete, grade summary.
4. Links the Linear issue to the resulting GH PR.

## Acceptance criteria

- `LinearProvider` upgraded from stub (FEAT-024) to production: watch + assign + comment APIs.
- Webhook receiver at `scripts/linear-sync/webhook.mjs`.
- Mention parser: `@crew triage`, `@crew build`, `@crew status`.
- Round-trip: Linear issue → FEAT/SPEC → PR; PR closes → Linear status → Done with grade summary in comment.
- Tests: webhook payload parser, mention regex, reply-formatter snapshot test.
- Documented at `docs/integrations/linear-teammate.md`.

## Out of scope

- Cycle/project/roadmap automation (CRUD on issues only in v1).
- Multi-team Linear instances (single workspace v1).

## References

- Codex for Linear: https://developers.openai.com/codex/integrations/linear
- FEAT-024 (existing LinearProvider stub).
- Strategy doc §6 small startups segment.
