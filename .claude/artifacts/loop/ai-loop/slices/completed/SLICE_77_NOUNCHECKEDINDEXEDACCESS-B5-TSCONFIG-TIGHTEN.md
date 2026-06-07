---
id: SLICE-77
status: completed
feature: FEAT-074
phase: 3
priority: P3
target_release: v0.27.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [refactor, "stack:node"]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
---
# SLICE-77: noUncheckedIndexedAccess — B5 tsconfig tighten

Implements FEAT-074. See [feature file](../../../backlog/in-progress/FEAT-074.md) for product context.

## Objective

Enable `noUncheckedIndexedAccess` in tsconfig.json. Deferred from SLICE-74 (DEC-027 escape-hatch). Dry-run shows 130 errors across 27 files — all mechanical fixes (null-guard, `??` coalescing, `!` assertion where invariant holds, early return). No behavior change.

## In scope

- `tsconfig.json`: add `"noUncheckedIndexedAccess": true`
- Fix all 130 type errors across 27 source files in `src/scripts/`
- Files by error count: `lib/pm-scorer.mts`(11), `lib/ceremonies.mts`(11), `codemod-add-any.mts`(11), `lib/loop-installer-scaffold.mts`(10), `lib/phase-gate.mts`(8), `lib/frontmatter.mts`(8), `lib/cost-alert-loader.mts`(8), `lib/slice-linker/slice-progress.mts`(6), `lib/slice-linker/agent-report-writer.mts`(6), `migrate-product-backlog.mts`(5), `lib/grade-parser.mts`(5), `lib/cost-regression.mts`(5), `lib/classify-parser.mts`(5), `lib/slice-plan.mts`(4), `lib/slice-linker/dispatch.mts`(3), `lib/score-inference.mts`(3), `lib/retrospective.mts`(3), `lib/lessons-feed.mts`(3), `loop.mts`(2), `lib/validation-gate.mts`(2), `lib/slice-cost-ceiling.mts`(2), `lib/memory-snapshot.mts`(2), `lib/loop-installer.mts`(2), `lib/ac-linter.mts`(2), `lib/walker-gates.mts`(1), `lib/reviewer-ladder.mts`(1), `lib/grade-trend.mts`(1)
- Compile output regenerated: `npm run build` (tsc emits `scripts/*.mjs`)

## Out of scope

- No behavior changes — pure type-safety enforcement
- No `@ts-ignore` or `// @ts-expect-error` suppressions
- `tsconfig.test.json` — only update if test files generate new errors post-flag

## Fix patterns (in priority order)

1. **Non-null assertion `!`** — where the index access follows a length/existence guard that TypeScript cannot narrow (e.g., `lines[0]!` after `if (lines.length === 0) return`)
2. **Nullish coalescing `?? fallback`** — where undefined is a valid case and a default makes semantic sense
3. **Early return / throw guard** — `const x = arr[i]; if (x === undefined) throw new Error(...)` when undefined is truly impossible by invariant
4. **`.at(i)`** — only where the `T | undefined` propagation is desirable downstream

## Acceptance criteria

- [ ] AC-1: `npm run typecheck` exits 0 with `noUncheckedIndexedAccess: true` in tsconfig.json
- [ ] AC-2: `npm run lint` exits 0, zero warnings
- [ ] AC-3: `npm test` exits 0, all tests pass
- [ ] AC-4: No `@ts-ignore`, `@ts-expect-error`, or `as any` suppressions added by this slice (verify with `grep -r "ts-ignore\|ts-expect-error" src/scripts/ | grep -v "\.d\.mts"`)
- [ ] AC-5: `npm run build` exits 0 and `git diff --stat scripts/` shows compiled output updated

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-074 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: crew:reviewer
- Reviewer B: n/a (single reviewer sufficient for mechanical type-fix)
