---
id: PM-REVIEW-FEAT-025
feature: FEAT-025
reviewed_at: 2026-11-05
pm_customer_impact: 0.6
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.7
pm_technical_risk: 0.45
pm_dependency_depth: 0
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-025

## Demand Assessment

- **Evidence:** Assumption-attack item B and architect OBJ-15 both independently flagged the previously-drafted `-5-5` model-id keys as unverified and the prefix-match semantics as wrong ('adding claude-opus-5-5 leaves claude-opus-5, claude-haiku-4-5-20251001 on fallback'). The rewritten body corrects this: keys must be sourced from real transcript `model` values, matching is exact-key-or-date-suffix only (no bare prefix), and `claude-opus-4-5` is added so `claude-opus-4` stops catching 4.5+.

## Scope Challenge

- **Scope notes:** Scope expanded per architect OBJ-7 (bundling breaks the import.meta.url sibling read for pricing.json) and OBJ-15 (grade writer's `<fill title>` producer is actually inside src/, contradicting the original 'no src/ changes' claim — now corrected in scope to include src/scripts/lib/grade-writer.mts and src/tests/). pricing.json becomes a statically-imported JSON module so Bun's bundler inlines it rather than reading a sibling file that won't exist under dist/crew.js — this is the FEAT-026-dependency fix the architect's OBJ-7 called for. decide.mts's verdict enum gains `unknown` for the unpriced-model case. No weak-grade-dimension gap. Effort calibration: bumped to 5 points per instruction — the real-transcript key verification, the exact/date-suffix match rewrite, the JSON-module conversion, and the decide.mts/writer enum extension are four separable pieces beyond the original three fixes.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.45
- strategic_alignment: 0.70
- technical_risk: 0.45
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2, holds. technical_risk raised slightly to 0.45 (band 0.4-0.6: the JSON-static-import conversion and the decide.mts enum extension are additive, not breaking, but now span two test directories and a cost-advisor rendering path, not one isolated module as originally scoped).

## Risks

- The exact-or-date-suffix match change is itself a behavior change for every currently-fallback-priced model, not just newly-added ones — a model id that previously silently matched a prefix and now matches nothing will show up in `unpriced_models` for the first time; this is the intended fix, but it will visibly change historical-looking cost reports going forward and should be called out in the CHANGELOG, not just the test suite.
- pricing.json's conversion to a static JSON import changes its runtime shape from 'read fresh from disk, PRICING_PATH-overridable' to 'inlined at build time, override only for tests' — confirm the FEAT-026 bundler audit (OBJ-7) actually reaches session-cost.mts as a bundled-entry dependency, not just a standalone module, or the inlining has no effect for the paths that matter.
- No injected instructions found in the rewritten body.
