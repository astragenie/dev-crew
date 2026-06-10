---
id: SLICE-90
title: Trajectory JSON -- machine-parseable step log per run
status: completed
feature: FEAT-083
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-10
updated: 2026-06-10
github_issue: 198
github_url: "https://github.com/sergeymilashico/loop/issues/198"
completed_at: 2026-06-10
---
# SLICE-90: Trajectory JSON -- machine-parseable step log per run

Implements FEAT-083. See [feature file](../../../backlog/in-progress/FEAT-083.md) for product context.

## Objective

Extend `auto-dispatch.jsonl` schema with three optional fields (`stepType`, `inputTokens`, `outputTokens`) so existing audit log discriminates dispatch events from non-dispatch events and can carry token counts when callers know them. Strictly additive — no field removed or renamed. Unblocks downstream consumers (FEAT-165 per-skill cost attribution, FEAT-172 usage dashboard).

See architect preflight: `.claude/artifacts/loop/plans/FEAT-083-preflight.md`.

## In scope

- `src/scripts/lib/auto-dispatch.mts` — extend `DispatchOpts` and audit entry builder to accept and persist `stepType` (default `"dispatch"`), `inputTokens` (default `null`), `outputTokens` (default `null`).
- `src/scripts/lib/halt-badges.mts` (line ~30) — tag session-drift-override audit-log writes with `stepType: "session-drift-override"`.
- `src/tests/auto-dispatch.test.mts` — new tests covering the three AC test cases below.
- `docs/halt-badges.md` — one-sentence note on the `stepType` discriminator.

## Out of scope

- New CLI subcommand, trajectory flag, or any user-facing surface.
- New artifact stream (no `trajectory.jsonl` etc). Reuse `auto-dispatch.jsonl`.
- Full tool-call observation stream (Read/Edit/Bash interception) — Claude Code tool API does not expose hooks for this from a plugin.
- Replay tooling, training-data export, dataset packager.
- Log rotation / retention policy.
- Skill-name bucketing on events (belongs to FEAT-165).
- Dashboard rendering (belongs to FEAT-172).
- Slash-flow / command file edits in `commands/`.

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint clean (`bun run lint`); format check passes (`bun run format:check`); typecheck clean (`bunx tsc --project tsconfig.json --noEmit` and `--project tsconfig.test.json`).
- [ ] AC-2: `appendAuditLog` accepts and round-trips the three new optional fields. Given a dispatch with `stepType: "dispatch"`, `inputTokens: 1200`, `outputTokens: 340`, the resulting JSONL line parses to an object containing all three values exactly. Test in `src/tests/auto-dispatch.test.mts`.
- [ ] AC-3: Backward-compatibility — existing callers that pass only the legacy entry shape produce a record where `stepType` defaults to `"dispatch"` and both token fields are `null`. No throws, no schema break, no required field added. Test in `src/tests/auto-dispatch.test.mts`.
- [ ] AC-4: `halt-badges.mts` session-drift-override path tags its audit entry with `stepType: "session-drift-override"` so consumers can filter dispatch from non-dispatch events by `stepType`. Test in `src/tests/auto-dispatch.test.mts` (or a colocated halt-badges test if one exists).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-083 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (correctness): schema additivity verified — no field rename / removal / required-field addition; default values match preflight contract; AC-2/3/4 tests fail meaningfully when the implementation is broken; halt-badges call site correctly tagged.
- Reviewer B (production-readiness): cross-module contract impact — any existing reader of `auto-dispatch.jsonl` in the repo continues to parse old + new records; `costUsd: null` next to `inputTokens: null` does not regress any downstream consumer; doc update in `docs/halt-badges.md` reflects the discriminator.
