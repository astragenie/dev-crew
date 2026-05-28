---
id: SLICE-05
status: pending
feature: FEAT-021
phase: null
priority: P2
target_release: null
created: 2026-05-28
updated: 2026-05-28
---
# SLICE-05: TypeScript port — phase 1: mechanical rename

Implements FEAT-021. See [feature file](../../../backlog/in-progress/FEAT-021.md) for product context.
Spec: [docs/superpowers/specs/2026-05-28-typescript-port-design.md](../../../../../docs/superpowers/specs/2026-05-28-typescript-port-design.md)

## Objective

Migrate all `.mjs` source files to `.mts` TypeScript with strict mode. Zero logic changes.
Establish build pipeline: `tsc` compiles `src/` → `scripts/` (committed output). Add CI drift guard.

## In scope

- Create `src/` directory structure mirroring current `scripts/` and `tests/`
- Rename `scripts/lib/*.mjs` (43 files) → `src/scripts/lib/*.mts`
- Rename `scripts/lib/slice-linker/*.mjs` (3 files) → `src/scripts/lib/slice-linker/*.mts`
- Rename `scripts/*.mjs` (4 entry files) → `src/scripts/*.mts`
- Rename `tests/*.test.mjs` (47 files) → `src/tests/*.test.mts`
- Replace `tsconfig.json` with NodeNext strict config (rootDir: src, outDir: .)
- Add `tsconfig.test.json` for test compilation (outDir: dist/tests)
- Update `package.json` scripts: build, build:tests, typecheck, test
- Update `.github/workflows/test.yml`: add build step, drift guard, bump Node to 22
- Update `eslint.config.mjs` to include `.mts` files
- Add explicit type annotations to all exported function signatures
- ZERO logic changes — only rename, type annotations, import extension adjustments

## Out of scope

- Logic changes or refactoring (Phase 2)
- Changing module structure or splitting files (Phase 2)
- Adding new tests (Phase 3)
- Migrating `.claude-plugin/` or markdown files

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter is clean (`npm run lint`)
- [ ] AC-2: `npm run typecheck` exits 0 with zero errors under `strict: true`
- [ ] AC-3: `npm run build` produces `scripts/lib/*.mjs` compiled output; `git diff --exit-code scripts/` passes (no uncommitted drift)
- [ ] AC-4: All 43 `scripts/lib/*.mjs` files have a corresponding `src/scripts/lib/*.mts` source; original `.mjs` files removed from `scripts/lib/` (replaced by compiled output only)
- [ ] AC-5: CI workflow runs `npm run build` + drift guard before tests; Node version is 22

## Files

- Create: `src/scripts/lib/*.mts` (43 files — rename from scripts/lib/*.mjs)
- Create: `src/scripts/lib/slice-linker/*.mts` (3 files)
- Create: `src/scripts/*.mts` (4 entry files)
- Create: `src/tests/*.test.mts` (47 files)
- Modify: `tsconfig.json`
- Create: `tsconfig.test.json`
- Modify: `package.json`
- Modify: `.github/workflows/test.yml`
- Modify: `eslint.config.mjs`

## Done When

- all acceptance criteria PASS with evidence
- `npm test` passes (≥401 tests)
- `npm run typecheck` clean
- feature FEAT-021 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: tsconfig correctness + build pipeline wiring
- Reviewer B: parity check — compiled output matches original logic
