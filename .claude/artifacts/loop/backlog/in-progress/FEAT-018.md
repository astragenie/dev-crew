---
id: FEAT-018
status: in-progress
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-29]
derived_from: null
pm_customer_impact: 0.35
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.45
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Small, well-specified test-coverage gap closure on load-bearing fail-soft infra, directly evidenced by a recent grade lesson; trivially low risk since it is test-only."
tags: ["stack:typescript", "area:test-coverage", "concern:fail-soft-infra"]
needs_contract: false
needs_ux: false
started_at: 2026-08-19
---
## Description

Guarded-fire test coverage: crew/scripts/lib/guarded-fire.mts survived the GEPA deletion as relocated fail-soft infrastructure but its unit test was deleted with the gepa test tree (SLICE-22 grade note); write a fresh colocated bun:test suite covering fire-success, swallow-on-error, and timeout paths.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given guarded-fire's success path, When a colocated bun:test exercises a normal fire() call that completes without error, Then the test asserts the wrapped function's result is returned unchanged.
- AC-2: Given guarded-fire's fail-soft contract, When the wrapped function throws, Then a colocated test asserts the error is swallowed (not propagated) and the documented fallback/no-op behavior occurs instead.
- AC-3: Given guarded-fire's timeout path, When the wrapped function exceeds its configured timeout, Then a colocated test asserts the call is treated as failed/swallowed per the same fail-soft contract as the error case, not left hanging.
- AC-4: Given the new test file, When `bun test src/tests/ --parallel --timeout 60000` runs, Then it passes and is picked up by the existing suite discovery with no separate CI wiring needed.
