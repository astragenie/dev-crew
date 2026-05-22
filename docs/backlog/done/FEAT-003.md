---
id: FEAT-003
status: done
priority: P1
category: safety
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

# FEAT-003: Cost-advisor signal in stop-conditions

## Description

`checkStopConditions` already aggregates alert state. Extend it to
treat **high-severity** cost-advisor recommendations (cache-busted,
opus-overuse, exploration-heavy) as a soft stop signal when an
autonomous loop is running unattended.

The loop halts gracefully, writes a final-synthesis explaining the cost
trajectory, and points the human at `cost-advise` output.

## Acceptance hints

- `checkStopConditions` returns `shouldStop: true` + reason
  `cost_alert_high` when ≥1 high-severity advice fires across the last
  3 slices.
- Pluggable threshold via `.claude/autonomous-loop.json`.
- Tests cover: low-severity alone does NOT stop; high-severity stops;
  threshold override works.
