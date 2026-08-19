---
id: FEAT-021
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-44]
derived_from: null
pm_customer_impact: 0.2
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.3
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Concrete, source-verified demand check across every adopter repo in the sole operator's estate shows zero live or historical consumers of dotnet-typescript-vue -- this drives the recommendation to deprecate the preset rather than author a new skill, which Framework 1 would otherwise flag as speculative investment. All five dimensions score low given the small, low-risk, low-value nature of a clean deprecation; lands at the formula's default P2 band (the same treatment given to FEAT-012's trivial cleanup last round) despite being intuitively a low-priority hygiene item, not an urgent one."
started_at: 2026-08-19
slices_complete: [SLICE-44]
completed_at: 2026-08-19
---
## Description

Vue skill gap: dotnet-typescript-vue preset's fe block lost its only Vue-framework skill when dead id vue-engineering was deleted (SLICE-35 AC-3 preset repair — no successor skill exists in the catalog). Decide: author a real vue-engineering skill under skills/domain/ui/ (mirroring react-engineering's shape) OR deprecate the dotnet-typescript-vue preset if Vue is no longer a supported stack. Evidence: src/tests/preset-skill-ids.test.mts guards presets against dead ids; the preset currently ships with no framework-specific fe skill.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given zero adopter repos across the sole operator's estate reference the dotnet-typescript-vue preset (verified via grep across every sibling repo's .claude/loop.json and .claude/devcrew.json), When the PM scope-challenge is applied, Then the recommended resolution is to deprecate/remove the preset rather than author a new vue-engineering skill for a stack with no live consumers.
- AC-2: Given the dotnet-typescript-vue preset entry is removed from the preset catalog, When src/tests/preset-skill-ids.test.mts runs, Then its fixtures no longer reference the removed preset and the test suite passes with no dangling reference to it.
- AC-3: Given an operator invokes `--preset dotnet-typescript-vue` after removal, When the installer runs, Then it fails with a clear error naming the preset as removed/unsupported and pointing at dotnet-react as the nearest TypeScript-frontend neighbor, rather than silently falling through to a preset with an empty fe skill block.
- AC-4: Given the removal is complete, When CHANGELOG.md is updated, Then it documents the dotnet-typescript-vue preset's removal and the evidence basis (zero live adopters; no successor skill existed since vue-engineering's deletion per SLICE-35 AC-3) as a hard-break, no-shim entry.
