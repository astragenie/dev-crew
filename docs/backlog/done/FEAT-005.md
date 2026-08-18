---
id: FEAT-005
status: done
priority: P2
category: telemetry
target_release: v0.2.0
created: 2026-05-22
updated: 2026-05-22
completed: 2026-05-22
depends_on: [FEAT-001]
slices: []
derived_from: null
autonomous_safe: true
phase: 3
---

# FEAT-005: snapshot-memory enrichment with iteration count

## Description

Once FEAT-001 lands, persist `loop_iteration_count`,
`loop_max_iterations`, and the in-window cost trajectory into
`writeMemorySnapshot` output so the snapshot serves as a real continuity
artifact for the next session.

## Acceptance hints

- Snapshot adds a "Loop telemetry" section with iteration count, cap,
  per-iteration avg cost, last cost-advisor verdict.
- Falls back gracefully when no loop run has happened yet (snapshot
  remains valid for non-loop usage).
- Test covers snapshot shape with and without loop history.
