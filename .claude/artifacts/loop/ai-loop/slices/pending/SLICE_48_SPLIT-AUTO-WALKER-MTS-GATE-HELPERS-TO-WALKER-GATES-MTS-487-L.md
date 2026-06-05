---
id: SLICE-48
status: pending
feature: FEAT-045
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-05
updated: 2026-06-05
---
# SLICE-48: Split auto-walker.mts gate helpers to walker-gates.mts (487 lines near 400-line convention)

Implements FEAT-045. See [feature file](../../../backlog/in-progress/FEAT-045.md) for product context.

## Objective

auto-walker.mts is 487 lines, near the 400-line module convention. Gate helpers (compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate) are ~100 lines with no dependency on walker I/O — clean extraction to walker-gates.mts. walkCandidates and runAutoWalker stay in auto-walker.mts. Pre-empts a future convention violation as the walker grows. No behavior change. Acceptance criteria: AC-1: walker-gates.mts created with compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate exported. AC-2: auto-walker.mts drops to under 400 lines. AC-3: all existing walker tests pass unchanged. AC-4: npm run typecheck clean.

## In scope

- Extract `compareWalkerOrder`, `checkDependsOn`, `evaluateCandidate`, `evaluateRiskGate` from `auto-walker.mts` to new `walker-gates.mts`
- `auto-walker.mts` imports them from `./walker-gates.mjs`
- No logic changes — pure extraction

## Out of scope

- Any behavior change; no new logic

## Acceptance criteria

- [ ] AC-1: `src/scripts/lib/walker-gates.mts` created; exports `compareWalkerOrder`, `checkDependsOn`, `evaluateCandidate`, `evaluateRiskGate`
- [ ] AC-2: `auto-walker.mts` line count drops to under 400 lines after extraction
- [ ] AC-3: `npm test` passes — all existing walker tests pass unchanged; `npm run typecheck` clean
- [ ] AC-4: `npm run lint` clean (no cyclomatic complexity violations in extracted file)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-045 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
