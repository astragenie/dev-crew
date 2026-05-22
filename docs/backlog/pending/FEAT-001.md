---
id: FEAT-001
status: pending
priority: P0
category: safety
target_release: v0.2.0
created: 2026-05-22
updated: 2026-05-22
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
phase: 3
---

# FEAT-001: Loop iteration cap + runaway halt

## Description

Add `loop_iteration_count` and `loop_max_iterations` to the
autonomous-loop runtime so an unattended loop self-halts before it
burns unbounded tokens or destabilizes a repo.

Default cap: 25 iterations (tunable via
`.claude/autonomous-loop.json::loop.maxIterations`).

When the cap is reached, the loop transitions to
`blocked` with reason `iteration_cap_reached` (depends on hero-crew
FEAT-006 landing first for the badge to exist; until then, use a local
sentinel and emit a clear final-synthesis).

## Acceptance hints

- `loop.maxIterations` honored from config.
- `loop_iteration_count` increments per loop cycle, persisted in
  workflow-state.
- Halt is graceful: writes final-synthesis explaining the cap was hit
  + the next-step recommendation for the human.
- Cost-advisor flagged spikes (cache-busted, opus-overuse) can bring
  the cap forward — see FEAT-003.
- Tests cover: cap honored, persistence across `phase-gate` calls,
  graceful synthesis on halt.
