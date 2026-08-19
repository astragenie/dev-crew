---
decision: approved
reviewer: crew:reviewer
slice: SLICE-29
reviewed_commits: [419c6719]
---

# Review — SLICE-29 (FEAT-018): guarded-fire fail-soft coverage restoration

## Summary

Commit `419c6719` adds `crew/tests/guarded-fire.test.mts` (7 tests) covering
`crew/scripts/lib/guarded-fire.mts`, whose original unit test was lost in the
SLICE-22 GEPA test-tree deletion even though the module itself survived as
fix-forward infra for issue #360. This is a test-only slice — no production
code is touched. All 7 tests pass solo (3x, no flake/hang) and the full crew
suite (1878 tests) completes clean at 0 fail. **Decision: approved.**

## 1. Commit purity

`git show 419c6719 --stat` lists exactly two files:

- `.../slices/pending/SLICE_29_IMPLEMENT-FEAT-018.md` (slice record)
- `crew/tests/guarded-fire.test.mts` (135 lines, new)

No production source under `crew/scripts/` is touched. Confirmed test-only.

## 2. Solo run x3 — no hang, no flake

```
cd crew && bun test tests/guarded-fire.test.mts
```
Run 1: 7 pass, 0 fail, 9 expect() calls, 115ms
Run 2: 7 pass, 0 fail, 9 expect() calls, 123ms
Run 3: 7 pass, 0 fail, 9 expect() calls, 105ms

All three runs sub-150ms wall time, consistent pass count, no timeout, no
process hang. The keepalive-timer fix for the earlier hanging draft (see §4)
is working as intended.

## 3. Full suite — completes clean

```
cd crew && bun test tests/ --timeout 60000
```
Result: **1761 pass, 117 skip, 0 fail**, 4241 expect() calls, 1878 tests
across 179 files, **72.64s**. Matches the expected profile (~1878 tests, 0
fail, ~70s) — no hang introduced into the shared suite.

## 4. Test-to-contract mapping

Module contract (`guarded-fire.mts` header + JSDoc): `fireGuarded(run,
timeoutMs = 1500)` races `run()` against an `.unref()`'d timeout timer,
never throws, never blocks past `timeoutMs`, drops the result silently on
either timeout or error.

| Test | Contract clause | Meaningful? |
|---|---|---|
| `DEFAULT_GUARD_TIMEOUT_MS is the documented 1500ms ceiling` | exported constant | Yes — catches a silent constant drift (e.g. someone re-tuning the ceiling without updating the header doc) |
| `lets a normal run() complete and does not swallow success` | success passthrough | Yes — would fail if `fireGuarded` no-op'd or forgot to invoke `run()` |
| `falls back to DEFAULT_GUARD_TIMEOUT_MS when timeoutMs is omitted` | default param accepted | Yes — proves the default param wiring, not just that it type-checks |
| `swallows an async rejection instead of propagating` | error swallow | Yes — would fail if the `try/catch` were removed or `run()`'s rejection re-thrown |
| `swallows a synchronous throw from run() instead of propagating` | defense-in-depth vs. `() => Promise<void>` contract violation | Yes — a real runtime hole the type signature doesn't protect against; a naive `Promise.race([run(), ...])` without wrapping the *call* to `run()` itself in the try would miss this |
| `resolves at timeoutMs (not hanging) when run() never settles` | timeout race, `.unref()`'d timer, bounded wait | Yes — if the timeout branch were removed or broken, this test would hang until Bun's default per-test timeout fires a real failure, not a false pass |
| `treats a run() that exceeds timeoutMs the same as an error (swallowed, not thrown)` | slow-run swallowed via timeout race | Yes — distinct from the rejection test; proves the *timeout* path also swallows, not just the *reject* path |

All 7 assertions are meaningful — none is a tautology, and each would catch
a specific regression class (rethrow, never-resolve, wrong default, stale
constant).

## 5. Keepalive pattern (unref'd-timer test hazard)

The two timeout-path tests (`resolves at timeoutMs`, `treats a run() that
exceeds timeoutMs...`) each open a `setTimeout(..., 10_000)` keepalive
*before* the `try`, and `clearTimeout(keepalive)` in a `finally`. This is
correctly scoped:

- Created early enough to hold the event loop open before the unref'd race
  timer is the only other pending handle.
- Cleared unconditionally via `finally`, so it never leaks past the test
  (would otherwise pad every subsequent test by up to 10s of dangling timer
  bookkeeping, or worse, mask a real hang by keeping the process alive
  artificially).
- Commented in both places with the specific mechanism (why an unref'd-only
  event loop can idle forever instead of firing) rather than a vague "needed
  for the test to work" — matches the context flagged by the lead about the
  earlier draft's whole-suite hang.

This is the correct fix for the described failure mode, and the solo x3 +
full-suite runs above are direct evidence it now works.

## 6. Timing-assertion flakiness risk — assessed, not a blocker

The `resolves at timeoutMs` test asserts `elapsed >= timeoutMs && elapsed <
timeoutMs + 200` for `timeoutMs = 30`. Checked whether 200ms headroom is
adequate for a serial CI run under load:

- Repo precedent: `memory-write-handoff-credit.test.mts` uses `elapsed <
  300` (absolute margin, no lower bound), `telemetry-otel-bridge.test.mts`
  uses `elapsed <= 500` and `elapsed < 1500` for its bounded-wait cases. A
  200ms absolute margin is consistent with — not an outlier against —
  existing timing-assertion convention in this suite.
- Empirical: this test passed inside the full 1878-test serial run (§3)
  alongside every other suite file, not just in isolation, and passed 3/3
  in the solo runs. No observed jitter pushing it toward either bound.
- The margin is also 6.7x the `timeoutMs` value itself (200ms slack on a
  30ms target), which is generous relative to typical Node/Bun timer
  scheduling jitter (single-digit to low-double-digit ms even under
  moderate load).

**Assessment: accepted risk, not a defect.** Consistent with repo
convention and empirically stable across 4 total runs (3 solo + 1 in the
full suite). If this ever flakes on CI specifically, the fix is a headroom
bump (e.g. to 300-400ms) or switching to a relative multiplier — not a
reason to hold this slice.

## Decision rationale

`approved`. Commit is test-only and pure (verified by `--stat`), all 7
tests are meaningful against the module's documented contract, the
keepalive-timer pattern correctly resolves the earlier hanging-draft failure
mode, and both the isolated file (3x) and the full 1878-test suite complete
green with zero flake observed. The one timing-assertion headroom question
was evaluated against repo precedent and empirical evidence and does not
warrant a fix.
