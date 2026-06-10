---
feature: FEAT-083
---
# Run Brief: FEAT083 SLICE89: Trajectory JSON -- machine-parseable step log per run

- Created: 2026-06-10T23:09:57.460Z
- Goal: Extend `auto-dispatch.jsonl` schema with three optional fields (`stepType`, `inputTokens`, `outputTokens`) so existing audit log discriminates dispatch events from non-dispatch events and can carry token counts when callers know them. Strictly additive — no field removed or renamed. Unblocks downstream consumers (FEAT-165 per-skill cost attribution, FEAT-172 usage dashboard).  See architect preflight: `.claude/artifacts/loop/plans/FEAT-083-preflight.md`.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/auto-dispatch.mts` — extend `DispatchOpts` and audit entry builder to accept and persist `stepType` (default `"dispatch"`)
  - `inputTokens` (default `null`)
  - `outputTokens` (default `null`).
- `src/scripts/lib/halt-badges.mts` (line ~30) — tag session-drift-override audit-log writes with `stepType: "session-drift-override"`.
- `src/tests/auto-dispatch.test.mts` — new tests covering the three AC test cases below.
- `docs/halt-badges.md` — one-sentence note on the `stepType` discriminator.
- Out Of Scope:
  - - New CLI subcommand
  - trajectory flag
  - or any user-facing surface.
- New artifact stream (no `trajectory.jsonl` etc). Reuse `auto-dispatch.jsonl`.
- Full tool-call observation stream (Read/Edit/Bash interception) — Claude Code tool API does not expose hooks for this from a plugin.
- Replay tooling
  - training-data export
  - dataset packager.
- Log rotation / retention policy.
- Skill-name bucketing on
- Planned Files: -
- Next Step: Begin implementation

