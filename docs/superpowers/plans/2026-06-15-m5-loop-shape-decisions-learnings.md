# M5 — Shape/Phase-Gate + Decisions/Learnings + Backlog (Loop Side) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Emit 3 new events for visibility into slice-shape classification, phase-gate parallel-mode detection, and backlog state transitions.

**Parent Spec:** Milestone M5, FEATs L5-1, L5-2, L5-3.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/classify-slice-shape.mts` (or wherever shape classification happens) | modify | After `shape-markers/SLICE-NNN.json` written, emit `shape_classified` slice-event + fan out kind `slice.shape_classified` payload `{sliceId, shape, rationale, inlinePathUsed, ts}`. |
| `src/scripts/lib/phase-gate-detection.mts` (or wherever phase-gate parallel-mode is detected) | modify | At validator completion if parallel mode was used, emit `phase_gate_mode_detected` with `{sliceId, mode: "parallel"|"serial", ts}`. Fan out as `slice.phase_gate_mode_detected`. |
| `src/scripts/lib/backlog-writer.mts` (or backlog mover) | modify | After backlog file moves between pending → triaged → in-progress → done, emit `backlog_state_changed` with `{featId, fromState, toState, ts}`. Fan out as `loop.backlog_state_changed`. |
| `schemas/loop-events/index.json` | modify | Add 3 kinds → slice-event.schema.json (all 3 reuse slice-event payload). |
| `src/tests/shape-classified-emit.test.mts` | new | |
| `src/tests/phase-gate-mode-emit.test.mts` | new | |
| `src/tests/backlog-state-changed-emit.test.mts` | new | |

---

## Tasks

1. **shape_classified** — wire emission at end of shape classification. Commit `feat(shape): emit slice.shape_classified event after shape-marker write`.
2. **phase_gate_mode_detected** — emit at validator completion. Commit `feat(phase-gate): emit slice.phase_gate_mode_detected event`.
3. **backlog_state_changed** — emit at backlog state mover. Commit `feat(backlog): emit loop.backlog_state_changed event on state mutation`.
4. **Schema index** — 3 new kinds. Commit `feat(schemas): index 3 new M5 kinds`.
5. **Final sweep** — tests, lint, format, tsc, validators, event-schemas.
