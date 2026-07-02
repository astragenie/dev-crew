---
id: FEAT-212
status: triaged
priority: P2
category: telemetry
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [telemetry, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.32
pm_strategic_alignment: 0.5
pm_technical_risk: 0.3
pm_dependency_depth: 0.4
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.3-0.5: new but additive JSONL event schema, cross-module (SOP detection step + brief/snapshot rendering), no breaking contract change, clean rollback. P2: moderate value (makes an unmeasurable reliability claim measurable) but not urgent since the underlying pause epidemic is already fixed per retrospective Section 0.3 -- this is observability hygiene, not an active-bug fix like FEAT-206/208. dependency_depth 0.4 reflects the real (if undeclared) sequencing on FEAT-206 and FEAT-211 landing first."
---
# FEAT-212: Structured pause/retry telemetry

## Problem

No machine-queryable pause/retry counter exists. All specialist-pause
data is prose in grade files (hand-count: ~31% of slices in the
SLICE-51..98 window). `auto-dispatch.jsonl` measures a different,
mostly-deprecated subsystem (DEC-011) — mining it yields a false ~55%
number. Post-FEAT-161 durability of the pause fix is unmeasurable.

## Acceptance hints

- One JSONL event appended per detected pause (reuse the SOP detection
  step; land after FEAT-206 and on FEAT-211's helper).
- Per-dispatch denominator captured so a real rate (not per-slice
  incidence) is computable.
- Brief/snapshot renders a pause rate.

## Evidence

- Retrospective F-06 (WP2 §1-2).
