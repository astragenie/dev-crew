---
feature: FEAT-181
status: active
---
# Run Brief: FEAT181 SLICE95: Marathon session-scope checkpoint — mandatory retrospective every N slices

- Created: 2026-06-11T12:25:41.067Z
- Tier: full
- Goal: Adopt the AgentOps coherent-arc session-scope rule (AGENTS-WORKFLOW.md in C:/work/mega/agentops): 2-4 atomic arcs per autonomous session; at >=5 a post-mortem checkpoint is mandatory. Loop marathon mode is currently unbounded (iteration cap advisory only) — drift accumulates unobserved across a long backlog walk.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Add `loop.marathonCheckpointEvery` config knob to `.claude/loop.json` (default `4`). Document in schema.
- Track in-session slice-close count. Persist to `.claude/state/marathon-checkpoint.json` with `{ sliceCloseCount
  - lastCheckpointAt
  - sessionStartedAt }`. Increment on `slice complete`.
- Extend `src/scripts/lib/stop-conditions.mts` with `checkpointDue` reason:
  - `sliceCloseCount === marathonCheckpointEvery` → `severity: warn`
  - reason `marathon-checkpoint-recommended`.
  - `sliceCloseCount >= 2 × marathonCheckpointEvery` → `severity: halt`
  - reason `marathon-checkpoint-required`.
  - Counter resets when `/loop:retrospective` runs (record `lastCheckpointAt`).
- Expose `checkpointDue: boolean` + `sliceClosesSinceCheckpoint: number` in `bun src/scripts/loop.mts stop-check` JSON.
- ≥4 new
- Out Of Scope:
  - - Modifying `/loop:retrospective` behavior (existing command stays).
- Multi-session aggregation.
- Backfilling counter from existing grade history at install time.
- Planned Files: -
- Next Step: Begin implementation

