---
id: FEAT-168
title: Slice decomposition gate when effort_points >= 8
status: pending
priority: P2
category: workflow
target_release: null
created: 2026-06-09
updated: 2026-06-09
depends_on: [FEAT-167]
slices: []
derived_from: null
source_competitors: []
autonomous_safe: false
tags: [pm, workflow, slice]
needs_contract: true
needs_ux: false
---
# FEAT-168: Slice decomposition gate when effort_points >= 8

## Problem

Large FEATs ship as one slice today because nothing forces decomposition. FEAT-020 is the worst-case example: 15 implementation tasks, 7 dependency waves, single SLICE-1 spanning all of it. Risks:

- Reviewer burnout — one PR diff covers an entire library, CLI, agent, and integration suite.
- Cost-regression false-trip — see FEAT-167.
- All-or-nothing rollback — if one wave fails, the whole slice is parked or reverted.

PM has no signal that a FEAT is too large. Slice-from-feature happily creates a single SLICE for any size.

## Proposal

`/loop:slice-from-feature` refuses to create exactly one slice when `effort_points >= 8`. Forces the user (or PM) to declare a slice breakdown.

PM agent emits `proposed_slices: [...]` during triage when `effort_points >= 8`:

```yaml
proposed_slices:
  - id_suffix: -SLICE-1
    title: Library + unit tests
    points: 5
  - id_suffix: -SLICE-2
    title: CLI + agent
    points: 3
  - id_suffix: -SLICE-3
    title: Integration tests + upstream PR
    points: 5
```

`slice-from-feature` consumes `proposed_slices[]` and creates them all up-front, status `pending` for slices 2+. Slice 1 is the start. Each slice tracks `parent_feat` linkage.

If `proposed_slices` is missing on a `>= 8` FEAT, slice-from-feature errors with a clear message: "FEAT-NNN is sized 13 points — emit `proposed_slices` first via `/loop:pm-review FEAT-NNN`."

## Acceptance criteria

- `/loop:slice-from-feature` enforces the gate (refuse + clear error).
- PM agent template extended to emit `proposed_slices` for `>= 8` point FEATs.
- New CLI helper `node scripts/loop.mjs feat decompose --id FEAT-NNN` regenerates `proposed_slices` from a fresh PM run.
- Tests covering: refuse path; happy path; idempotent re-run.

## Out of scope

- Auto-merging completed sub-slices back into the FEAT (existing slice-complete handles closure already).
- Cross-FEAT decomposition (this is single-FEAT only).

## Dependencies

- Hard dep on `[[FEAT-167]]` (needs `effort_points`).

## Related

- `[[FEAT-020]]` (FEAT-020 should have been sized 13 points; would have produced 3 slices instead of one).
