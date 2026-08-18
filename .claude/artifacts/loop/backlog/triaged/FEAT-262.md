---
id: FEAT-262
status: triaged
priority: P2
category: tooling
target_release: null
created: 2026-07-10
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
pm_reviewed: 2026-07-19
triage_notes: "P2: low customer_impact (pure internal hygiene/reviewer-debt closeout) but technical_risk sits at the upper edge of the 0.3-0.5 band (0.45) because the target module is the sole-writer, CI-gate-allowlisted backlog surface — mitigated by an existing in-repo split precedent (slice-linker) that keeps this from crossing into the 0.6+ band."
github_issue: 505
github_url: "https://github.com/astragenie/runner-plugin/issues/505"
pm_customer_impact: 0.25
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.35
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
tags: [be]
needs_contract: false
needs_ux: false
p0_bucket: carry
p0_bucket_reason: "backlog-surface reviewer-debt cleanup is internal runner-plugin hygiene, ports as-is"
---
# FEAT-262: split backlog-store.mts + close reviewer test-gap follow-ups from tracker waves 2-3

## Problem

`src/scripts/lib/backlog-store.mts` is at ~719 lines after SLICE-152 added the
slice-side CRUD — past the repo's "one responsibility per module; split at
~400 lines" convention (typescript-reviewer MEDIUM finding on PR #441). It now
carries two responsibilities: feature-lifecycle CRUD and slice-lifecycle CRUD
plus AC-parsing helpers.

Accumulated non-blocking reviewer findings to close in the same pass:

- Split proposal: `backlog-store-feature.mts` / `backlog-store-slice.mts`
  behind a barrel, mirroring the slice-linker pattern (imports must keep
  going through the barrel — validate-imports/validate-backlog-writes style).
- `updateFeatureFrontmatter` vs `mergeAndWriteFrontmatter` byte-identical
  bodies — deliberate seam, re-judge at split time.
- `persistPivotAt` (wave/failure-pivot.mts) calls `moveSlice` unconditionally;
  whoever wires it into the live wave runner must re-add a source-state guard
  (reviewer note carried from PR #441 and #444).
- LinearProvider test gaps (PR #443 reviewer MINOR): `updateStatus`
  zero-workflow-states-found branch has no dedicated test;
  `postSliceComment`/`closeSlice` lack success-path unit tests.
- Guard hardening option: `validate-backlog-writes.mts` matches literal
  call-site variable names (documented precision-over-recall tradeoff);
  consider data-flow detection if novel bypass patterns appear.

## Intake notes

Created mechanically during the 2026-07-10 close ceremony. Priority unset —
run `/runner:triage` to score before slicing.
