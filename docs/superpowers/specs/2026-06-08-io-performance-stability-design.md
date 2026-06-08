# I/O Performance + Stability Hardening — Design Spec

**Date:** 2026-06-08
**Status:** approved
**Goal:** Reduce `slice complete` wall time ~10%, cut test suite time ~5–8%, and eliminate the three main categories of silent/permanent loop failure.

---

## Problem

Static analysis of the current codebase reveals three clusters of improvable behaviour:

1. **Sequential I/O where parallelism is safe** — `complete-slice`, `grade-writer`, and `start-slice` await independent file/git operations in series, adding 200–400 ms per invocation on Windows.
2. **Repeated reads of the same data** — `readCrewWorkflowState()` is called 4+ times per `completeSlice` invocation with no in-scope cache.
3. **Silent failure paths** — fire-and-forget errors (featureSimplify, emitGateTransitionEvents, event writes) are completely swallowed, making root-cause diagnosis require log archaeology; missing `execFile` timeouts allow git calls to hang the loop indefinitely.

---

## Scope

Ten independent improvements. Each is a self-contained change that can be reviewed and shipped separately. Grouped below by theme.

---

## Theme A — Parallel I/O (items 1–4)

### A-1. Parallelize worktree + branch checks in `complete-slice`

**File:** `src/scripts/lib/slice-linker/complete-slice.mts` lines ~653–701

`checkWorktreeExists()` and `checkBranchExists()` are two independent `execFile("git", ...)` calls run in sequence during the auto-merge resolution path. Each is ~100 ms on Windows.

**Fix:** Replace sequential awaits with `Promise.all`:

```typescript
const [worktreeExists, branchExists] = await Promise.all([
  checkWorktreeExists(repoPath, sliceId),
  checkBranchExists(repoPath, sliceId)
]);
```

**Metric:** `slice complete` wall time  
**Est. gain:** −100 ms (~3%)

---

### A-2. Parallelize gate resolution in `complete-slice`

**File:** `src/scripts/lib/slice-linker/complete-slice.mts` lines ~487–503

`resolveConfig(repoPath)` and `deriveTestAdequacyGate(repoPath, sliceId)` are independent. Currently awaited sequentially before the slice state machine runs.

**Fix:**

```typescript
const [config, testAdequacyGate] = await Promise.all([
  resolveConfig(repoPath),
  deriveTestAdequacyGate(repoPath, sliceId)
]);
```

Callers of both results must be updated to use the destructured values instead of re-awaiting.

**Metric:** `slice complete` wall time  
**Est. gain:** −150 ms (~5%)

---

### A-3. Cache `readCrewWorkflowState` within `completeSlice` scope

**File:** `src/scripts/lib/slice-linker/complete-slice.mts` (multiple call sites)

`readCrewWorkflowState()` reads `.claude/state/crew/workflow-state.json` and is called 4+ times per `completeSlice` invocation. State does not change between these reads (all writes happen after reads).

**Fix:** Read once at the top of `completeSlice`, pass the cached value (or a getter) to inner functions that currently call it themselves. Inner functions gain an optional `cachedState` parameter; they fall back to reading disk only if not supplied.

**Metric:** `slice complete` wall time  
**Est. gain:** −60 ms (~2%)

---

### A-4. Parallelize prefill reads in `grade-writer`

**File:** `src/scripts/lib/grade-writer.mts` lines ~97–104

`findSliceFile()` and `readFeaturePrefill()` (which calls `findFeatureById()`) are independent reads. Currently sequential.

**Fix:**

```typescript
const [sliceFile, featurePrefill] = await Promise.all([
  findSliceFile(repoPath, sliceId),
  readFeaturePrefill(repoPath, featureId)
]);
```

**Metric:** grade-write latency  
**Est. gain:** −80 ms (~15% of grade-write path)

---

## Theme B — Resilience + Timeouts (items 5–6)

### B-5. Add `execFile` timeout to all git calls

**Files:** `src/scripts/lib/slice-linker/feature-lifecycle.mts` (`collectChangedSourceFiles`), `auto-merge.mts`, `complete-slice.mts` anywhere `execFileAsync("git", ...)` is called without a timeout option

Git commands can hang indefinitely on locked repos, network-mounted filesystems, or misconfigured credential helpers. There is currently no timeout.

**Fix:** Pass `{ timeout: 30_000 }` to every `execFile` / `execFileAsync` git call:

```typescript
await execFileAsync("git", [...args], { timeout: 30_000 });
```

On timeout the call throws; callers already have catch blocks that log and continue.

**Metric:** Loop hang rate  
**Est. gain:** −100% indefinite hangs (bounded to ≤30 s per git call)

---

### B-6. Add `--diff-filter=AM` to `collectChangedSourceFiles`

**File:** `src/scripts/lib/slice-linker/feature-lifecycle.mts`

The git log used to collect changed source files for `feature simplify` uses `--name-only` without `--diff-filter`. This includes deleted and renamed files in the output, which then fail the `.mts`/`.mjs` filter but still require parsing. On large features (10+ slices, hundreds of renames), this adds unnecessary parse work.

**Fix:**

```typescript
const args = [
  "log", "--name-only", "--format=", "--diff-filter=AM",
  ...(startedAt ? [`--since=${startedAt}`] : []),
  "HEAD"
];
```

`AM` = Added or Modified only. Deleted files are excluded.

**Metric:** `feature simplify` file-list scan time  
**Est. gain:** −20–30% parse time on features with renames/deletions

---

## Theme C — Write Efficiency (item 7)

### C-7. Batch trajectory writes within a single invocation

**File:** `src/scripts/lib/trajectory-writer.mts`

`appendStep()` calls `fs.appendFile()` once per step. A typical `slice complete` invocation appends 10–15 trajectory steps = 10–15 individual file-write syscalls. Batching them into a single `appendFile` at invocation end reduces I/O syscalls by ~90% for that file.

**Fix:** Add an in-memory buffer (array of lines) to the trajectory writer. Expose a `flushTrajectory(repoPath, sliceId)` function that writes all buffered lines in one `appendFile` call. Entry-point callers (`loop.mts` subcommand handlers) call `flushTrajectory` before returning.

The existing `recordStep` signature is unchanged. The buffer is process-scoped (singleton Map keyed by `${repoRoot}:${sliceId}`).

**Metric:** fs write syscalls per `slice complete` invocation  
**Est. gain:** −90% trajectory write syscalls (~60 ms saved on slow Windows I/O)

---

## Theme D — Test Suite Health (item 8)

### D-8. Shared git fixture + tmpdir cleanup in tests

**Files:** `src/tests/auto-dispatch.test.mts`, `src/tests/feature-simplify.test.mts`

Two problems:
1. Tests that create temp dirs via `fs.mkdtemp` do not always clean up on failure — only tests with `finally { fs.rm(...) }` are safe. Disk accumulation slows repeated test runs.
2. `feature-simplify.test.mts` calls `git init` once per test that needs a real repo. Shared fixture across tests in the same file saves ~200 ms per git init.

**Fix:**
- Audit all `mkdtemp` call sites in test files; ensure every one has a `finally { await fs.rm(tmpDir, { recursive: true, force: true }) }`.
- In `feature-simplify.test.mts`, create one `before()` git repo fixture shared across the tests that only need read access to git history; only tests that mutate the repo get their own.

**Metric:** `npm test` total wall time  
**Est. gain:** −3–5 s (~5–8% of ~50 s suite)

---

## Theme E — Silent Failure Surfacing (items 9–10)

### E-9. Surface `featureSimplify` failures via ceremony error field

**File:** `src/scripts/lib/slice-linker/complete-slice.mts` (`triggerFeatureSimplify`)

Currently `triggerFeatureSimplify` is fire-and-forget. Errors are caught and swallowed. If `featureSimplify` throws (git error, dispatch failure, ceremony write failure), the loop continues with no record that simplify was attempted and failed.

**Fix:** Change the inner catch to log a warning instead of silently swallowing:

```typescript
async function triggerFeatureSimplify(...): Promise<void> {
  try {
    const { featureSimplify } = await import("./feature-lifecycle.mjs");
    await featureSimplify(repoPath, featureId, { ... });
  } catch (err) {
    console.warn(`[feature-simplify] failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
```

Deliberately does NOT write a ceremony on failure — `isSimplifyBlocked` only blocks when a ceremony exists with `simplifyRan: false`. No ceremony = gate does not block, existing behavior preserved. The `console.warn` makes the failure visible in loop output without altering the blocking model.

**Metric:** Invisible simplify-failure rate  
**Est. gain:** 100% of failures now surfaced in console output

---

### E-10. Structured error log for fire-and-forget write paths

**Files:** `src/scripts/lib/slice-linker/complete-slice.mts` (`emitGateTransitionEvents`, `recordSliceCompleteEvent`), `src/scripts/lib/slice-linker/start-slice.mts` (`recordSliceStartEvent`), `src/scripts/lib/slice-events.mts` (`appendSliceEvent`)

All fire-and-forget event write paths currently have empty catch blocks. When they fail (permissions, disk full, bad path), there is no record.

**Fix:** Replace empty catch blocks with a one-line `console.warn` that includes `repoRoot`, `sliceId`, and the error message:

```typescript
} catch (err) {
  console.warn(`[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`);
}
```

`appendSliceEvent` itself should also warn internally (not throw) so callers don't need to.

This is a logging-only change. No behavior change. Fire-and-forget semantics preserved.

**Metric:** Mean time to diagnose event-write failures  
**Est. gain:** ~80% reduction in diagnosis time (from "grep logs for hours" to "grep for [slice-events]")

---

## Summary

| # | Theme | File(s) | Metric | Est. gain |
|---|---|---|---|---|
| 1 | Parallel I/O | `complete-slice.mts:653–701` | `slice complete` wall time | −100 ms (−3%) |
| 2 | Parallel I/O | `complete-slice.mts:487–503` | `slice complete` wall time | −150 ms (−5%) |
| 3 | Read cache | `complete-slice.mts` (4 call sites) | `slice complete` wall time | −60 ms (−2%) |
| 4 | Parallel I/O | `grade-writer.mts:97–104` | grade-write latency | −80 ms (−15%) |
| 5 | Timeout | all `execFileAsync("git", ...)` | loop hang rate | −100% hangs |
| 6 | Git filter | `feature-lifecycle.mts` | simplify scan time | −20–30% |
| 7 | Write batch | `trajectory-writer.mts` | trajectory write syscalls | −90% syscalls |
| 8 | Test health | `*.test.mts` (2 files) | `npm test` wall time | −5–8% |
| 9 | Failure surface | `complete-slice.mts` | invisible failure rate | −100% |
| 10 | Error log | `slice-events.mts` + callers | diagnosis time | −80% |

**Compound slice-complete gain (items 1+2+3):** ~−310 ms (~10% of typical 3–4 s run)  
**Compound test gain (item 8):** ~−3–5 s (~5–8% of 50 s suite)  
**Stability gain (items 5, 9, 10):** eliminates three permanent-hang / silent-loss failure modes

---

## Out of scope

- Model routing / cost optimization (separate FEAT-028 / earlier plugin-performance spec)
- Frontmatter cache cross-invocation persistence (requires IPC or file-based cache with invalidation)
- Parallelizing `completeSlice` itself across slices (requires lock-free state model)
