# autonomous-loop — Product Backlog

Companion to `hero-crew/docs/architecture.md`. Items here are the
runtime / safety / telemetry pieces the autonomous-loop plugin owns.

## Phase 3 — Loop safety + telemetry

| ID       | Title                                              | Autonomous-safe |
|----------|----------------------------------------------------|-----------------|
| FEAT-001 | Loop iteration cap + runaway halt                  | yes             |
| FEAT-002 | Mirror blocked + escalated_to_human badges         | yes             |
| FEAT-003 | Cost-advisor signal in stop-conditions             | yes             |
| FEAT-005 | snapshot-memory enrichment with iteration count    | yes             |

## Phase 4 — Defer

| ID       | Title                                              | Trigger                                |
|----------|----------------------------------------------------|----------------------------------------|
| FEAT-004 | Optional cross-repo parentRunId                    | Concrete cross-repo workflow observed  |

## Dependency on hero-crew

- FEAT-002 (here) consumes hero-crew FEAT-006 (workflow badges).
- FEAT-001 (here) can ship independently.

## Autonomous-safety guidance

All Phase 3 items are mechanical extensions of existing primitives.
Each slice still passes through crew review + validation gates. A
runaway autonomous loop building these features will halt by design
once FEAT-001 lands (or before, via cost-advisor — FEAT-003).
