# M4 — Ops Hazard (Loop Side) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox.

**Goal:** Emit 2 hazard streams: `specialist_pause` event when a crew subagent stops without writing artifact; `halt_badge` per-cycle snapshot of every halt-badge field defined in `docs/halt-badges.md`.

**Architecture:** Reuse M1 `webhook-fanout`. Specialist-pause detection lives in dispatch-monitor / specialist-pause SOP module (search for "specialist-pause" or "pause-handling"). Halt-badge snapshot already produced by `lib/stop-conditions.mts::checkStopConditions`. Wire both to fan out.

**Parent Spec:** Milestone M4, FEATs L4-1, L4-2.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/specialist-pause-detector.mts` (or extend existing) | new/modify | Detect when a dispatched subagent paused without verdict/artifact. Emit `specialist_pause` via slice-events. Fan out kind `slice.specialist_pause`. |
| `src/scripts/lib/stop-conditions.mts` | modify | After computing `snapshot.*` halt-badges, fan out one envelope per non-null badge as kind `halt_badge` with payload `{badgeKind, ts, details, sliceId?, waveId?}`. |
| `schemas/loop-events/halt-badge.schema.json` | exists (M0) | No change. |
| `schemas/loop-events/index.json` | modify | Add `slice.specialist_pause` → slice-event.schema.json. |
| `src/tests/specialist-pause-emit.test.mts` | new | Tests: detector emits event + fans out. |
| `src/tests/stop-conditions-halt-fanout.test.mts` | new | Tests: each badge type produces a webhook call. |

---

### Task 1: Specialist-pause detection + emission

- [ ] Grep `specialist-pause` to find existing detection code.
- [ ] Write failing test: simulating a dispatch that paused without verdict → emit fired.
- [ ] Wire `appendSliceEvent({ type: "specialist_pause", sliceId, agent, reason, timestamp })` from the detector. Slice-event interface already permits arbitrary `reason` field via the existing optional pattern; add `"specialist_pause"` to `SliceEventType` union if not present.
- [ ] Add kind `slice.specialist_pause` → slice-event.schema.json in `schemas/loop-events/index.json`.
- [ ] Run + commit: `feat(specialist-pause): detector emits slice.specialist_pause event`.

---

### Task 2: Halt-badge fanout from stop-check

- [ ] Read `src/scripts/lib/stop-conditions.mts`. Find `checkStopConditions` (the function that builds `snapshot.*`).
- [ ] Write failing test: stop-check that triggers cost-regression + grade-trend → 2 webhook calls with kind `halt_badge`.
- [ ] After building snapshot, iterate non-null fields. For each, build payload `{badgeKind: <fieldName>, ts: now, details: <fieldValue>, sliceId?, waveId?}` and `fanoutEnvelope(repo, "halt_badge", payload)`.
- [ ] Fail-silent on fanout errors.
- [ ] Run + commit: `feat(stop-conditions): fan out halt_badge envelope per snapshot field`.

---

### Task 3: Final sweep

- [ ] Full test, lint, format, tsc, validators, event-schemas.
- [ ] Commit style fixups if needed.
