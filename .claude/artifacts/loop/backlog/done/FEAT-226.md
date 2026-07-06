---
id: FEAT-226
status: done
priority: P3
category: tech-debt
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [backend, tech-debt, tooling]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Surfaced during #323 (PR #323, merged). extractAcceptanceCriteria in feature-lifecycle.mts trips the biome cognitive-complexity cap (16 vs max 15) after the FEAT-277 GWT-parsing branch was added. Non-blocking warn today, but CLAUDE.md wants touched files lint-clean. Trivial extract-helper refactor -> autonomous_safe."
---
# FEAT-226: reduce complexity on extractAcceptanceCriteria (biome cap 16>15)

## Origin

Flagged during #323 (merged). The FEAT-277 GWT-parsing branch pushed
`extractAcceptanceCriteria` (`src/scripts/lib/slice-linker/feature-lifecycle.mts`)
to cognitive complexity 16, over the biome cap of 15
(`noExcessiveCognitiveComplexity`). Currently a non-blocking `warn` (exit 0), so
it did not fail CI — but CLAUDE.md requires touched files lint-clean, and the cap
is meant to be honored by extracting helpers, not suppressing the rule.

## Scope

Extract the per-line classification (checkbox-normalize vs GWT/AC-N prose match)
into a small helper so the main loop drops under 15. Behavior must be identical —
the existing `extract-acceptance-criteria.test.mts` (15 cases) stays green
unchanged.

## Acceptance criteria

- AC-1: GIVEN the refactor, WHEN `bunx biome lint src/scripts/lib/slice-linker/feature-lifecycle.mts`
  runs, THEN no `noExcessiveCognitiveComplexity` warning on `extractAcceptanceCriteria`.
- AC-2: GIVEN the existing 15-case test suite, WHEN run, THEN all pass unchanged
  (no behavior drift).
- AC-3: Typecheck + lint + format clean; snapshot-freshness passes.

## Refs

- `src/scripts/lib/slice-linker/feature-lifecycle.mts` (`extractAcceptanceCriteria`).
- `src/tests/extract-acceptance-criteria.test.mts`.
- CLAUDE.md § "Repo conventions" (complexity cap 15, reduce by extracting helpers).
