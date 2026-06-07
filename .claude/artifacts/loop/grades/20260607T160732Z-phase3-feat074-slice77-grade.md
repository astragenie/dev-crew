---
id: GRADE-SLICE-77
slice: SLICE-77
feature: FEAT-074
spec: null
phase: 3
target_release: v0.27.0
graded_at: 2026-06-07
duration_hours: 0.35
scores: null
decisions: []
---
# SLICE-77: noUncheckedIndexedAccess B5 tsconfig tighten — Grade

**Phase:** 3 · **Feature:** FEAT-074 · **Slice:** SLICE-77

## Scores

- architecture_quality: 0.88
- reliability: 0.90
- observability: 0.75
- production_readiness: 0.88
- security: 0.92
- test_confidence: 0.85
- product_completeness: 1.00

## Lessons

- Subagent builder repeatedly timed out mid-task on wide mechanical edits (130 errors, 27 files) — for large-scope single-pattern refactors, inline editing in main session is faster and cheaper than subagent dispatches that lose context mid-work
- `noUncheckedIndexedAccess` errors follow ~5 mechanical patterns: regex match groups, bounded loop access, required token fields, score Record lookups, array access after length guard — documenting all patterns upfront in the slice file is the right approach
- `?? 0` is the correct fix for `Record<string, number>` score lookups — not `!`, because the semantic default for a missing score is 0 (worst case), not a runtime crash
- `!` is correct for required token fields (`tokens.backlogPath` etc.) over `?? ""` — empty string would silently produce wrong file paths; the config-loader invariant justifies the assertion
- Cost was $3.56 — well below the $17.62 baseline median — because main-session inline edits reuse cached context; subagent cold-starts would have cost more

## Decisions

No new architectural decisions. All fixes were mechanical application of existing TypeScript type safety conventions.

## Surprises

- All 3 subagent builder dispatches failed to complete mid-task — switched to inline editing which resolved immediately with no extra time cost
- Error count was 130, not the ~80 estimated from SLICE-74 dry-run — SLICE-75/76 additions had accrued extra errors
- No test failures despite touching 27 files — 922-test suite provided adequate regression coverage
- Reviewer approved on first pass with no blocking issues

## Followups

- Add note to `docs/code-conventions.md`: `noUncheckedIndexedAccess` is now enabled — future code must handle `T | undefined` from array/object index access
- Observability score still below 0.80 trend — consider SPEC (type=sre) for structured logging
- FEAT-020 and FEAT-054 remain P3 triaged with external dependencies; not actionable in this repo alone

## What went well

Fast wall clock (21 min), low cost ($3.56). All 5 ACs passed, reviewer approved first pass. Pattern-based approach (enumerate fix types upfront) made each site decision fast. 922-test suite caught zero regressions.

## What went wrong

3 subagent builder dispatches all cut off mid-task without completing. Wasted ~8 minutes before switching to inline approach.

## What I would do differently next time

For wide mechanical refactors (>20 files, single repeated pattern), skip subagent dispatch — edit inline. Pre-enumerate all fix sites in the slice file. Reserve subagents for bounded creative or judgment-heavy tasks.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_77_NOUNCHECKEDINDEXEDACCESS-B5-TSCONFIG-TIGHTEN.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-074.md`
- handoff: `.claude/artifacts/crew/handoffs/20260607T160000Z-handoff-slice-77-no-unchecked-indexed-access.md`
- review artifact: `.claude/artifacts/crew/reviews/20260607T160628Z-review-result-slice-77-nouncheckedindexedaccess-b5-tsconfig-tighten.md`
