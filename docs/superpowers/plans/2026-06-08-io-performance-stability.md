# I/O Performance + Stability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `slice complete` wall time ~10%, cut test suite time ~5–8%, and eliminate three categories of silent/permanent loop failure through eight focused, independently-shippable changes.

**Architecture:** Each task targets a specific bottleneck: sequential I/O chains converted to `Promise.all`, a repeated JSON file read replaced with a passed-through cached value, git exec calls hardened with 30 s timeouts, trajectory writes batched from N syscalls to 1, and empty catch blocks replaced with `console.warn`. No new abstractions. No new files except `flushTrajectory` export added to an existing module.

**Tech Stack:** Node ESM `.mts` source → tsc emits `scripts/*.mjs`. Tests: `src/tests/*.test.mts` → `tests/*.test.mjs`, `node:test` + `node:assert/strict`. Run tests: `npm test`. Typecheck: `npm run typecheck`. Lint: `npm run lint`.

---

## Files changed

| File | Change |
|---|---|
| `src/scripts/lib/slice-events.mts` | E-10: add `console.warn` to catch block |
| `src/scripts/lib/slice-linker/start-slice.mts` | E-10: add `console.warn` to catch block in `recordSliceStartEvent` |
| `src/scripts/lib/slice-linker/complete-slice.mts` | E-9+E-10: warn in catch; A-1: parallel worktree/branch; A-2: parallel gate; A-3: thread cached workflowState |
| `src/scripts/lib/grade-writer.mts` | A-4: parallel prefill+inference |
| `src/scripts/lib/slice-linker/feature-lifecycle.mts` | B-5: timeout on git exec; B-6: `--diff-filter=AM` |
| `src/scripts/lib/auto-merge.mts` | B-5: timeout on git exec |
| `src/scripts/lib/trajectory-writer.mts` | C-7: add buffer + `flushTrajectory` export |
| `src/scripts/loop.mts` | C-7: call `flushTrajectory` after slice commands |
| `src/tests/auto-dispatch.test.mts` | D-8: add missing `finally` cleanup |
| `src/tests/feature-simplify.test.mts` | D-8: verify shared fixture is correct (already has `before`/`after`) |

---

## Task 1: Silent failure logging (E-9 + E-10)

**Files:**
- Modify: `src/scripts/lib/slice-events.mts:84–90`
- Modify: `src/scripts/lib/slice-linker/start-slice.mts` (find `recordSliceStartEvent`)
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts` (find `emitGateTransitionEvents`, `recordSliceCompleteEvent`, `triggerFeatureSimplify`)
- Test: `src/tests/slice-events.test.mts` (extend existing)

**Context:** Four fire-and-forget functions swallow errors silently. When a write fails (permissions, disk full, bad path), there is no trace. The fix is purely additive: replace empty `catch {}` with `console.warn(...)`. No behavior change. Fire-and-forget semantics preserved.

- [ ] **Step 1: Add console.warn test for appendSliceEvent**

In `src/tests/slice-events.test.mts`, add this test inside the existing `describe("slice-events", ...)`:

```typescript
it("appendSliceEvent warns on bad path via console.warn", async () => {
  const warns: string[] = [];
  const orig = console.warn;
  console.warn = (...args: any[]) => warns.push(args.join(" "));
  try {
    await appendSliceEvent("/nonexistent/path/that/will/fail", "SLICE-00", {
      type: "workflow_state_changed",
      sliceId: "SLICE-00",
      featureId: null,
      timestamp: new Date().toISOString(),
      from: null,
      to: "building"
    });
  } finally {
    console.warn = orig;
  }
  assert.equal(warns.length, 1);
  assert.ok(warns[0]!.includes("[slice-events]"), `expected [slice-events] prefix, got: ${warns[0]}`);
  assert.ok(warns[0]!.includes("SLICE-00"), `expected sliceId in warn, got: ${warns[0]}`);
});
```

- [ ] **Step 2: Run to verify it fails**

```
node --test tests/slice-events.test.mjs
```

Expected: `FAIL` — `appendSliceEvent` currently has empty catch, so `warns.length === 0`.

- [ ] **Step 3: Update `appendSliceEvent` catch in `src/scripts/lib/slice-events.mts`**

Replace the empty catch at line ~88:

```typescript
  } catch (err) {
    console.warn(
      `[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
```

Full function after change:

```typescript
export async function appendSliceEvent(
  repoRoot: string,
  sliceId: string,
  event: SliceEvent
): Promise<void> {
  try {
    const filePath = eventsPath(repoRoot, sliceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(event) + "\n");
  } catch (err) {
    console.warn(
      `[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
```

- [ ] **Step 4: Run slice-events tests — expect PASS**

```
node --test tests/slice-events.test.mjs
```

Expected: all pass including the new warn test.

- [ ] **Step 5: Update `recordSliceStartEvent` in `src/scripts/lib/slice-linker/start-slice.mts`**

Find the function (search for `recordSliceStartEvent`). Replace its empty catch:

```typescript
async function recordSliceStartEvent(
  repoPath: string,
  sliceId: string,
  featureId: string | null
): Promise<void> {
  try {
    const { appendSliceEvent } = await import("../slice-events.mjs");
    await appendSliceEvent(repoPath, sliceId, {
      type: "workflow_state_changed",
      sliceId,
      featureId,
      timestamp: new Date().toISOString(),
      from: null,
      to: "building"
    });
  } catch (err) {
    console.warn(
      `[slice-events] start-event failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
```

- [ ] **Step 6: Update three catch blocks in `src/scripts/lib/slice-linker/complete-slice.mts`**

**6a.** `emitGateTransitionEvents` (around line 801): replace `} catch { // best-effort }` with:

```typescript
  } catch (err) {
    console.warn(
      `[slice-events] gate-events failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
```

**6b.** `recordSliceCompleteEvent` (around line 821): replace `} catch { // best-effort }` with:

```typescript
  } catch (err) {
    console.warn(
      `[slice-events] complete-event failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
```

**6c.** `triggerFeatureSimplify` (around line 853): replace `} catch { // best-effort — never blocks slice complete }` with:

```typescript
  } catch (err) {
    console.warn(
      `[feature-simplify] failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
```

- [ ] **Step 7: Run full test suite + typecheck**

```
npm run typecheck && npm test
```

Expected: 984 pass (or same count as before), 0 fail.

- [ ] **Step 8: Commit**

```
git add src/scripts/lib/slice-events.mts src/scripts/lib/slice-linker/start-slice.mts src/scripts/lib/slice-linker/complete-slice.mts src/tests/slice-events.test.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "fix(stability): surface silent fire-and-forget failures via console.warn (E-9, E-10)"
```

---

## Task 2: Parallel worktree + branch checks (A-1)

**Files:**
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts` (`resolveWorktreeAndBranch`, lines 678–708)

**Context:** `checkWorktreeExists` and `checkBranchExists` are independent — neither result feeds the other's input. Currently sequential (each ~100 ms on Windows). `branchName` derivation moved above both checks so `Promise.all` can run them simultaneously.

- [ ] **Step 1: Locate and read `resolveWorktreeAndBranch` in `complete-slice.mts`**

Find the function (search for `resolveWorktreeAndBranch`). It looks like:

```typescript
async function resolveWorktreeAndBranch(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>
): Promise<
  | { worktreePath: string; branchName: string; featureId: string | null }
  | { skipped: true; reason: string }
> {
  const workflowState = await readCrewWorkflowState(repoPath);
  const worktreePath: string | null = workflowState?.currentRun?.worktreePath ?? null;

  if (!worktreePath || worktreePath === "") {
    return { skipped: true, reason: "no-worktree" };
  }

  const worktreeExists = await checkWorktreeExists(worktreePath);
  if (!worktreeExists) {
    return { skipped: true, reason: "worktree-missing-on-disk" };
  }

  const featureId: string | null = sliceFm?.feature ?? null;
  const branchName: string = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;

  const branchExists = await checkBranchExists(repoPath, branchName);
  if (!branchExists) {
    await clearWorktreePathInState(repoPath);
    return { skipped: true, reason: "branch-already-merged" };
  }

  return { worktreePath, branchName, featureId };
}
```

- [ ] **Step 2: Replace body with parallel version**

```typescript
async function resolveWorktreeAndBranch(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>
): Promise<
  | { worktreePath: string; branchName: string; featureId: string | null }
  | { skipped: true; reason: string }
> {
  const workflowState = await readCrewWorkflowState(repoPath);
  const worktreePath: string | null = workflowState?.currentRun?.worktreePath ?? null;

  if (!worktreePath || worktreePath === "") {
    return { skipped: true, reason: "no-worktree" };
  }

  const featureId: string | null = sliceFm?.feature ?? null;
  const branchName: string = featureId ? `slice/${sliceId}-${featureId}` : `slice/${sliceId}`;

  const [worktreeExists, branchExists] = await Promise.all([
    checkWorktreeExists(worktreePath),
    checkBranchExists(repoPath, branchName)
  ]);

  if (!worktreeExists) {
    return { skipped: true, reason: "worktree-missing-on-disk" };
  }
  if (!branchExists) {
    await clearWorktreePathInState(repoPath);
    return { skipped: true, reason: "branch-already-merged" };
  }

  return { worktreePath, branchName, featureId };
}
```

Note: guard order is preserved (worktreeExists checked before branchExists) even though both resolve simultaneously. On the `worktree-missing-on-disk` path, `checkBranchExists` runs unnecessarily — acceptable cost since that is the uncommon failure path.

- [ ] **Step 3: Run typecheck + tests**

```
npm run typecheck && npm test
```

Expected: all tests pass. No new tests needed — the change is a refactor with identical observable semantics; existing auto-merge tests cover the paths.

- [ ] **Step 4: Commit**

```
git add src/scripts/lib/slice-linker/complete-slice.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "perf(A-1): parallel worktree + branch existence checks in resolveWorktreeAndBranch"
```

---

## Task 3: Parallel gate resolution (A-2)

**Files:**
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts` (`completeSlice`, lines 487–503)

**Context:** `deriveTestAdequacyGate(repoPath, sliceId, resolved)` depends only on `resolved` (config already resolved) plus `repoPath` and `sliceId` — all available after `resolveConfig`. It does NOT depend on `sliceFile`, `sliceFm`, or any slice-context data. It can therefore run in parallel with `locateSliceFile`. The `resolveSliceContext` → `resolveValidationGate` chain remains sequential (each step depends on the previous).

- [ ] **Step 1: Locate the sequential block in `completeSlice`**

Find these lines in `completeSlice` (after `resolveSlicesRoot`):

```typescript
const sliceFile = await locateSliceFile(slicesRoot, sliceId);
if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } =
  await resolveSliceContext(repoPath, sliceFile);

const { validationGate, validationSkippedBadge } = await resolveValidationGate(
  repoPath,
  sliceId,
  sliceFm,
  skipValidationCheck
);

const testAdequacyGate = await deriveTestAdequacyGate(repoPath, sliceId, resolved);
```

- [ ] **Step 2: Replace with parallel version**

```typescript
const [sliceFile, testAdequacyGate] = await Promise.all([
  locateSliceFile(slicesRoot, sliceId),
  deriveTestAdequacyGate(repoPath, sliceId, resolved)
]);
if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } =
  await resolveSliceContext(repoPath, sliceFile);

const { validationGate, validationSkippedBadge } = await resolveValidationGate(
  repoPath,
  sliceId,
  sliceFm,
  skipValidationCheck
);
```

`testAdequacyGate` is already bound and no longer needs the final `await deriveTestAdequacyGate(...)` call. Verify that `testAdequacyGate` is used later in `computeFeatureResult` — it is, at the call site around line 512–522. No other change needed.

- [ ] **Step 3: Run typecheck + tests**

```
npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```
git add src/scripts/lib/slice-linker/complete-slice.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "perf(A-2): parallel locateSliceFile + deriveTestAdequacyGate in completeSlice"
```

---

## Task 4: Cache workflow state read (A-3)

**Files:**
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts` — `resolveSliceContext`, `runAutoMergeStage`, `resolveWorktreeAndBranch`

**Context:** `readCrewWorkflowState(repoPath)` reads `.claude/state/crew/workflow-state.json` from disk. It is called twice per `completeSlice` invocation:
1. Inside `resolveSliceContext` (which is called from `completeSlice`)
2. Inside `resolveWorktreeAndBranch` (called via `runAutoMergeStage`)

The fix: read once in `completeSlice`, pass the cached value down through the call chain as an optional parameter. Each function falls back to reading disk if the cached value is not supplied (safe for standalone use).

- [ ] **Step 1: Update `resolveSliceContext` signature to accept cached state**

Find `resolveSliceContext`. Current signature:

```typescript
async function resolveSliceContext(repoPath: string, sliceFile: string) {
  ...
  const workflowState = await readCrewWorkflowState(repoPath);
  ...
}
```

New signature and body (add optional third parameter):

```typescript
async function resolveSliceContext(
  repoPath: string,
  sliceFile: string,
  cachedWorkflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>
) {
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const phase = sliceFm.phase || null;
  const today = new Date().toISOString().slice(0, 10);
  const workflowState = cachedWorkflowState ?? (await readCrewWorkflowState(repoPath));
  const startedAt = workflowState?.currentRun?.startedAt ?? null;
  const blockingGates = deriveBlockingGates(workflowState);
  return { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates };
}
```

- [ ] **Step 2: Update `resolveWorktreeAndBranch` signature to accept cached state**

Find `resolveWorktreeAndBranch`. Add optional fourth parameter (after the Task 2 change):

```typescript
async function resolveWorktreeAndBranch(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>,
  cachedWorkflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>
): Promise<
  | { worktreePath: string; branchName: string; featureId: string | null }
  | { skipped: true; reason: string }
> {
  const workflowState = cachedWorkflowState ?? (await readCrewWorkflowState(repoPath));
  const worktreePath: string | null = workflowState?.currentRun?.worktreePath ?? null;
  // ... rest unchanged ...
}
```

- [ ] **Step 3: Update `runAutoMergeStage` to accept and thread cached state**

Find `runAutoMergeStage`. Add `workflowState` to its opts type and thread it to `resolveWorktreeAndBranch`:

```typescript
async function runAutoMergeStage(
  repoPath: string,
  sliceId: string,
  sliceFm: Record<string, any>,
  config: Record<string, any>,
  opts: {
    noMerge?: boolean;
    dryRun?: boolean;
    validationGate?: any;
    workflowState?: Awaited<ReturnType<typeof readCrewWorkflowState>>;
  }
): Promise<MergeResult | DryRunPlan | { skipped: true; reason: string } | null> {
  const { noMerge = false, dryRun = false, workflowState } = opts;

  if (noMerge) return { skipped: true, reason: "no-merge-flag" };

  const skipOrPaths = await resolveWorktreeAndBranch(repoPath, sliceId, sliceFm, workflowState);
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Update `completeSlice` to read state once and pass down**

In `completeSlice`, before the `resolveSliceContext` call, read workflow state once:

```typescript
const resolved = cfgIn ?? (await resolveConfig(repoPath));
const slicesRoot = resolveSlicesRoot(repoPath, resolved);

const [sliceFile, testAdequacyGate] = await Promise.all([
  locateSliceFile(slicesRoot, sliceId),
  deriveTestAdequacyGate(repoPath, sliceId, resolved)
]);
if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

const workflowState = await readCrewWorkflowState(repoPath);   // ← read once here

const { sliceContent, sliceFm, featureId, phase, today, startedAt, blockingGates } =
  await resolveSliceContext(repoPath, sliceFile, workflowState);   // ← pass cached

const { validationGate, validationSkippedBadge } = await resolveValidationGate(
  repoPath,
  sliceId,
  sliceFm,
  skipValidationCheck
);
```

And update the `runAutoMergeStage` call site to pass `workflowState`:

```typescript
const autoMergeResult = await runAutoMergeStage(repoPath, sliceId, sliceFm, resolved, {
  noMerge,
  dryRun,
  validationGate,
  workflowState   // ← thread cached state
});
```

- [ ] **Step 5: Run typecheck + tests**

```
npm run typecheck && npm test
```

Expected: all pass. The `readCrewWorkflowState` import at the top of `complete-slice.mts` is still needed (used in the new top-level call). No import changes needed.

- [ ] **Step 6: Commit**

```
git add src/scripts/lib/slice-linker/complete-slice.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "perf(A-3): cache readCrewWorkflowState — 2 reads → 1 per completeSlice invocation"
```

---

## Task 5: Parallel grade prefill + inference (A-4)

**Files:**
- Modify: `src/scripts/lib/grade-writer.mts` lines ~168–170

**Context:** `resolveGradePrefill` (reads slice file, feature file, spec file chain) and `inferScoresForSlice` (analyzes validation/test artifacts) are completely independent — neither's output feeds the other's input. Currently sequential. `Promise.all` runs them simultaneously.

- [ ] **Step 1: Locate the sequential calls in `createGradeFile`**

Find this block in `src/scripts/lib/grade-writer.mts` (after the `ensureDir` call):

```typescript
const prefill = await resolveGradePrefill(repoPath, sliceId, config);
const { inferScoresForSlice } = await import("./score-inference.mjs");
const inference = await inferScoresForSlice(repoPath, sliceId);
```

- [ ] **Step 2: Replace with parallel version**

```typescript
const { inferScoresForSlice } = await import("./score-inference.mjs");
const [prefill, inference] = await Promise.all([
  resolveGradePrefill(repoPath, sliceId, config),
  inferScoresForSlice(repoPath, sliceId)
]);
```

The dynamic import of `inferScoresForSlice` happens before `Promise.all`. Node.js module cache means this does not reload the module on subsequent calls.

- [ ] **Step 3: Run typecheck + tests**

```
npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```
git add src/scripts/lib/grade-writer.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "perf(A-4): parallel resolveGradePrefill + inferScoresForSlice in createGradeFile"
```

---

## Task 6: Git exec timeouts + diff-filter (B-5 + B-6)

**Files:**
- Modify: `src/scripts/lib/slice-linker/feature-lifecycle.mts` (both B-5 and B-6)
- Modify: `src/scripts/lib/auto-merge.mts` (B-5 only)
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts` (`checkBranchExists`, B-5 only)

**Context:** B-5: git commands have no timeout, so a locked repo or broken credential helper hangs the loop indefinitely. Fix: `{ timeout: 30_000 }` on every `execFileAsync("git", ...)` call. B-6: `git log --name-only` without `--diff-filter=AM` includes deleted/renamed files in output, wasting parse work on large features.

- [ ] **Step 1: Write a failing test for B-6 (diff-filter excludes deleted files)**

In `src/tests/feature-simplify.test.mts`, add this import at the top if not already present:

```typescript
import os from "node:os";
```

Inside the `describe("featureSimplify", ...)` block, add after the existing third test. This test creates an **isolated repo with explicit git commit dates** to make `--since` filtering deterministic — no wall-clock timing dependency:

```typescript
it("collectChangedSourceFiles excludes deleted .mts files (B-6 diff-filter=AM)", async () => {
  const testRepo = await fs.mkdtemp(path.join(os.tmpdir(), "b6-del-"));
  try {
    execFileSync("git", ["init"], { cwd: testRepo });
    execFileSync("git", ["config", "user.email", "t@e"], { cwd: testRepo });
    execFileSync("git", ["config", "user.name", "T"], { cwd: testRepo });

    // Add file at 2020-01-01 (before the feature window)
    await fs.writeFile(path.join(testRepo, "to-delete.mts"), "export const x = 2;\n");
    execFileSync("git", ["add", "to-delete.mts"], { cwd: testRepo });
    execFileSync("git", ["commit", "--date=2020-01-01T00:00:00Z", "-m", "add"], {
      cwd: testRepo,
      env: { ...process.env, GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z" }
    });

    // startedAt marks the feature window start — between the two commits
    const startedAt = "2021-01-01T00:00:00.000Z";

    // Delete file at 2022-01-01 (inside the feature window)
    execFileSync("git", ["rm", "to-delete.mts"], { cwd: testRepo });
    execFileSync("git", ["commit", "--date=2022-01-01T00:00:00Z", "-m", "delete"], {
      cwd: testRepo,
      env: { ...process.env, GIT_AUTHOR_DATE: "2022-01-01T00:00:00Z" }
    });

    const mockDispatch = async (_opts: any) => ({ ok: true, skipped: false, durationMs: 0 });
    const result = await featureSimplify(testRepo, "FEAT-B6", {
      skipSimplify: false,
      sliceId: "SLICE-B6",
      startedAt,
      dispatchFn: mockDispatch
    });
    // Only the delete commit (type D) is in scope after startedAt.
    // With --diff-filter=AM: type D is excluded → no .mts files → skip.
    assert.equal(result.simplifyRan, false);
    assert.equal(result.skipped, true);
    assert.equal(result.skipReason, "no-source-files");
  } finally {
    await fs.rm(testRepo, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run to verify it fails (before B-6 fix)**

```
node --test tests/feature-simplify.test.mjs
```

Expected: the new test FAIL — without `--diff-filter=AM`, the delete commit's `to-delete.mts` entry appears → `files` is non-empty → `simplifyRan: true` → assertion on `simplifyRan === false` fails.

- [ ] **Step 3: Apply B-6 fix in `feature-lifecycle.mts`**

Find `collectChangedSourceFiles`. Current:

```typescript
const args = ["log", "--name-only", "--format="];
if (startedAt) args.push(`--since=${startedAt}`);
```

New:

```typescript
const args = ["log", "--name-only", "--format=", "--diff-filter=AM"];
if (startedAt) args.push(`--since=${startedAt}`);
```

- [ ] **Step 4: Run feature-simplify tests — expect PASS**

```
node --test tests/feature-simplify.test.mjs
```

Expected: all pass including the new B-6 test.

- [ ] **Step 5: Apply B-5 timeout in `feature-lifecycle.mts`**

Find the `execFileAsync("git", args, ...)` call in `collectChangedSourceFiles`:

```typescript
const { stdout } = await execFileAsync("git", args, { cwd: repoPath });
```

Replace with:

```typescript
const { stdout } = await execFileAsync("git", args, { cwd: repoPath, timeout: 30_000 });
```

- [ ] **Step 6: Apply B-5 timeout in `auto-merge.mts`**

Find the `git` helper function in `auto-merge.mts` (around line 214):

```typescript
async function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFile("git", ["-C", repoPath, ...args]);
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}
```

Replace with:

```typescript
async function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFile("git", ["-C", repoPath, ...args], {
    timeout: 30_000
  });
  return { stdout: stdout ?? "", stderr: stderr ?? "" };
}
```

- [ ] **Step 7: Apply B-5 timeout in `complete-slice.mts` (`checkBranchExists`)**

Find `checkBranchExists` in `complete-slice.mts`. Current body:

```typescript
async function checkBranchExists(repoPath: string, branchName: string): Promise<boolean> {
  try {
    const { execFile: execFileCb } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFile = promisify(execFileCb);
    await execFile("git", ["-C", repoPath, "rev-parse", "--verify", branchName]);
    return true;
  } catch {
    return false;
  }
}
```

Replace the execFile call:

```typescript
async function checkBranchExists(repoPath: string, branchName: string): Promise<boolean> {
  try {
    const { execFile: execFileCb } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFile = promisify(execFileCb);
    await execFile("git", ["-C", repoPath, "rev-parse", "--verify", branchName], {
      timeout: 30_000
    });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 8: Run typecheck + full tests**

```
npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 9: Commit**

```
git add src/scripts/lib/slice-linker/feature-lifecycle.mts src/scripts/lib/auto-merge.mts src/scripts/lib/slice-linker/complete-slice.mts src/tests/feature-simplify.test.mts
npx tsc -p tsconfig.json
git add scripts/
git commit -m "perf(B-5,B-6): 30s timeout on all git exec calls; exclude deleted files from simplify scan"
```

---

## Task 7: Trajectory write batching (C-7)

**Files:**
- Modify: `src/scripts/lib/trajectory-writer.mts` — add buffer + `flushTrajectory` export
- Modify: `src/scripts/loop.mts` — call `flushTrajectory` after slice commands that write trajectory steps

**Context:** `recordStep` currently calls `fs.appendFile` once per step. A `slice complete` invocation writes 10–15 steps = 10–15 syscalls. Buffering accumulates lines in memory during a process run; `flushTrajectory` writes all of them in a single `fs.appendFile` call. `readTrajectory` is not called within the same invocation flow (only by tests/external readers), so buffering is safe.

- [ ] **Step 1: Write a failing test for `flushTrajectory`**

In `src/tests/trajectory-writer.test.mts` (if it doesn't exist, add inline tests to slice-events or create a new file — check if `tests/trajectory-writer.test.mjs` exists first):

```
ls tests/trajectory-writer.test.mjs 2>/dev/null || echo "missing"
```

If missing, create `src/tests/trajectory-writer.test.mts`:

```typescript
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { recordStep, flushTrajectory, trajectoryPath } from "../scripts/lib/trajectory-writer.mjs";

describe("trajectory-writer batching", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "traj-batch-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("recordStep buffers lines — no file written before flush", async () => {
    await recordStep(tmpDir, "SLICE-T1", "test_step", { value: 1 });
    // File should NOT exist yet (buffered)
    await assert.rejects(
      () => fs.access(trajectoryPath(tmpDir, "SLICE-T1")),
      "file should not exist before flush"
    );
  });

  it("flushTrajectory writes all buffered lines in one file", async () => {
    await recordStep(tmpDir, "SLICE-T2", "step_a", { x: 1 });
    await recordStep(tmpDir, "SLICE-T2", "step_b", { x: 2 });
    await recordStep(tmpDir, "SLICE-T2", "step_c", { x: 3 });
    await flushTrajectory(tmpDir, "SLICE-T2");
    const raw = await fs.readFile(trajectoryPath(tmpDir, "SLICE-T2"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    assert.equal(lines.length, 3);
    const parsed = lines.map((l) => JSON.parse(l));
    assert.equal(parsed[0]!.type, "step_a");
    assert.equal(parsed[2]!.type, "step_c");
  });

  it("flushTrajectory clears buffer — double flush writes nothing extra", async () => {
    await recordStep(tmpDir, "SLICE-T3", "one_step", {});
    await flushTrajectory(tmpDir, "SLICE-T3");
    await flushTrajectory(tmpDir, "SLICE-T3"); // second flush — should not duplicate
    const raw = await fs.readFile(trajectoryPath(tmpDir, "SLICE-T3"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    assert.equal(lines.length, 1);
  });
});
```

- [ ] **Step 2: Run to verify test fails**

```
node --test tests/trajectory-writer.test.mjs
```

Expected: FAIL — `flushTrajectory` is not yet exported; `recordStep` currently writes immediately (file exists before flush).

- [ ] **Step 3: Rewrite `trajectory-writer.mts` with buffer**

Full new content of `src/scripts/lib/trajectory-writer.mts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export const TRAJECTORY_DIR = ".claude/artifacts/loop/trajectories";

/** Absolute path to the trajectory file for a slice. */
export function trajectoryPath(repoPath: string, sliceId: string): string {
  return path.join(repoPath, TRAJECTORY_DIR, `${sliceId}-trajectory.jsonl`);
}

// Process-scoped buffer: key = `${repoPath}:${sliceId}`, value = JSONL lines
const _buffer = new Map<string, string[]>();

/**
 * Buffer one step record for the slice trajectory JSONL.
 * Lines are written to disk only when flushTrajectory is called.
 * Never throws — returns false on error.
 */
export async function recordStep(
  repoPath: string,
  sliceId: string,
  type: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const key = `${repoPath}:${sliceId}`;
    const line = JSON.stringify({ type, sliceId, timestamp: new Date().toISOString(), ...data });
    const buf = _buffer.get(key) ?? [];
    buf.push(line);
    _buffer.set(key, buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * Flush buffered step records for a slice to disk in a single appendFile call.
 * Clears the buffer for this slice after writing.
 * No-op (returns true) if buffer is empty.
 * Never throws — returns false on I/O error.
 */
export async function flushTrajectory(repoPath: string, sliceId: string): Promise<boolean> {
  const key = `${repoPath}:${sliceId}`;
  const lines = _buffer.get(key);
  if (!lines || lines.length === 0) return true;
  try {
    const filePath = trajectoryPath(repoPath, sliceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, lines.join("\n") + "\n");
    _buffer.delete(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read all step records from a slice trajectory file.
 * Returns [] if file does not exist.
 */
export async function readTrajectory(
  repoPath: string,
  sliceId: string
): Promise<Record<string, unknown>[]> {
  try {
    const filePath = trajectoryPath(repoPath, sliceId);
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run trajectory tests — expect PASS**

```
node --test tests/trajectory-writer.test.mjs
```

Expected: all 3 new tests pass.

- [ ] **Step 5: Wire `flushTrajectory` in `loop.mts` for slice commands**

In `src/scripts/loop.mts`, find the `complete` command handler (around line 883). After the `await completeSlice(...)` call returns and before the `logEvent` call, add:

```typescript
const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
await flushTrajectory(cwd, sliceId);
```

Also find the `start` command handler (search for `startSlice` call). After it returns, add the same flush (using the sliceId from the result or the flag):

```typescript
const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
await flushTrajectory(cwd, sliceId);
```

- [ ] **Step 6: Run typecheck + full tests**

```
npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```
git add src/scripts/lib/trajectory-writer.mts src/scripts/loop.mts src/tests/trajectory-writer.test.mts
npx tsc -p tsconfig.json
git add scripts/ tests/
git commit -m "perf(C-7): batch trajectory writes — N appendFile calls → 1 per invocation"
```

---

## Task 8: Test cleanup audit (D-8)

**Files:**
- Modify: `src/tests/auto-dispatch.test.mts` — audit `tmpRepo()` callers for missing `finally` cleanup
- Verify: `src/tests/feature-simplify.test.mts` — already has `before`/`after` with cleanup

**Context:** `tmpRepo()` helper in `auto-dispatch.test.mts` creates temp dirs but many callers don't clean them up in `finally` blocks. Disk accumulation degrades repeated test runs. The fix is mechanical: wrap each `const repo = await tmpRepo(...)` call that lacks cleanup in a `try/finally`.

- [ ] **Step 1: Audit `auto-dispatch.test.mts` for tmpRepo callers without cleanup**

Read `src/tests/auto-dispatch.test.mts` and identify every `test(...)` block that calls `tmpRepo(...)` without a `finally { await fs.rm(repo, ...) }`. Mark each one.

Pattern to find — unsafe:
```typescript
test("...", async () => {
  const repo = await tmpRepo("prefix-");
  // ... no try/finally
  assert.something(repo);
});
```

Pattern that is safe (already has cleanup):
```typescript
test("...", async () => {
  const tmpEventsDir = await fs.mkdtemp(...);
  try {
    // ...
  } finally {
    await fs.rm(tmpEventsDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Wrap unsafe callers in try/finally**

For each unsafe test, wrap the body:

```typescript
test("some test name", async () => {
  const repo = await tmpRepo("prefix-");
  try {
    // ... existing test body ...
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
```

Apply this pattern to every test in `auto-dispatch.test.mts` that creates a temp dir without cleanup.

- [ ] **Step 3: Verify `feature-simplify.test.mts` cleanup is correct**

Read `src/tests/feature-simplify.test.mts`. Confirm:
- One `before()` that calls `fs.mkdtemp` and `git init`
- One `after()` that calls `fs.rm(tmpDir, { recursive: true, force: true })`

The third test (`dispatches code-simplifier agent and writes ceremony`) mutates `tmpDir` by adding `test.mts`. This is fine — all tests share the same dir and cleanup happens in `after()`. No changes needed if this pattern is correct.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```
npm test
```

Expected: same pass count as before, 0 fail.

- [ ] **Step 5: Commit**

```
git add src/tests/auto-dispatch.test.mts src/tests/feature-simplify.test.mts
npx tsc -p tsconfig.json
git add tests/
git commit -m "fix(D-8): add finally cleanup for tmpRepo callers in auto-dispatch tests"
```

---

## Final verification

- [ ] **Run all CI gates**

```
npm run typecheck && npm run lint && npm run format:check && node ./scripts/validate-manifests.mjs && node ./scripts/validate-content-length.mjs && npm test
```

Expected: all pass, 0 lint warnings, format clean, manifests valid.

- [ ] **Verify compiled scripts are in sync**

```
npx tsc -p tsconfig.json && git diff --exit-code scripts/
```

Expected: exit 0 (no uncommitted compiled output).
