---
id: GRADE-SLICE-75
slice: SLICE-75
feature: FEAT-071
spec: SPEC-004
phase: 3
target_release: v0.26.0
graded_at: 2026-06-07
duration_hours: 0.5
scores: null
decisions: [DEC-028, DEC-029]
---
# SLICE-75: Phase C bench harness + perf wins 1-5 — Grade

**Phase:** 3 · **Feature:** FEAT-071 · **Slice:** SLICE-75

## Scores

- architecture_quality: 0.82
- reliability: 0.80
- observability: 0.78
- production_readiness: 0.80
- security: 0.90
- test_confidence: 0.85
- product_completeness: 0.70

## Lessons

- Cache key must be compound `(path, mtime)` — path-only key produces stale reads on file update; mtime is the correct O(1) invalidation signal
- `clearFrontmatterCache()` belongs at dispatch entry (before handler), not after — post-invocation clear provides no benefit for the current call
- Builder created dead-code module on first pass (cache module built but never imported in production) — wiring must be verified in self-verify with a grep for production import sites; unit tests passing is insufficient proof of integration
- Bench flakiness on Windows at N=10 runs; N=20 with warmup=5 produces stable p50 — always baseline with sufficient runs on target platform
- `spawnSync` status must be checked before recording timing — a broken command produces a valid-looking near-zero time
- Wins 2 (single snapshot) and 3 (lazy load) were already implemented — pre-existing patterns are invisible to the builder prompt; a research pass before writing AC would have caught this
- product_completeness is 0.70 because C3 wins 6-10 not yet shipped (SLICE-76 pending)

## Decisions

### DEC-028: Frontmatter cache keyed by (filePath, mtime) — not content hash

**Rationale**: `mtime` is O(1) to obtain via `statSync`, deterministic per file change, and sufficient for cache invalidation in a single-invocation CLI tool. Content hashing is O(N) per file and unnecessary when mtime changes on every write.

**Consequences**:
- Cache is safe in single-invocation mode (standard CLI usage)
- In long-running processes (auto-mode), cache must be cleared at each snapshot boundary via `clearFrontmatterCache()` at dispatch entry in `loop.mts`
- Stale-read risk accepted for very-fast concurrent writes — tool not designed for concurrent mutation

### DEC-029: Bench harness uses spawnSync wall-clock timing, not process CPU time

**Rationale**: CLI users care about wall-clock latency (time from invocation to output). `process.cpuUsage()` misses I/O wait which dominates the critical paths. `performance.now()` around `spawnSync` captures full user-perceived latency.

**Consequences**:
- Bench numbers vary with system load — mitigated by p50 over 20 runs with warmup
- Bench is macro-bench only (not suitable for function-level micro-bench)
- Gate is percentage-regression vs recorded baseline, not absolute ms — CI-safe

## Surprises

- Wins 2 (single backlog snapshot) and 3 (lazy subcommand load) were already implemented — the FEAT description implied they were missing work
- Win 4 (batched git reads) had zero applicable call sites — all git reads in `.mts` sources were already one-shot or non-sequential
- Bench baseline on Windows: brief p50=84.4ms — higher than expected for small Node scripts; startup cost dominates (suggests Win 3/lazy load was the dominant pre-existing win)
- Reviewer caught dead-code cleanly on first pass (line-level citation of missing import)

## Followups

- C3 wins 6-10: hoisted regex, decisions/grade memo, structuredClone, Map for hot keys, telemetry batch flush — SLICE-76 against FEAT-071 (`--keep-feature-open` used)
- Cost regression: SLICE-75 cost $48.92 (5061% above last-3 median) — main driver is Opus main-session context; investigate routing builder through Sonnet
- Add `npm run bench:quick` (RUNS=5, WARMUP=2) for developer iteration without editing source
- Parameterize RUNS/WARMUP via env vars so CI can use a fast config
- Consider adding a grep-for-import-sites check to builder self-verify template for cache/utility module integrations

## What went well

Reviewer found the dead-code issue precisely (line-level citation). Fix was a clean import + call-site wiring, no API change. Validator confirmed all 9 ACs with concrete evidence. Bench infrastructure is solid: regression gate enforces exit code 1, baseline JSON has expected keys, spawnSync status guard in place.

## What went wrong

Builder delivered Win 1 as dead code on first pass — production `backlog-parser.mts` was not updated to call the cache. Required full review-fix-re-review loop adding one extra builder dispatch. Root cause: builder verified unit tests passed but did not grep for production import sites.

## What I would do differently next time

Add explicit self-verify step in builder prompt: "after creating any new utility module, grep all production source files for the import and confirm it is present." This catches dead-code before review. For cost: use Sonnet for builder dispatches; reserve Opus for architect/reviewer judgment.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_75_TOP-10-PERF-WINS-BENCH-HARNESS-MEMO-SNAPSHOT-LAZY-BATCHED-GI.md`
- feature file: `.claude/artifacts/loop/backlog/in-progress/FEAT-071.md`
- review artifact: `.claude/artifacts/crew/reviews/20260607T134153Z-review-result-slice-75-fix1-re-check-cache-wired-clearcache-placement-benc.md`
- validation artifact: `.claude/artifacts/crew/validations/20260607T134427Z-validation-result-slice-75-bench-harness-perf-wins-1-5.md`
- baseline: `.claude/artifacts/loop/perf/baseline.json`
