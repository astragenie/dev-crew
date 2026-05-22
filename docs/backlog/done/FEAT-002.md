---
id: FEAT-002
status: done
priority: P1
category: workflow
target_release: v0.2.0
created: 2026-05-22
updated: 2026-05-22
completed: 2026-05-22
depends_on: []
slices: []
derived_from: hero-crew/FEAT-006
autonomous_safe: true
phase: 3
---

# FEAT-002: Mirror blocked + escalated_to_human badges in slice flow

## Description

Once hero-crew FEAT-006 lands (`blocked`, `escalated_to_human`
workflow badges in crew), surface them in autonomous-loop:

- `completeSlice` recognizes them on the slice's parent run and refuses
  to roll the parent feature to `done/` while either is set.
- `checkStopConditions` treats `escalated_to_human` as a hard-stop.
- `brief` includes the badges in the autonomous-loop summary block.

## Acceptance hints

- Tests cover: blocked slice doesn't move feature; escalated_to_human
  stops the loop regardless of remaining backlog.
- No new badges introduced here — only consumption.
