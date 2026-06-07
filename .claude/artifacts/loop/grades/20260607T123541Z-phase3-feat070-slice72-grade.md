---
id: GRADE-SLICE-72
slice: SLICE-72
feature: FEAT-070
spec: SPEC-004
phase: 3
target_release: v0.26.0
graded_at: 2026-06-07
duration_hours: 2.5
scores: null
decisions: [DEC-025, DEC-026]
---
# SLICE-72: noImplicitAny + useUnknownInCatchVariables — B1 tsconfig tighten — Grade

**Phase:** 3 · **Feature:** FEAT-070 · **Slice:** SLICE-72

## Scores

- architecture_quality: 0.88
- reliability: 0.90
- observability: 0.72
- production_readiness: 0.87
- security: 0.90
- test_confidence: 0.88
- product_completeness: 0.75

(Update both the frontmatter `scores:` map and this list. The frontmatter
is what plugin commands read; the list is for human review.)

## Lessons

- `noImplicitAny` errors in test files are almost entirely untyped helper function params (`prefix`, `repo`, `rel`, `content`) — a single pass with a typed signature template fixes them in bulk
- TS7018 (object literal property implicitly has `any` type) hits null-initialized properties in test `brief` objects; `Record<string, any>` annotation at the variable declaration level silences all of them cleanly
- ESLint `complexity` warning was pre-existing and unrelated to the flag changes; extracted `resolveSliceMetaFields` from `startSlice` to drop complexity from 16 → 13
- `buildBrief` in `brief.mts` exceeded the 120-line per-function cap; extracted `computeGradeSignal` helper to fix it; the function was already close to the limit from prior organic growth
- LSP (IDE) shows TS2591 "Cannot find name 'node:test'" noise that `tsc` does not reproduce — distinguish compiler errors from IDE noise before acting
- Running `npm run format` after edits is mandatory; 29+ files have pending Prettier changes at any given time across a multi-file tsconfig sweep

## Decisions

### DEC-025: Use `Record<string, any>` not `Record<string, unknown>` for opaque property bags

**Rationale**: Test helper objects and frontmatter bags are heterogeneous by design; `unknown` would require casts at every access point. `Record<string, any>` is the approved pattern per local code conventions and was already used throughout src/scripts.

**Consequences**:
- Type safety for leaf property reads is deferred to runtime rather than compile time
- Consistent with existing codebase patterns; no special-casing needed at call sites

### DEC-026: Extract helper for `startSlice` complexity rather than use eslint-disable

**Rationale**: `buildStartSliceReturn` already has an `eslint-disable-next-line complexity` comment; adding a second suppress in the same file would signal debt acceptance rather than resolution. Extracting `resolveSliceMetaFields` is a genuinely useful semantic grouping.

**Consequences**:
- `startSlice` complexity drops from 16 → 13, well under the cap
- Helper is small (one object literal return) but clearly named and documented

## Surprises

- Pre-existing lint warnings (`brief.mts` line-length, `start-slice.mts` complexity) were not caused by SLICE-72 changes but AC-3 ("zero lint warnings") required fixing them anyway — discovered via `git stash` verification
- ESLint `@typescript-eslint/no-unsafe-function-type` flagged `Record<string, Function>` in `loop.mts` (two sites) as a separate error category not caught by the tsconfig flags; fixed by using `(...args: any[]) => any`
- Context compaction mid-slice: the fix of 77 type errors across 30+ files exceeded one context window; required a summary handoff

## Followups

- FEAT-070 B2: enable `noUnusedLocals: true` + `noUnusedParameters: true`; expect unused import cleanup across the codebase
- FEAT-070 B3+: continue graduated tsconfig flags (strict nulls, etc.)
- Consider adding a lint pre-check step to the CI gate that fails on new warnings introduced by a PR (to prevent pre-existing warning accumulation)

## What went well

Systematic per-file approach worked: read each test file, identify the untyped params, annotate, move on. Parallelizing independent file edits saved time. The `replace_all: true` trick on `const brief = {` to annotate all 9 occurrences in one edit was clean.

## What went wrong

Pre-existing lint warnings required unexpected remediation work (brief.mts function length, start-slice.mts complexity). These were not in scope but AC-3 required fixing them before the slice could close, adding ~30 minutes of unplanned work. Context ran out mid-slice requiring compaction.

## What I would do differently next time

Run `npm run lint` at the start of the slice (before making any changes) to baseline pre-existing warnings, document them explicitly in the slice plan, and include "fix pre-existing lint warnings" as an explicit acceptance criterion so it is not a surprise.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_72_TSCONFIG-TIGHTEN-STANDARDS-ALIGNMENT-GRADUATED-FLAG-ROLLOUT-.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-070.md`
- review artifact: none (doc+types only — validation skipped with reason)
- validation artifact: none (skipped — no runtime behavior change)
