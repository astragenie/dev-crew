---
id: GRADE-SLICE-76
slice: SLICE-76
feature: FEAT-071
spec: SPEC-004
phase: 3
target_release: v0.26.0
graded_at: 2026-06-07
duration_hours: 0.75
scores: null
decisions: [DEC-030]
---
# SLICE-76: Phase C perf wins 6-10 — Grade

**Phase:** 3 · **Feature:** FEAT-071 · **Slice:** SLICE-76

## Scores

- architecture_quality: 0.84
- reliability: 0.82
- observability: 0.78
- production_readiness: 0.82
- security: 0.88
- test_confidence: 0.80
- product_completeness: 1.00

## Lessons

- Scope drift is invisible to the builder when prior-slice changes are still uncommitted — builder modified `backlog-parser.mts` thinking it was in-scope, but those changes were SLICE-75 territory; always check git diff before starting a new slice to understand what's already changed
- Generic type parameters (`readFrontmatterCached<T>`) are the correct fix for cache modules that serve multiple caller types — type erasure via `Record<string, unknown>` forces callers into double casts
- `statSync` inside an async function called from `Promise.all` is the high-cost blocker for event-loop throughput; `readFileSync` on a cache-miss for small files is qualitatively different and acceptable in CLI context
- Reviewer correctly distinguished between the two sync calls and accepted `readFileSync` while blocking `statSync` — this nuanced split is the right call
- Review cycle took 2 iterations (one rejection) — the SLICE-75 cache wiring being uncommitted at SLICE-76 start caused the scope confusion; commit each slice before starting the next
- Sonnet subagents for builder/reviewer/validator reduced cost vs SLICE-75 (Opus): $17.62 vs $48.92

## Decisions

### DEC-030: readFrontmatterCached<T> — generic T over Record<string, unknown>

**Rationale**: The cache must serve callers with different return types (e.g., `parseFrontmatter` returns `{ frontmatter, body }` not `Record<string, unknown>`). Making the function generic lets TypeScript infer the correct return type at each call site, eliminating double casts and preventing silent runtime type errors. The single `as T` inside the cache is a necessary, single-step narrowing — not a bypass.

**Consequences**:
- Zero casts at call sites — type safety at the boundary
- `CacheEntry.data: unknown` stores the value type-erased internally (Map cannot carry generic params)
- Future callers automatically get correct types for free via inference

## Surprises

- Wins 7 (decisions/grade memo) and 9 (Map over object) had no applicable call sites — more pre-existing optimization than expected
- First review rejection was due to uncommitted SLICE-75 changes appearing as SLICE-76 scope drift — a process issue, not a code issue
- SPEC-004 auto-rolled to `satisfied` on SLICE-76 close — all 3 derived features (FEAT-069, FEAT-070, FEAT-071) reached done

## Followups

- Commit all uncommitted changes from SLICE-75 + SLICE-76 together (they're interleaved in working tree) — requires a carefully-scoped `git add` or worktree strategy
- B5 (`noUncheckedIndexedAccess`) — still deferred as FEAT-074; escape hatch triggered in SLICE-74
- FEAT-020 and FEAT-054 remain in triaged (P3) — both below Phase C priority, assess for v0.27.0
- Investigate bench baseline drift: triage p50 jumped from 52.2ms to 62.1ms on re-record — may indicate host load variance on the dev machine; consider recording baseline on a clean machine

## What went well

Sonnet subagent cost reduction worked: $17.62 vs $48.92 for SLICE-75. Reviewer correctly split the two sync calls — accepted the justified `readFileSync`, blocked `statSync`. Validator confirmed all 7 ACs with concrete evidence. SPEC-004 closed cleanly.

## What went wrong

First review rejected due to scope drift: SLICE-76 builder touched `backlog-parser.mts` + `frontmatter-cache.mts` not in its scope (SLICE-75 changes were still uncommitted, making them look like in-scope changes). Added one extra review-fix-re-review cycle.

## What I would do differently next time

Commit each slice before starting the next — or check `git diff --stat HEAD` at the start of each slice to understand the baseline. Had SLICE-75 been committed, the reviewer would have seen a clean SLICE-76 diff restricted to wins 6-10 only.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_76_TOP-10-PERF-WINS-BENCH-HARNESS-MEMO-SNAPSHOT-LAZY-BATCHED-GI.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-071.md`
- review artifact: `.claude/artifacts/crew/reviews/20260607T143215Z-review-result-slice-76-fix1-re-check-generic-cache-async-stat-blockers.md`
- validation artifact: `.claude/artifacts/crew/validations/20260607T143514Z-validation-result-slice-76-perf-wins-6-10-validation.md`
