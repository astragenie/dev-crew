---
id: FEAT-059
status: triaged
priority: P2
category: cost-governance
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.8
pm_technical_risk: 0.25
pm_dependency_depth: 0.05
composite_score: 0.765
autonomous_safe: false
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=null → false"
---
# FEAT-059: Configurable grade-trend threshold + autoMode warn-alert demotion

Two surgical edits to let autonomous-mode marathons continue when grade-trend warn fires.

Today: src/scripts/lib/pattern-alerts.mts hard-codes SCORE_THRESHOLD=0.8 and TRAILING_SLICES=3. src/scripts/lib/stop-conditions.mts::applyWarnAlertSignals always halts on any warn-alert regardless of autoMode. Per-dimension overrides do not exist.

Fix:
- AC-1: pattern-alerts reads loop.gradeTrendThreshold (default 0.8) and loop.gradeTrendConsecutiveLimit (default 3) from config; falls back to current hard-coded defaults when absent.
- AC-2: pattern-alerts supports per-dimension overrides via loop.gradeTrendPerDimension (record of dim -> threshold). e.g. { observability: 0.7 } loosens only observability while keeping others strict.
- AC-3: applyWarnAlertSignals (stop-conditions.mts) accepts { autoMode } option; when autoMode=true, warn-alerts are pushed to suggestions array NOT reasons, and shouldStop stays false. Blockers still surface for visibility but do not halt the walker.
- AC-4: brief output adds warnAlertsDemoted: number when autoMode demotion fired this turn (observability signal — operators see the alert was downgraded, not lost).
- AC-5: per-category exemption list loop.warnAlertCategoriesIgnoredInAutoMode (default ['score-trend']). Demotion only applies to listed categories; safety-critical categories (e.g. cost) stay halt-blocking even in autoMode.
- AC-6: tests cover threshold-from-config, per-dimension override, autoMode demotion + brief field, non-listed category still halts even in autoMode, missing config falls back to defaults.

Why: marathon halts today on grade-trend warn (observability < 0.8 for 3 slices) even when operator deliberately wants to continue. Halting on subjective score is misaligned with autoMode intent. Cost halts (hard money) stay strict; subjective score halts soft.