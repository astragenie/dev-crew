# Bun Test Reliability & Speed Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `bun test src/tests/ --parallel` reliable (no hangs) and fast (target < 120s wall time) on Windows.

**Architecture:** Two-pronged fix. (1) Root-cause fix: all `exec`/`execFile` calls inside test helpers currently have no timeout — on Windows under Bun workers git lock contention causes infinite waits; add `{ timeout: 10000 }` everywhere. (2) Parallel load-balancing: split the 5 densest test files so Bun's workers get more granular work units instead of one 48-test monolith blocking a worker. No mocking — all tests stay integration-level.

**Tech Stack:** Bun 1.3.x test runner, `node:child_process` exec/execFile with timeout option, bun:test `afterAll` for cleanup guards.

**Repo context the executor must know:**
- Working directory: the repo root of the loop plugin (worktree at `C:\work\mega\loop\.claude\worktrees\witty-prancing-llama`)
- Bun binary: `C:\Users\milas\.bun\bin\bun.exe` (not in PATH — use full path or `$bun = "C:\Users\milas\.bun\bin\bun.exe"`)
- Test files: `src/tests/*.test.mts`; all use `import { test } from "bun:test"` and `import assert from "node:assert/strict"`
- `bunfig.toml` at repo root sets `[test] timeout = 60000`
- `package.json` `test` script: `bun test src/tests/ --parallel` (already updated)
- The `exec = promisify(execCb)` pattern appears in auto-merge, checkpoint-commit, phase-gate, loop-installer, and worktree-manager tests — none have per-call timeouts
- NEVER add mocks for git operations — the whole value of these tests is that they hit real git
- Shared test helpers live in `src/tests/dispatch-test-helpers.mts` — if a helper is shared, edit it there, not per-file

---

## Task 1: Binary-search the hanging file

**Goal:** Identify which specific test file(s) cause the run to never complete.  
**Files:** none modified — diagnosis only

- [ ] **Step 1: Kill any in-progress bun test processes**

```powershell
Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 2: Run first half of the suite with a 90s wall timeout**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
$files = Get-ChildItem src/tests/*.test.mts | Select-Object -First 57
$fileArgs = $files.FullName -join " "
$job = Start-Job { param($b,$f) & $b test $f.Split(" ") --parallel --timeout 60000 2>&1 } -ArgumentList $bun,$fileArgs
Wait-Job $job -Timeout 90
if ($job.State -eq 'Running') { Stop-Job $job; Write-Host "HANG: first half"; Receive-Job $job | Select-Object -Last 10 }
else { Write-Host "CLEAN: first half"; Receive-Job $job | Select-Object -Last 5 }
Remove-Job $job
```

- [ ] **Step 3: Run second half with same 90s timeout**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
$files = Get-ChildItem src/tests/*.test.mts | Select-Object -Skip 57
$fileArgs = $files.FullName -join " "
$job = Start-Job { param($b,$f) & $b test $f.Split(" ") --parallel --timeout 60000 2>&1 } -ArgumentList $bun,$fileArgs
Wait-Job $job -Timeout 90
if ($job.State -eq 'Running') { Stop-Job $job; Write-Host "HANG: second half"; Receive-Job $job | Select-Object -Last 10 }
else { Write-Host "CLEAN: second half"; Receive-Job $job | Select-Object -Last 5 }
Remove-Job $job
```

- [ ] **Step 4: Repeat binary search on the hanging half until a single file is isolated**

Narrow by halving again: e.g., if second half hangs, take `-Skip 57 -First 29` vs `-Skip 86`.
Continue until the single culprit file is named.

- [ ] **Step 5: Record the finding**

Append to `docs/superpowers/plans/bun-migration-baseline.txt`:
```
HANG DIAGNOSIS 2026-06-10: culprit file = <name>.test.mts
Root cause observed: <what git command / which test>
```

No commit yet — Task 2 fixes and commits together.

---

## Task 2: Add exec timeouts + afterAll cleanup guards in all git-heavy test files

**Goal:** No `exec` / `execFile` call in any test file waits longer than 10 s.  
**Files to modify** (all in `src/tests/`):
- `auto-merge.test.mts` — `exec = promisify(execCb)`, no timeout on any call
- `checkpoint-commit.test.mts` — `execFile = promisify(execFileCb)`, 13 calls
- `phase-gate.test.mts` — `execFile`, 7 calls
- `loop-installer.test.mts` — `execFile`, 6 calls
- `worktree-manager.test.mts` — check for exec usage
- The culprit file identified in Task 1 (may already be in the list above)

**The fix pattern — apply identically to every affected file:**

- [ ] **Step 1: In each file, find the `exec` / `execFile` helper definition**

It looks like one of these:
```ts
const exec = promisify(execCb);
// or
const execFile = promisify(execFileCb);
```

- [ ] **Step 2: Wrap it with a timeout-enforcing helper**

Replace the bare promisified call with a helper that injects `{ timeout: 10000 }` as a default:

```ts
// Before
const exec = promisify(execCb);

// After — identical call signature, adds 10 s hard timeout on every git invocation
function exec(cmd: string, opts?: object): Promise<{ stdout: string; stderr: string }> {
  return promisify(execCb)(cmd, { timeout: 10000, ...opts });
}
```

For `execFile`-style (takes `file, args[], opts`):
```ts
// Before
const execFile = promisify(execFileCb);

// After
function execFile(file: string, args: string[], opts?: object) {
  return promisify(execFileCb)(file, args, { timeout: 10000, ...opts });
}
```

Apply this in every file that has the pattern. Do NOT change call sites — only the helper definition.

- [ ] **Step 3: Add `afterAll` cleanup guards to any test that creates git worktrees inline**

In `auto-merge.test.mts`, several tests create worktree directories but clean up inside the test body. If an assertion throws before cleanup, the cleanup is skipped. Add an `afterAll` that force-removes the known temp-dir prefixes:

```ts
import { afterAll } from "bun:test";
import { execSync } from "node:child_process";

afterAll(() => {
  // Force-kill any lingering git lock files from this file's tests
  try { execSync("git worktree prune", { cwd: process.cwd(), timeout: 5000 }); } catch {}
});
```

(This is a belt-and-suspenders guard — existing per-test cleanup is still there.)

- [ ] **Step 4: Run the culprit file in isolation and confirm it completes**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
& $bun test src/tests/<culprit-file>.test.mts --timeout 60000 2>&1 | Select-Object -Last 5
$sw.Stop(); Write-Host "Wall: $([math]::Round($sw.Elapsed.TotalSeconds,1))s"
```
Expected: completes in < 60 s.

- [ ] **Step 5: Run the full suite with `--parallel` and confirm < 300s (smoke gate)**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
& $bun test src/tests/ --parallel --timeout 60000 2>&1 | Select-Object -Last 5
$sw.Stop(); Write-Host "Wall: $([math]::Round($sw.Elapsed.TotalSeconds,1))s"
```
Expected: `0 fail`, completes (does not hang). If it still hangs, repeat Task 1 binary search on remaining files.

- [ ] **Step 6: Commit**

```bash
git add src/tests/auto-merge.test.mts src/tests/checkpoint-commit.test.mts src/tests/phase-gate.test.mts src/tests/loop-installer.test.mts src/tests/worktree-manager.test.mts
git commit -m "fix(tests): add 10s exec timeout to all git child-process calls — kills bun parallel hang"
```

---

## Task 3: Split `github-sync.test.mts` (48 tests → 3 files)

**Why:** 48 tests is the densest file; it blocks one bun worker while other workers sit idle on fast files.  
**Split:**
- `src/tests/github-sync-utils.test.mts` — `detectRepo` (5), `extractSection` (2), `diffBody` (2), `patchBody` (2), `truncateTitle` (3) = **14 tests** (pure functions, no network, no gh CLI)
- `src/tests/github-sync-issues.test.mts` — `upsertMilestone` (3), `createFeatureIssue` (2), `updateIssueStatus` (1), `closeIssue` (1), `createSliceIssue` (5), `closeSliceIssue` (1), `attachSubIssue` (1), `buildSliceComment` (2), `postComment` (1) = **17 tests**
- `src/tests/github-sync-publish.test.mts` — `publishAll` (6), `bootstrapFromGithub` (4), `publishFeat` (4), `publishSlice` (3), `syncPull`/`postSliceComment` no-ops (2) = **19 tests** (async, stub `gh` CLI)

**Files:**
- Delete: `src/tests/github-sync.test.mts`
- Create: `src/tests/github-sync-utils.test.mts`
- Create: `src/tests/github-sync-issues.test.mts`
- Create: `src/tests/github-sync-publish.test.mts`

- [ ] **Step 1: Read the full file**

```powershell
Get-Content src/tests/github-sync.test.mts | Select-Object -First 80
```
Note the shared imports block and any shared helper functions (e.g., `stubGh`, `tmpRepo`).

- [ ] **Step 2: Create `github-sync-utils.test.mts`**

Copy the imports that the utils tests need (only `detectRepo`, `extractSection`, `diffBody`, `patchBody`, `truncateTitle` imports from `../scripts/lib/github-sync.mjs` etc.). Copy the 14 tests verbatim. No helpers needed — these tests are self-contained.

Template structure:
```ts
// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import { detectRepo, extractSection, diffBody, patchBody } from "../scripts/lib/github-sync.mjs";
import { truncateTitle } from "../scripts/lib/github-sync/issue-sync.mjs";

// paste the 14 tests verbatim from github-sync.test.mts
```

- [ ] **Step 3: Create `github-sync-issues.test.mts`**

Copy shared helpers (`stubGh`, any repo-fixture helper). Copy the 17 issue-CRUD tests. Structure:
```ts
// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { ... } from "../scripts/lib/github-sync.mjs";

// shared stub helper — copy from original
function stubGh(...) { ... }

// paste 17 tests verbatim
```

- [ ] **Step 4: Create `github-sync-publish.test.mts`**

Copy shared helpers. Copy the 19 publish/bootstrap tests.

- [ ] **Step 5: Verify all three new files pass in isolation**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/github-sync-utils.test.mts src/tests/github-sync-issues.test.mts src/tests/github-sync-publish.test.mts --timeout 60000 2>&1 | Select-Object -Last 5
```
Expected: same pass count as the original file (48).

- [ ] **Step 6: Delete the original and commit**

```bash
git rm src/tests/github-sync.test.mts
git add src/tests/github-sync-utils.test.mts src/tests/github-sync-issues.test.mts src/tests/github-sync-publish.test.mts
git commit -m "refactor(tests): split github-sync.test.mts → 3 focused files (48 tests → balanced workers)"
```

---

## Task 4: Split `auto-merge.test.mts` (27 tests → 2 files)

**Why:** Pure-function tests (renderCommitMessage, isValidationGateSatisfied) run in ms but are trapped in the same file as 17 git-spawning integration tests.  
**Split:**
- `src/tests/auto-merge-pure.test.mts` — `renderCommitMessage` (5) + `isValidationGateSatisfied` (5) = **10 tests** — no git, no tmp dirs
- `src/tests/auto-merge-integration.test.mts` — all `runAutoMerge` tests + `loop slice complete` mutual-exclusion test = **17 tests** — git-spawning

**Files:**
- Delete: `src/tests/auto-merge.test.mts`
- Create: `src/tests/auto-merge-pure.test.mts`
- Create: `src/tests/auto-merge-integration.test.mts`

- [ ] **Step 1: Read the imports and the renderCommitMessage + isValidationGateSatisfied test block**

```powershell
Get-Content src/tests/auto-merge.test.mts | Select-Object -First 120
```

- [ ] **Step 2: Create `auto-merge-pure.test.mts`**

Minimal imports (only `renderCommitMessage`, `MergeError`, `isValidationGateSatisfied`). No exec, no fs, no os imports needed:

```ts
// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import { renderCommitMessage, MergeError, isValidationGateSatisfied } from "../scripts/lib/auto-merge.mjs";

// paste the 10 tests verbatim
```

- [ ] **Step 3: Create `auto-merge-integration.test.mts`**

Full import block from the original. Include the `exec` wrapper WITH the timeout fix from Task 2 (since this file is git-heavy):

```ts
// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { afterAll } from "bun:test";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { runAutoMerge, MergeError } from "../scripts/lib/auto-merge.mjs";
import { flushAuditLog } from "../scripts/lib/auto-dispatch.mjs";

function exec(cmd: string, opts?: object) {
  return promisify(execCb)(cmd, { timeout: 10000, ...opts });
}

afterAll(() => {
  try { require("child_process").execSync("git worktree prune", { timeout: 5000 }); } catch {}
});

// ... GIT_ENV, tmpDir, initGitRepo helpers
// ... paste 17 runAutoMerge tests verbatim
```

- [ ] **Step 4: Verify**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/auto-merge-pure.test.mts src/tests/auto-merge-integration.test.mts --timeout 60000 2>&1 | Select-Object -Last 5
```
Expected: 27 pass, 0 fail.

- [ ] **Step 5: Delete original and commit**

```bash
git rm src/tests/auto-merge.test.mts
git add src/tests/auto-merge-pure.test.mts src/tests/auto-merge-integration.test.mts
git commit -m "refactor(tests): split auto-merge.test.mts → pure + integration (better parallel scheduling)"
```

---

## Task 5: Split `worktree-manager.test.mts` (16 tests → 2 files)

**Split:**
- `src/tests/worktree-manager-core.test.mts` — all `ensureSliceWorktree:` tests = **12 tests**
- `src/tests/worktree-manager-slice.test.mts` — `startSlice:` (2) + `applyWorktreeResult:` (2) = **4 tests**

**Files:**
- Delete: `src/tests/worktree-manager.test.mts`
- Create: `src/tests/worktree-manager-core.test.mts`
- Create: `src/tests/worktree-manager-slice.test.mts`

- [ ] **Step 1: Read the file to identify shared helpers**

```powershell
Get-Content src/tests/worktree-manager.test.mts | Select-Object -First 60
```

- [ ] **Step 2: Create both new files**

Both files share the same import set and helper functions (`tmpRepo`, `initRepo`, etc.). Copy the helpers into each file (DRY is less important than keeping each file self-contained for the parallel runner).

Apply the exec-timeout wrapper (from Task 2) in both files since they spawn git.

- [ ] **Step 3: Verify**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/worktree-manager-core.test.mts src/tests/worktree-manager-slice.test.mts --timeout 60000 2>&1 | Select-Object -Last 5
```
Expected: 16 pass.

- [ ] **Step 4: Delete original and commit**

```bash
git rm src/tests/worktree-manager.test.mts
git add src/tests/worktree-manager-core.test.mts src/tests/worktree-manager-slice.test.mts
git commit -m "refactor(tests): split worktree-manager.test.mts → core + slice-integration"
```

---

## Task 6: Split `agent-report-writer.test.mts` (18 tests → 2 files)

**Split:**
- `src/tests/agent-report-writer-core.test.mts` — first 12 tests (happy path through parallel/sequential/skill/in-flight/duplicate detection)
- `src/tests/agent-report-writer-meta.test.mts` — last 6 tests (idempotent reuse, linkArtifact kind, slug format, duration formatting)

**Files:**
- Delete: `src/tests/agent-report-writer.test.mts`
- Create: `src/tests/agent-report-writer-core.test.mts`
- Create: `src/tests/agent-report-writer-meta.test.mts`

- [ ] **Step 1: Read the file**

```powershell
Get-Content src/tests/agent-report-writer.test.mts | Select-Object -First 60
```

- [ ] **Step 2: Create both new files**

Both share the same import block and the `tmpRepo` / `writeTranscript` helper. Copy helpers into each.

- [ ] **Step 3: Verify**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/agent-report-writer-core.test.mts src/tests/agent-report-writer-meta.test.mts --timeout 60000 2>&1 | Select-Object -Last 5
```
Expected: 18 pass.

- [ ] **Step 4: Delete original and commit**

```bash
git rm src/tests/agent-report-writer.test.mts
git add src/tests/agent-report-writer-core.test.mts src/tests/agent-report-writer-meta.test.mts
git commit -m "refactor(tests): split agent-report-writer.test.mts → core + meta"
```

---

## Task 7: Measure, tune, and lock in the result

**Files:**
- Modify: `bunfig.toml` (add `preload` or worker count if needed)
- Modify: `docs/superpowers/plans/bun-migration-baseline.txt`
- Modify: `package.json` if test script needs adjustment

- [ ] **Step 1: Run the full suite 3 times and record wall times**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
1..3 | ForEach-Object {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $out = & $bun test src/tests/ --parallel --timeout 60000 2>&1 | Select-Object -Last 4
  $sw.Stop()
  Write-Host "Run $_`: $([math]::Round($sw.Elapsed.TotalSeconds,1))s"
  $out | ForEach-Object { Write-Host "  $_" }
}
```
Expected: all 3 complete without hanging. Record the wall times.

- [ ] **Step 2: If any run exceeds 180s, check worker utilization**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/ --parallel --timeout 60000 --reporter verbose 2>&1 | Select-String "\[worker" | Select-Object -First 20 | ForEach-Object { $_.Line }
```

If only 2–4 workers are running, add to `bunfig.toml`:
```toml
[test]
timeout = 60000
# bun picks cpu-count workers by default; override if it's too conservative on Windows
# preload = []
```
(Bun 1.3+ auto-selects workers = logical CPU count. Windows may report half — if so, `bun test --jobs N` where N = actual core count. Add it to the npm test script: `"test": "bun test src/tests/ --parallel --jobs 8"` or whatever was observed.)

- [ ] **Step 3: If wall time still > 120s, profile the slowest files**

```powershell
$bun = "C:\Users\milas\.bun\bin\bun.exe"
& $bun test src/tests/ --parallel --timeout 60000 2>&1 | Select-String "\[" | Select-String "ms\]|s\]" | Sort-Object { [double]($_.Line -replace '.*\[(\d+\.?\d*)[ms].*','$1') } -Descending | Select-Object -First 15 | ForEach-Object { $_.Line }
```
If a file takes > 30s and is still a good split candidate, apply the same pattern as Tasks 3–6.

- [ ] **Step 4: Record final baseline**

Append to `docs/superpowers/plans/bun-migration-baseline.txt`:
```
POST-RELIABILITY-FIX 2026-06-10:
  bun --parallel run 1: Xs  pass=NNNN fail=0
  bun --parallel run 2: Xs
  bun --parallel run 3: Xs
  test file count: NNN
  workers observed: N
```

- [ ] **Step 5: Final commit**

```bash
git add bunfig.toml package.json docs/superpowers/plans/bun-migration-baseline.txt
git commit -m "chore(tests): lock in bun --parallel baseline — reliable < Xs, NNN files"
```
