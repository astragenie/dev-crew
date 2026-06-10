---
id: SLICE-47
status: completed
feature: FEAT-044
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
github_issue: 97
github_url: "https://github.com/sergeymilashico/loop/issues/97"
---
# SLICE-47: Split loop-installer.mts — extract token helpers and scaffold writers (533 lines over 400-line convention)

Implements FEAT-044. See [feature file](../../../backlog/in-progress/FEAT-044.md) for product context.

## Objective

loop-installer.mts is 533 lines, 33% over the 400-line module convention. Has 18 functions with two clear split points: (1) template/token helpers (readTemplate, renderTemplate, resolveLoopPath, buildMandatoryDocsList, buildContextRulesList, buildTokens) ~80 lines → loop-installer-tokens.mts; (2) scaffold write functions (writeBacklogScaffold, writeBacklogStateMachine, writeGradesScaffold, writeDecisionsScaffold, writeSpecsScaffold, writeLoopControlFiles, writeLoopRules) ~280 lines → loop-installer-scaffold.mts; keep installLoop + reportStatus + applyMarkerBlock + updateClaudeMd in main module. No behavior change — pure structural split. Acceptance criteria: AC-1: loop-installer.mts drops to under 200 lines. AC-2: loop-installer-tokens.mts and loop-installer-scaffold.mts created with correct ESM exports. AC-3: all existing tests pass. AC-4: npm run typecheck clean. AC-5: install/status behavior unchanged (integration smoke).

## In scope

- Split `src/scripts/lib/loop-installer.mts` into 3 files: main (< 200 lines), `loop-installer-tokens.mts`, `loop-installer-scaffold.mts`
- Token helpers to `loop-installer-tokens.mts`: `readTemplate`, `renderTemplate`, `resolveLoopPath`, `buildMandatoryDocsList`, `buildContextRulesList`, `buildTokens`
- Scaffold writers to `loop-installer-scaffold.mts`: `writeBacklogScaffold`, `writeBacklogStateMachine`, `writeGradesScaffold`, `writeDecisionsScaffold`, `writeSpecsScaffold`, `writeLoopControlFiles`, `writeLoopRules`
- Main keeps: `installLoop`, `reportStatus`, `applyMarkerBlock`, `updateClaudeMd`

## Out of scope

- Any behavior change; no new logic, no interface changes

## Acceptance criteria

- [ ] AC-1: `loop-installer.mts` drops to under 200 lines after split
- [ ] AC-2: `loop-installer-tokens.mts` created with all 6 token helper functions exported (ESM)
- [ ] AC-3: `loop-installer-scaffold.mts` created with all 7 scaffold write functions exported (ESM)
- [ ] AC-4: `npm test` passes (all existing tests unchanged); `npm run typecheck` clean
- [ ] AC-5: `node scripts/loop.mjs status --repo .` and `node scripts/loop.mjs install --repo . --preset minimal` both complete without error (integration smoke)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-044 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
