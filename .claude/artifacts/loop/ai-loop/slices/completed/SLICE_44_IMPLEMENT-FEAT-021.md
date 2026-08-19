---
id: SLICE-44
title: Implement FEAT-021
status: completed
feature: FEAT-021
phase: null
priority: P2
target_release: null
requires_validation: true
risk: low
created: 2026-08-19
updated: 2026-08-19
completed_at: 2026-08-19
---
# SLICE-44: Implement FEAT-021

Implements FEAT-021. See [feature file](../../../backlog/in-progress/FEAT-021.md) for product context.

## Objective

Vue skill gap: dotnet-typescript-vue preset's fe block lost its only Vue-framework skill when dead id vue-engineering was deleted (SLICE-35 AC-3 preset repair — no successor skill exists in the catalog). Decide: author a real vue-engineering skill under skills/domain/ui/ (mirroring react-engineering's shape) OR deprecate the dotnet-typescript-vue preset if Vue is no longer a supported stack. Evidence: src/tests/preset-skill-ids.test.mts guards presets against dead ids; the preset currently ships with no framework-specific fe skill.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given zero adopter repos across the sole operator's estate reference the dotnet-typescript-vue preset (verified via grep across every sibling repo's .claude/loop.json and .claude/devcrew.json), When the PM scope-challenge is applied, Then the recommended resolution is to deprecate/remove the preset rather than author a new vue-engineering skill for a stack with no live consumers.
- [ ] AC-2: Given the dotnet-typescript-vue preset entry is removed from the preset catalog, When src/tests/preset-skill-ids.test.mts runs, Then its fixtures no longer reference the removed preset and the test suite passes with no dangling reference to it.
- [ ] AC-3: Given an operator invokes `--preset dotnet-typescript-vue` after removal, When the installer runs, Then it fails with a clear error naming the preset as removed/unsupported and pointing at dotnet-react as the nearest TypeScript-frontend neighbor, rather than silently falling through to a preset with an empty fe skill block.
- [ ] AC-4: Given the removal is complete, When CHANGELOG.md is updated, Then it documents the dotnet-typescript-vue preset's removal and the evidence basis (zero live adopters; no successor skill existed since vue-engineering's deletion per SLICE-35 AC-3) as a hard-break, no-shim entry.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-021 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
