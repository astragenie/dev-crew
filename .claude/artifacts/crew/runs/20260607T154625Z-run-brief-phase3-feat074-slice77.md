---
phase: "3"
feature: FEAT-074
---
# Run Brief: PHASE3 FEAT074 SLICE77

- Created: 2026-06-07T15:46:25.068Z
- Goal: Enable `noUncheckedIndexedAccess` in tsconfig.json. Deferred from SLICE-74 (DEC-027 escape-hatch). Dry-run shows 130 errors across 27 files — all mechanical fixes (null-guard, `??` coalescing, `!` assertion where invariant holds, early return). No behavior change.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `tsconfig.json`: add `"noUncheckedIndexedAccess": true`
- Fix all 130 type errors across 27 source files in `src/scripts/`
- Files by error count: `lib/pm-scorer.mts`(11)
  - `lib/ceremonies.mts`(11)
  - `codemod-add-any.mts`(11)
  - `lib/loop-installer-scaffold.mts`(10)
  - `lib/phase-gate.mts`(8)
  - `lib/frontmatter.mts`(8)
  - `lib/cost-alert-loader.mts`(8)
  - `lib/slice-linker/slice-progress.mts`(6)
  - `lib/slice-linker/agent-report-writer.mts`(6)
  - `migrate-product-backlog.mts`(5)
  - `lib/grade-parser.mts`(5)
  - `lib/cost-regression.mts`(5)
  - `lib/classify-parser.mts`(5)
  - `lib/slice-plan.mts`(4)
  - `lib/slice-linker/dispatch.mts`(3)
  - `lib/score-inference.mts`(3)
  - `lib/retrospective.mts`(3)
  - `lib/lessons-feed.mts`(3)
  - `loop.mts`(2)
  - `lib/validation-gate.mts`(2)
  - `lib/slice-cost-ceiling.mts`(2)
  - `lib/memory-snaps
- Out Of Scope:
  - - No behavior changes — pure type-safety enforcement
- No `@ts-ignore` or `// @ts-expect-error` suppressions
- `tsconfig.test.json` — only update if test files generate new errors post-flag
- Planned Files: -
- Next Step: Begin implementation

