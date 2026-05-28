---
id: FEAT-021
status: done
priority: P2
category: tech-debt
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: []
slices: [SLICE-05]
derived_from: null
autonomous_safe: true
triage_notes: no fields needed inference
started_at: 2026-05-28
completed_at: 2026-05-28
---
# FEAT-021: TypeScript port — phase 1: mechanical rename

## Description

Migrate all 47 `scripts/lib/*.mjs` source files and `tests/*.test.mjs` to TypeScript
(`.mts` extension) with strict mode enabled. Zero logic changes — rename, add explicit
type annotations to public function signatures, update import extensions, wire `tsc`
build pipeline. Compiled `.mjs` output committed to repo so plugin consumers need no
build step. CI drift guard (`git diff --exit-code scripts/`) prevents compiled output
drifting from source. Primary goal: catch parameter contract violations and return-shape
mismatches at compile time rather than at runtime.

## Acceptance hints

- All 47 `scripts/lib/*.mjs` renamed to `src/scripts/lib/*.mts`
- All `tests/*.test.mjs` renamed to `src/tests/*.test.mts`
- `tsconfig.json` uses `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`
- `npm run build` compiles `src/` → `scripts/` (committed output, `.mjs` preserved)
- `npm run typecheck` runs `tsc --noEmit` with zero errors
- `npm test` passes (401+ tests) against compiled output
- `npm run lint` clean
- CI drift guard step added to GitHub Actions
- Zero logic changes — git diff of compiled output vs original `.mjs` is whitespace/comment only
