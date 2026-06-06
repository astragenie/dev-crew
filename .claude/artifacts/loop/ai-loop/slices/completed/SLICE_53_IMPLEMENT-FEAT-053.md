---
id: SLICE-53
status: completed
feature: FEAT-053
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-53: Implement FEAT-053

Implements FEAT-053. See [feature file](../../../backlog/in-progress/FEAT-053.md) for product context.

## Objective

Currently /loop:slice from-feature produces a slice scaffold with placeholder ACs:

## In scope

- Parse `## Acceptance criteria` section from parent FEAT body
- Inject derived ACs into slice scaffold before write
- Fallback to existing placeholder when FEAT has no AC section or malformed
- Tests in `src/tests/slice-from-feature*.test.mts`

## Out of scope

- Multi-slice AC scoping (slice frontmatter markers) — defer to follow-up
- Editing existing slice files retroactively
- Changing AC linter rules

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint is clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `/loop:slice from-feature` reads parent FEAT body for `## Acceptance criteria` section via new helper in `src/scripts/lib/slice-from-feature.mts` (or current home of the from-feature logic)
- [ ] AC-3: When AC section found, slice scaffold `## Acceptance criteria` block populated with FEAT's ACs verbatim (checkbox state preserved — all unchecked)
- [ ] AC-4: When FEAT has multiple ACs, first slice gets all of them (multi-slice scoping is OUT OF SCOPE for this slice)
- [ ] AC-5: When no AC section found in FEAT, fall back to current placeholder (no regression in existing behavior)
- [ ] AC-6: When FEAT AC section is malformed (no `- [ ]` lines), fall back to placeholder; do not crash
- [ ] AC-7: Unit tests cover: FEAT with ACs → slice gets them verbatim; FEAT without ACs → placeholder fallback; FEAT with malformed AC section → safe degrade; FEAT AC section preserves checkbox state

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-053 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — parser robustness on real FEAT bodies, checkbox preservation, fallback paths, no regression in existing from-feature CLI flow
- Reviewer B: scope discipline — multi-slice scoping NOT included, AC linter NOT modified, no leakage into FEAT-052/054 territory
