---
id: FEAT-181
status: pending
priority: null
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
---
# FEAT-181: Marathon session-scope checkpoint — mandatory retrospective every N slices

Adopt the AgentOps coherent-arc session-scope rule (AGENTS-WORKFLOW.md in C:/work/mega/agentops): 2-4 atomic arcs per autonomous session; at >=5 a post-mortem checkpoint is mandatory. Loop marathon mode is currently unbounded (iteration cap advisory only) — drift accumulates unobserved across a long backlog walk.

## Acceptance hints
- New loop.json knob loop.marathonCheckpointEvery (default 4): after N slice-close ceremonies in one session, the walker emits a checkpoint requirement before the next slice start.
- Checkpoint = /loop:retrospective over the session window + lessons ratchet pass; result appended to auto-run artifact.
- Advisory->blocking: warn at N, hard stop-check reason at 2N without a checkpoint.
- stop-check exposes checkpointDue in snapshot for dashboards.