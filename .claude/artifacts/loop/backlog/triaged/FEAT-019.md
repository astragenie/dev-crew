---
id: FEAT-019
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.9
pm_technical_risk: 0.55
pm_dependency_depth: 0.4
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-19
autonomous_safe: false
triage_notes: "High strategic_alignment (this is the roadmap centerpiece the whole program targets) and impact 0.75 with alignment 0.9 land it at P1 via the formula. autonomousSafe is forced to false per explicit production-promotion policy -- both this repo's constitution.md and the team lead's direction require operator approval regardless of the computed dimension scores."
tags: ["stack:typescript", "area:release-engineering", "concern:production-promotion"]
needs_contract: false
needs_ux: false
---
## Description

Cut devcrew v1.0.0: bump plugin.json + package.json from 1.0.0-rc.1, update CHANGELOG with the unification summary, bump the astra-marketplace devcrew entry version in a paired commit, tag v1.0.0. Production-promotion class: requires explicit operator approval at execution time — NOT autonomous_safe.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given plugin.json and package.json currently at 1.0.0-rc.1, When the release commit is prepared, Then both are bumped to 1.0.0 in the same commit.
- AC-2: Given CHANGELOG.md, When the release commit is prepared, Then it contains a summary of the unification program (P0-P5) under the new 1.0.0 entry.
- AC-3: Given the astra-marketplace registry's devcrew entry, When the paired commit lands, Then its version matches the newly-tagged 1.0.0 and `bun ./src/scripts/validate-marketplace-sync.mts` passes.
- AC-4: Given all of the above is committed and reviewed, When the v1.0.0 tag is created, Then it is created and pushed ONLY after explicit operator approval at execution time -- no autonomous dispatch performs the tag/push step.
