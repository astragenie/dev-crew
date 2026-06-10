# PM Review — FEAT-169 (re-scored vs specs)

- **Path:** pm (re-score after loop:spec-writer produced SLICE-A + SLICE-B)
- **Composite priority:** P2 (composite_score 0.4975, prior 0.4325)
- **autonomous_safe:** true (flipped from false)
- **Demand evidence:** none

## Scores (delta vs prior)

| Dimension | Prior | Now |
|-----------|-------|-----|
| customer_impact | 0.20 | 0.25 |
| effort_estimate | 0.65 | 0.50 |
| strategic_alignment | 0.70 | 0.70 |
| technical_risk | 0.55 | 0.40 |
| dependency_depth | 0.25 | 0.20 |

## Why autonomous_safe flipped false → true

All three prior blockers resolved by the specs:
1. **AC clarity** — outline hints → 20+ Given-When-Then cases with literal test values + verification commands (both slices).
2. **Weak observability (0.66)** — now explicit logging AC: SLICE-A AC-003/009/010 (ID-validation/gate/call-site logs); SLICE-B AC-006/009/014 (cache hit/miss, snapshot timing, cache-hit-rate metric).
3. **Split ambiguity** — clean two-spec split (SLICE-A type safety, SLICE-B perf), each independently shippable.

Effort 0.65→0.50 (cost-calibrated vs SLICE-71 $1.41 / SLICE-86 $15.31). Risk 0.55→0.40
(Result + branded IDs compile-time/trivially-revertable; memoization/lazy-load/parallel-fs known patterns, no contract change).

## Specs

- `.claude/artifacts/loop/specs/FEAT-169-SLICE-A.spec.md` — Result<T,E> + branded IDs + parser/gate retrofit.
- `.claude/artifacts/loop/specs/FEAT-169-SLICE-B.spec.md` — snapshot + memoization perf wins.

## Risks

1. SLICE-A: Result wrapping misses a parse boundary in the ~80 call sites → `grep '\.ok'` verification in AC-010.
2. SLICE-B: memo cache not cleared on writes during `auto` loop → stale snapshot; `clearCache()` export + hit/miss logs surface it (100% hit-rate = suspicious).
3. SLICE-B: telemetry batch flush on `process.exit` loses events on SIGKILL — best-effort, acceptable.
4. Test-count drift (SLICE-86 lesson) → concrete verification commands with expected output checkpoint the baseline.

## Sequencing

SLICE-B depends on SLICE-A (parsers must return Result). Intra-FEAT ordering, not a cross-FEAT blocker.
