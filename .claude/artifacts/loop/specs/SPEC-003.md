---
id: SPEC-003
type: sre
title: Loop-side halt badge observability across plugin boundary
status: draft
priority: P1
target_release: v0.21.0
created: 2026-06-06
updated: 2026-06-06
owner: null
derived_features: [FEAT-063, FEAT-064, FEAT-065, FEAT-066]
---
# SPEC-003: Loop-side halt badge observability across plugin boundary

## Problem

The loop plugin emits structured halt signals into stop-check JSON and brief JSON output (`snapshot.costRegression`, `snapshot.sessionDrift`, `snapshot.sliceCostCeiling`, `snapshot.gradeTrend`, and likely future additions). The crew plugin's `brief-me` consumes loop's brief output to render the Autonomous Loop section but has NO explicit per-field renderers for these halt badges. Operators only see the halts in raw `node loop.mjs stop-check` JSON, not in the human-readable `brief-me` brief.

Concrete evidence from this repo:

- SLICE-52 shipped `costRegression` halt (v0.12.0). Field flows into loop's brief output. Crew brief-me does not surface it under "Blocked / Missing" or any visible section.
- SLICE-54 shipped `sessionDrift` halt (v0.14.0). Same gap.
- GRADE-SLICE-52/53/54 all scored observability ≤0.78. Pattern alert "observability below 0.8 across last 3 slices" halted the walker after SLICE-54.

Grade rationale on each slice's observability section explicitly cited "cross-plugin renderer gap" as the cause.

## Scope

- Loop's `node scripts/loop.mjs brief` output schema (loop-owned)
- Crew's `brief-me` rendering of the Autonomous Loop section (crew-owned; upstream FEAT required)
- Documentation of the contract between the two

Out of scope for this spec body: stop-check raw JSON itself (already exposes the data); cost-advise renderer (already handled); any change to halt-firing logic (only rendering).

## SLO / target

**Operator-time-to-understand-halt ≤ 30 seconds.**

When the walker halts, the operator must be able to determine WHICH gate fired and the relevant context (current values, thresholds, both sessionIds, etc.) by running ONE command (`crew brief-me` or `loop brief`) and reading its human-readable output.

Measurable proxy: when any of `snapshot.costRegression`, `snapshot.sessionDrift`, `snapshot.sliceCostCeiling`, or future halt-badge fields are non-null, the brief-me "Blocked / Missing" section (or equivalent named section) renders the halt with:

- gate name (human-readable)
- key threshold values (current vs threshold)
- suggested next action (override flag, config knob to adjust, or runbook link)

## Error budget policy

A regression in this SLO (operator cannot identify halt cause within 30s) is treated as a P1 — blocks the next slice. This SPEC's derived FEATs land before any further halt-badge type is added to loop.

## Required signals

- Loop `brief` output continues to expose halt-badge fields verbatim (already shipped for `costRegression` and `sessionDrift`)
- Crew `brief-me` reads `autonomousLoop.snapshot` or top-level halt fields and renders each known halt type explicitly
- Each loop release that adds a new halt-badge field updates a single source-of-truth document (probably `docs/halt-badges.md`) declaring the field name + meaning. Crew renderer iterates this list, not the JSON keys, so unknown future fields degrade gracefully

## Alert posture

- Pattern alert "observability below 0.8 across last 3 slices" already fires from loop's pattern-alerts module. Keep it; it caught this gap.
- New runtime signal: if `brief-me` rendering encounters an unknown halt-badge field name in `snapshot.*`, log a `loop-halt-unknown` event for follow-up.

## Derived FEAT candidates (for /loop:spec-decompose)

1. **FEAT (loop-side):** publish `docs/halt-badges.md` source-of-truth — schema + meaning for each halt field. Drives the contract.
2. **FEAT (cross-plugin upstream-request):** crew `brief-me` renders Blocked/Missing entries for each known halt-badge field. Iterates registry from #1.
3. **FEAT (loop-side):** loop `brief` CLI gains `--explain-halts` flag that emits a human-readable summary of each non-null halt-badge field, so operators who do not have crew brief-me available still get the SLO behavior.
4. **FEAT (loop-side, optional):** unit test asserting `brief` output schema for halt badges does not regress (adding a new badge field is a deliberate act, not accidental drift).

## Out of scope

- Changing halt-firing thresholds or fail-open logic (separate concern)
- Telemetry pipelines outside the loop / crew CLI surface (no OTel, no metrics export)
- Cost-advise format (already renders fine in brief-me)
- Decision artifacts (decisions render fine)
