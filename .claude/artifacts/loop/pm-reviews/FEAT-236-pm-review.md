---
id: PM-REVIEW-FEAT-236
feature: FEAT-236
reviewed_at: 2026-07-19
pm_customer_impact: 0.25
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.35
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-236

## Demand Assessment

- **Evidence:** Internal audit only, not end-user demand. triage_notes: "Runner-owned cleanups from #365 step #9 (findings B3/M7/M8) ... UNBLOCKED, no external dependency." No user/persona quote exists.

## Scope Challenge

- **Scope notes:** MAJOR RESCOPE FINDING (mirrors the SLICE-95 'already mostly shipped' lesson from the required lessons digest): 3 of 4 non-stretch sub-slices are already shipped and verified live in this repo: (1) SLICE-1/B3 — src/scripts/lib/slice-linker/crew-bridge.mts:24-30 already has the fix with an inline comment explicitly citing 'FEAT-236 B3' and explaining the hardcoded author-path was removed; (2) SLICE-3/CI wiring — `.github/workflows/ci.yml:77` already runs `bun ./src/scripts/validate-imports.mts`, and CLAUDE.md's own CI-gates list (item 9) documents it as a gate; (3) SLICE-4/doc drift — grepped CLAUDE.md for '/runner:slice start' and '/runner:slice complete', zero hits, and codemod-add-any.mts is confirmed absent from src/ (zombie file already deleted). Only SLICE-2 (dead-export cleanup, ~51 exports minus what may already be gone) and the explicitly-deferred SLICE-5 (M7 any-debt, not required for close) remain live scope. Recommend the FEAT body be edited to drop SLICE-1/3/4 before slicing (researcher grep pass first to get a current dead-export count). No weak grade dimension is active (last-5 averages all >=0.80 per loop-snapshot.md; observability lowest at 0.82), so no mandatory weak-dimension AC. Effort calibration: no clean single-slice cost analog for a pure dead-export sweep; nearest comparable mechanical/CI slice is SLICE-159 (FEAT-257, $140/52min, single-purpose) — this FEAT's now-shrunk scope should land well under that.

## Scores

- customer_impact: 0.25
- effort_estimate: 0.20
- strategic_alignment: 0.35
- technical_risk: 0.15
- dependency_depth: 0.05

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2/low risk (0.0-0.2 band: known repo pattern, few files, git-revert-clean) mechanical cleanup; effort scored low because 3 of 4 sub-slices are independently verified already-shipped, leaving only a small dead-export sweep. No cost analog found for the shrunk scope (noted in scopeNotes).

## Risks

- Dead-export deletion must be grep-verified per-symbol before removal (a dynamic-import or string-literal consumer would not show up in a naive import grep) — mirrors the FEAT's own stated risk.
- Because B3/SLICE-3/SLICE-4 are already shipped, dispatching a builder against the FEAT's current unedited body risks wasted/duplicate work or a confused reviewer diffing against code that's already correct.
