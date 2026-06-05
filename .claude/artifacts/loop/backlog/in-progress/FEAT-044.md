---
id: FEAT-044
status: in-progress
priority: P2
category: tech-debt
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: [SLICE-47]
derived_from: null
autonomous_safe: true
composite_score: 0.5325
pm_customer_impact: 0.3
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.5
pm_technical_risk: 0.1
pm_dependency_depth: 0.05
triage_notes: "P2 tech-debt — 533 lines confirmed, pure structural split, no behavior change, no customer-visible impact"
started_at: 2026-06-05
---
# FEAT-044: Split loop-installer.mts — extract token helpers and scaffold writers (533 lines over 400-line convention)

loop-installer.mts is 533 lines, 33% over the 400-line module convention. Has 18 functions with two clear split points: (1) template/token helpers (readTemplate, renderTemplate, resolveLoopPath, buildMandatoryDocsList, buildContextRulesList, buildTokens) ~80 lines → loop-installer-tokens.mts; (2) scaffold write functions (writeBacklogScaffold, writeBacklogStateMachine, writeGradesScaffold, writeDecisionsScaffold, writeSpecsScaffold, writeLoopControlFiles, writeLoopRules) ~280 lines → loop-installer-scaffold.mts; keep installLoop + reportStatus + applyMarkerBlock + updateClaudeMd in main module. No behavior change — pure structural split. Acceptance criteria: AC-1: loop-installer.mts drops to under 200 lines. AC-2: loop-installer-tokens.mts and loop-installer-scaffold.mts created with correct ESM exports. AC-3: all existing tests pass. AC-4: npm run typecheck clean. AC-5: install/status behavior unchanged (integration smoke).