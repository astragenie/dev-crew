---
id: FEAT-044
status: triaged
priority: P2
category: tech-debt
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=5+ (inline prefix), derived_from=null → true"
---
# FEAT-044: Split loop-installer.mts — extract token helpers and scaffold writers (533 lines over 400-line convention)

loop-installer.mts is 533 lines, 33% over the 400-line module convention. Has 18 functions with two clear split points: (1) template/token helpers (readTemplate, renderTemplate, resolveLoopPath, buildMandatoryDocsList, buildContextRulesList, buildTokens) ~80 lines → loop-installer-tokens.mts; (2) scaffold write functions (writeBacklogScaffold, writeBacklogStateMachine, writeGradesScaffold, writeDecisionsScaffold, writeSpecsScaffold, writeLoopControlFiles, writeLoopRules) ~280 lines → loop-installer-scaffold.mts; keep installLoop + reportStatus + applyMarkerBlock + updateClaudeMd in main module. No behavior change — pure structural split. Acceptance criteria: AC-1: loop-installer.mts drops to under 200 lines. AC-2: loop-installer-tokens.mts and loop-installer-scaffold.mts created with correct ESM exports. AC-3: all existing tests pass. AC-4: npm run typecheck clean. AC-5: install/status behavior unchanged (integration smoke).