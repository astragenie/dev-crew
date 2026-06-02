---
id: SLICE-02
status: completed
feature: FEAT-001
phase: null
priority: P2
target_release: null
created: 2026-05-27
updated: 2026-06-01
completed_at: 2026-05-28
---
# SLICE-02: Implement FEAT-001

Implements FEAT-001. See [feature file](../../../backlog/in-progress/FEAT-001.md) for product context.

## Objective

Preventive cleanup of code smells identified in the 2026-05-27 performance audit. No critical issues — codebase is structurally healthy (315 tests, 4s suite, no circular deps, no swallowed errors). This is hygiene to keep technical debt from accumulating.

## In scope

- Consolidate duplicate `pathExists` / `ensureDir` — import from `paths.mjs`
- Split `slice-linker.mjs` (>400 lines) into submodules
- Reduce `buildTokens` cyclomatic complexity below ESLint cap

## Out of scope

- Dynamic import audit (low priority, no regressions found)
- loop-installer.mjs split (402 lines, within tolerance)

## Acceptance criteria

- [ ] AC-1: No local definitions of `pathExists` or `ensureDir` outside `paths.mjs`; all consumers import from `paths.mjs`
- [ ] AC-2: `slice-linker.mjs` is a barrel (≤10 lines re-exporting submodules)
- [ ] AC-3: `npm run lint` clean (zero warnings), `npm test` green

## Done When

- all acceptance criteria PASS with evidence
- FEAT-001 moved from `in-progress/` to `done/`

## Reviewer ladder

- Reviewer A: spec compliance (pathExists/ensureDir consolidation verified)
- Reviewer B: code quality (no regressions, lint clean)
