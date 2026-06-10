---
id: SLICE-72
status: completed
feature: FEAT-070
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [refactor, infra]
needs_contract: true
needs_ux: false
skip: [uxdesigner]
completed_at: 2026-06-07
github_issue: 149
github_url: "https://github.com/sergeymilashico/loop/issues/149"
---
# SLICE-72: B1 — enable noImplicitAny + useUnknownInCatchVariables

Implements FEAT-070 Phase B, slice 1. See [feature file](../../../backlog/in-progress/FEAT-070.md) for product context.

## Objective

Add `"noImplicitAny": true` and `"noImplicitAny": true, "useUnknownInCatchVariables": true` to `tsconfig.json`
(and `tsconfig.test.json` if applicable) and fix all resulting type errors
across `src/scripts/` and `src/tests/`. This is the first graduated tsconfig
tightening slice — it does NOT touch `noUnusedLocals`, `noUnusedParameters`,
or any other flag (those are B2+).

## In scope

- `tsconfig.json` — add `"noImplicitAny": true`, `"useUnknownInCatchVariables": true`
- `tsconfig.test.json` — same two flags if the file exists and inherits separately
- All `.mts` source files under `src/scripts/` that produce type errors under the new flags
- All `.mts` test files under `src/tests/` that produce type errors under the new flags
- Compiled `.mjs` artifacts: rebuild via `npm run build` after all fixes

The fix strategy for `: any` parameters:
- Replace `param: any` with the narrowest concrete type inferred from usage (no `as any` casting)
- For truly heterogeneous shapes, use `unknown` and add a type guard, or use a discriminated union if one already exists
- For catch blocks: change `catch (e)` → `catch (e: unknown)` and narrow before use (`instanceof Error`, `String(e)`, etc.)
- Prefer existing types already in the codebase over inventing new ones

## Out of scope

- `noUnusedLocals`, `noUnusedParameters` (B2)
- `noImplicitOverride`, `noFallthroughCasesInSwitch` (B3)
- `exactOptionalPropertyTypes` (B4)
- `noUncheckedIndexedAccess` (B5)
- Result<T,E>, branded IDs, discriminated unions (B6–B8)
- Adding `@ts-suppress` or `// @ts-ignore` annotations — not allowed
- Suppressing ESLint rules to hide type issues

## Acceptance criteria

- [ ] AC-1: `tsconfig.json` contains `"noImplicitAny": true` and `"useUnknownInCatchVariables": true`
- [ ] AC-2: `npm run typecheck` exits 0 with the two new flags active
- [ ] AC-3: `npm run lint` exits 0, zero warnings
- [ ] AC-4: `npm test` exits 0 (907 pass, 0 fail)
- [ ] AC-5: No `@ts-ignore`, `@ts-suppress`, `as any`, or `: any` escape hatches introduced (grep must return 0 new hits vs baseline)
- [ ] AC-6: `npm run build` exits 0; compiled `.mjs` artifacts match updated source

## Done When

- all ACs PASS with evidence
- `requires_validation: false` waives validation gate (type-only refactor, no runtime behavior change)
- FEAT-070 remains open (B2–B8 remain)

## Reviewer ladder

- Reviewer A: crew:reviewer
- Reviewer B: n/a
