---
id: PM-REVIEW-FEAT-283
feature: FEAT-283
reviewed_at: 2026-08-04
pm_customer_impact: 0.85
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.9
pm_technical_risk: 0.45
pm_dependency_depth: 0.2
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-283

## Demand Assessment

- **Evidence:** Live, currently-active defect, not theoretical: SLICE-181 and SLICE-182 both closed today (2026-08-04) through the unbounded grandfather clause on frontmatter-less artifacts. The mtime-sort bug was reproduced accidentally in the same session (editing the older artifact flipped an approved verdict to rejected with no content change). The unrecognized-verdict bug produced a directly observed self-contradicting message ('decision: PASS - a rejected review cannot close').

## Scope Challenge

- **Scope notes:** Three independent, separately-verifiable defects in the review gate itself (review-gate.mts, artifact-verdict.mts) — split one slice per defect so each ships and is reviewable in isolation given how central this file is to every other slice's close path. Cross-module verdict-vocabulary disagreement with failure-classifier.mts's PASS_VERDICTS should be resolved or explicitly documented as intentional in the same slice as the unrecognized-verdict fix, not deferred. Grandfather-clause cutoff must preserve existing behavior for genuinely legacy (pre-cutoff) artifacts — this is a bound, not a removal.

## Scores

- customer_impact: 0.85
- effort_estimate: 0.40
- strategic_alignment: 0.90
- technical_risk: 0.45
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: Highest customer_impact and strategic_alignment of the three: this is a currently-active defect in the review gate itself, the single mechanism every other slice's close depends on, and it has already caused two silent-pass closes today. Effort is comparatively low (three localized, well-understood fixes) which is why it isn't P0, but the risk of touching gate-of-gates logic is real enough to flag autonomous_safe=false so a human confirms the grandfather-clause cutoff and sort-key fallback before this merges — getting this fix wrong reproduces the exact failure class it's fixing, one layer deeper.

## Risks

- This FEAT modifies the mechanism that gates every other slice's close — a regression here has outsized blast radius (either wrongly blocking all future closes or, worse, continuing to silently pass bad reviews in a new way). Recommend human review of the grandfather-clause cutoff choice and the sort-key fallback logic before merge, hence autonomous_safe=false.
- Bounding the grandfather clause by date requires picking a cutoff; too aggressive breaks legitimate pre-P1.3 legacy artifacts, too lenient reproduces today's silent-pass bug for a longer window.
- Fixing the mtime-vs-filename-timestamp sort touches artifact selection logic shared across fresh clones, worktrees, and cherry-picks — needs a repro test that simulates arbitrary mtimes, not just a live-repo check.
