---
id: SLICE-73
status: completed
feature: FEAT-072
phase: 3
priority: P1
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: ["stack:node", "surface:none", "concern:types"]
completed_at: 2026-06-07
github_issue: 154
github_url: "https://github.com/sergeymilashico/loop/issues/154"
---
# SLICE-73: tsconfig B2+B3 — noUnusedLocals + noUnusedParameters + noImplicitOverride + noFallthroughCasesInSwitch

Implements FEAT-072. See [feature file](../../../backlog/in-progress/FEAT-072.md) for product context.

## Objective

Enable four additional graduated tsconfig flags following B1 (noImplicitAny). Two flag pairs:
- **B2**: `noUnusedLocals: true` + `noUnusedParameters: true` — deletes unused imports/vars, prefixes intentionally-unused callback params with `_`
- **B3**: `noImplicitOverride: true` + `noFallthroughCasesInSwitch: true` — adds `override` keyword to subclass methods, fixes switch fall-through

## In scope

- Editing `tsconfig.json` to enable all four flags
- Fixing all TS6133/TS6196/TS4114/TS7029 errors across `src/scripts/` and `src/tests/`
- Rebuilding compiled `scripts/` artifacts via `npm run build`

## Out of scope

- Enabling `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, or any other flag (B4+ are separate slices)
- Adding new features or changing runtime behavior
- Editing `tsconfig.test.json` unless the test suite fails typecheck

## Acceptance criteria

- [ ] AC-1: `tsconfig.json` has `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true` in `compilerOptions`
- [ ] AC-2: `npm run typecheck` exits 0 — evidence: command output showing no errors
- [ ] AC-3: `npm run lint` exits 0, zero warnings — evidence: command output
- [ ] AC-4: `npm run format:check` exits 0 — evidence: command output
- [ ] AC-5: `npm test` exits 0 with all tests passing — evidence: test summary line

## Done When

- all acceptance criteria PASS with evidence
- `requires_validation: false` — no validation badge needed (pure types, no runtime behavior change)
- feature FEAT-072 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: crew:reviewer (check no runtime logic changed, only type annotations and flag removals)
- Reviewer B: n/a (single reviewer sufficient for mechanical changes)
