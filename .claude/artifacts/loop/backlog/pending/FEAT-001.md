---
id: FEAT-001
status: pending
priority: P2
category: tech-debt
target_release: null
created: 2026-05-27
updated: 2026-05-27
depends_on: []
slices: []
derived_from: null
---
## Description

Preventive cleanup of code smells identified in the 2026-05-27 performance audit. No critical issues — codebase is structurally healthy (315 tests, 4s suite, no circular deps, no swallowed errors). This is hygiene to keep technical debt from accumulating.

## Work items

1. **Split slice-linker.mjs (576 lines → ~400 target)** — extract remaining helpers into slice-linker/ submodules. Already has crew-bridge.mjs and slice-progress.mjs extracted; continue the pattern.

2. **Consolidate duplicate pathExists() (4 modules)** — backlog-writer.mjs, claims-sync.mjs, legacy-migrator.mjs, score-inference.mjs still define local pathExists() despite paths.mjs exporting it. Replace with imports.

3. **Consolidate duplicate ensureDir() (5 modules)** — backlog-writer.mjs, decisions-store.mjs, grade-writer.mjs, slice-linker.mjs, crew-bridge.mjs. Export from paths.mjs, import everywhere.

4. **Refactor buildTokens() complexity (22 vs 15 limit)** — extract helper functions from loop-installer.mjs:53 to reduce cyclomatic complexity below ESLint threshold.

5. **Audit dynamic imports (19 total)** — grade-writer.mjs has 4 dynamic imports in hot path. Profile and convert to top-level where no circular dependency risk exists.

6. **Split loop-installer.mjs (452 lines)** — lower priority. Extract scaffold-writing functions into installer/ submodule.

## Acceptance hints

- All line counts under 400
- Zero duplicate pathExists/ensureDir definitions
- buildTokens lint warning resolved
- Dynamic imports reduced where safe
- 315+ tests still pass, no regressions
- npm run lint shows 0 warnings

## Notes

Audit source: session 2026-05-27, full codebase performance/stability review.
Findings: no critical issues, all items are preventive.