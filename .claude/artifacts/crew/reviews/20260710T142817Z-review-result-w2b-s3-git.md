---
slice: W2b-S3
title: "W2b S3 — central run-git wrapper + 12-file migration (issue #449 §2)"
decision: approved
reviewer: crew:reviewer (independent review agent)
commit: 46e2d0c1
worktree: C:/work/mega/runner-plugin-worktrees/w2b-s3
branch: feat/w2b-s3-git
date: 2026-07-10
---

## Verdict: FAIL (rejected)

One HIGH-severity error-contract divergence, reproduced and confirmed against the actual
`gitTextOrThrow` implementation. Everything else checked out clean (trimming, maxBuffer,
cwd forwarding, left-local reasoning, typecheck, full suite).

## Findings

**[HIGH] `src/scripts/lib/run-git.mts:70-79` — `gitTextOrThrow` does not attach
`.stdout`/`.stderr`/`.code` to the thrown Error, breaking every call site that reads
`err.stderr` off the old `promisify(execFile)` rejection.**

The module's own doc comment (`run-git.mts:12-15`) claims `gitTextOrThrow` "mirror[s]
`promisify(execFile)`'s rejection contract." It doesn't. Reproduced directly:

```
$ node -e 'const {execFile}=require("node:child_process");const {promisify}=require("node:util");
  promisify(execFile)("git",["rev-parse","--verify","nope"]).catch(e=>
  console.log("stderr" in e, e.stderr, e.code))'
true 'fatal: Needed a single revision\n' 128
```
vs. the new wrapper (ran against this branch's actual `run-git.mts`):
```
has .stderr: false undefined
has .stdout: false undefined
has .code: false undefined
message: git rev-parse --verify definitely-not-a-branch-xyz exited 128: fatal: Needed a single revision
```

`gitTextOrThrow` throws a plain `new Error(message)` — no extra properties. Every migrated
call site that did `catch (err: any) { ... err?.stderr ... }` to populate a structured error
field now silently gets `undefined` there:

- `src/scripts/lib/auto-merge.mts:293` (`BRANCH_MISSING`) — **information is fully lost**,
  not just reformatted: `message` is a static string with no fallback to `err.message`, and
  `gitStderr: (err?.stderr ?? "").trim()` is now always `""`. The real git stderr (e.g. why
  the branch lookup failed) never reaches the thrown `MergeError` at all.
- `src/scripts/lib/auto-merge.mts:505,528,553,568,591,632` (`FETCH_FAILED`,
  `REBASE_CONFLICT`, `MERGE_FAILED` ×3, `PUSH_FAILED`) — same `gitStderr: (err?.stderr ??
  "").trim()` pattern, always `""` now. These sites happen to also build `message` with a
  `(err?.stderr ?? err?.message ?? "").trim()` fallback, so the human-readable text still
  contains the git diagnostic (embedded inside `gitTextOrThrow`'s own message string) — but
  the structured `gitStderr` field on the public `MergeError` class is dead from here on.
- `src/scripts/lib/worktree-manager.mts:250-258` (`WORKTREE_ADD_FAILED`) — identical
  pattern; `gitStderr` on `WorktreeError` is always `""`.

Confirmed via repo-wide grep that nothing today *reads* `.gitStderr` off these error classes
(`grep -rn "\.gitStderr\b" src/scripts src/tests` → only the two constructor assignments),
and no test asserts on it, which is why `bun test` stays green. That's exactly why this is
dangerous: it's a silent contract break on a public field (`MergeError.gitStderr`,
`WorktreeError.gitStderr`) whose entire purpose is carrying raw git stderr for
operators/future callers (e.g. `/crew:fix` tooling), and the BRANCH_MISSING path loses the
diagnostic text outright, not just structurally.

Minimal fix, contained to one function, no call-site changes needed: have
`gitTextOrThrow` attach `stdout`/`stderr`/`code` (exit status) onto the thrown `Error`
before throwing, mirroring what `util.promisify`'s custom exec/execFile promisifier
actually does. That restores every `err?.stderr` read across both files without touching
the 12 migrated call sites.

## Checks that passed

- **Error-contract parity (non-throwing paths):** `gitText`/`gitOk`'s catch-to-null/false
  contract correctly covers non-zero exit, spawn failure (`TransientError`), and maxBuffer
  overflow (`DeterministicError`) — verified against `checkpoint-commit.mts`,
  `agent-version.mts`, `doctor.mts`, `learnings.mts`, `crew-bridge.mts::detectCostMode`,
  `wave/real-deps.mts::realGitStatus` (outer try/catch added specifically to fold the new
  throw-on-spawn-failure behavior back into the old `spawnSync`-derived `clean: false`,
  with a comment explaining why).
- **stdout trimming:** plugin-std's `runGit` already chomps exactly one trailing newline
  (matches git's own convention); `gitText`'s additional `.trim()` is idempotent on top of
  that. No site relied on untrimmed multi-line output — `parseWorktreeList` in
  `worktree-manager.mts` already tolerated a missing/extra trailing newline via
  `.filter(b => b.trim().length > 0)`.
- **maxBuffer forwarding:** spot-checked every old call site with an explicit maxBuffer
  (`learnings.mts` 64KB ×2, `crew-bridge.mts::detectCostMode` 64KB/256KB,
  `slice-progress.mts::sliceNumbersCompletedInGit` 1MB) — all forwarded correctly through
  `opts`. Sites with no old maxBuffer (default 1MB) correctly pass none now either. No
  silent drops found.
- **cwd forwarding:** verified on every migrated call — either via the `-C <path>` git arg
  (preserved verbatim from the old execFile invocation) or via `opts.cwd` (checkpoint-commit,
  learnings, doctor, crew-bridge, dispatch-prune) — 1:1 with the old call.
- **Left-local reasoning (sound, spot-checked):**
  - `dispatch-pr-mode.mts::_internals.execGit` is a genuinely synchronous export (`(args,
    cwd): string`, via `spawnSync`), and `src/tests/dispatch-pr-mode.test.mts` replaces
    `_internals.execGit`/`execGh` with synchronous stub functions directly — migrating to
    the async-only `runGit` would both change the exported signature and break those
    mocks. Confirmed correct to leave local.
  - `dispatch-merge.mts` / `dispatch-worktree.mts` — every exported function using
    `execFileSync` (`mergeChildren`, `preflightGitClean`, `createChildWorktree`,
    `removeChildWorktree`, `inventoryWorkerBranch`, `cherryPickHandoffsFromBranch`) is
    declared `export function` (not `async`), confirmed genuinely sync.
  - `codemod-add-any.mts`'s only `child_process` import (`execSync`) runs `npx tsc`, not
    git. Confirmed no git calls exist in that file.
- **`src/tests/` diff:** empty, confirmed (`git diff origin/main...HEAD -- src/tests/` = 0
  lines).
- **No exported-signature changes:** all touched exported functions keep their original
  parameter/return shapes; `dispatch-prune.mts::pruneRunId` was already `async` before this
  change, so swapping its internal `execFileSync` for `await runGit` inside the existing
  async function is not a signature change.
- **tsc:** `tsconfig.json` and `tsconfig.test.json` both `--noEmit` clean (exit 0).
- **Lint:** `bunx biome lint` on all 13 touched files shows 5 warnings / 4 infos, all at
  line numbers outside the diff hunks (verified `complete-slice.mts:286` /
  `computeFeatureResult` is byte-identical to `origin/main` — pre-existing baseline
  complexity warning, not introduced here). No new lint issues in touched code.
- **Test suite:** `bun test src/tests/ --parallel --timeout 60000` — 2647 pass / 0 fail / 1
  skip / 2648 total, matching the claimed evidence. (One rerun showed a transient 1-fail on
  `slice-complete.test.mts` — "The system cannot find the path specified" — that
  self-resolved on a second run; looks like a pre-existing Windows parallel-tmpdir race
  unrelated to this diff's git-spawn changes, not blocking, but worth a note if it recurs.)
- Targeted reruns of `dispatch-pr-mode`, `dispatch-merge`, `dispatch-worktree`,
  `auto-merge`, `worktree-manager` test files: 70 pass / 1 skip / 0 fail.

## Required before re-review

Fix `gitTextOrThrow` in `src/scripts/lib/run-git.mts` to attach `stdout`, `stderr`, and
`code` (git's exit status) to the thrown `Error`, so the 8 `err?.stderr` reads in
`auto-merge.mts` and `worktree-manager.mts` get real data again instead of `undefined`.

---

## Re-review — commit 46e2d0c1 (2026-07-10)

**Verdict: PASS (approved).**

Scope of the fix commit, confirmed narrow: `git diff c7f83d38..46e2d0c1 --stat` touches only
`src/scripts/lib/run-git.mts` (+42/-7), a new `src/tests/run-git.test.mts` (151 lines, 12
cases), and this review artifact. `auto-merge.mts` and `worktree-manager.mts` are
byte-identical to the rejected revision (`git diff c7f83d38..46e2d0c1 -- src/scripts/lib/auto-merge.mts src/scripts/lib/worktree-manager.mts`
is empty) — the fix is contained entirely to the error-construction site, as it should be.

**1. Reran the original repro against the fixed code.** Non-zero-exit case:

```
has .stderr: true "fatal: Needed a single revision"
has .stdout: true ""
has .code: true 128
message: git rev-parse --verify definitely-not-a-branch-xyz exited 128: fatal: Needed a single revision
```

Spawn-failure case (nonexistent cwd, forces plugin-std's `TransientError`):

```
has .stderr: true ""
has .stdout: true ""
name: TransientError runGit: failed to spawn git status
```

Both now expose `.stdout`/`.stderr` unconditionally (backfilled to `""` on the
`TransientError`/`DeterministicError` paths, since those carry no output of their own) —
matches `promisify(execFile)`'s always-defined shape. The nonzero-exit path additionally
attaches `.code` as the numeric exit status. Implementation (`run-git.mts:78-107`) does
exactly this: catches the plugin-std throw, backfills `stdout`/`stderr` to `""` via `??=`
before rethrowing for the spawn/maxBuffer case; constructs its own `Error` with
`stdout`/`stderr`/`code` set directly for the non-zero-exit case.

**2. `src/tests/run-git.test.mts` — assertions pin the actual shape, not just truthiness.**
Confirmed by reading the file: the non-zero-exit test asserts `e.stdout === ""`,
`e.stderr` matches `/fatal/i` (the real diagnostic text, not a placeholder),
`typeof e.code === "number"` and `e.code !== 0`. The spawn-failure test asserts both
`e.stdout === ""` and `e.stderr === ""` explicitly (the backfill case). Also covers
`runGit`/`gitText`/`gitOk`'s pre-existing contracts (ok-exit, non-zero-exit, spawn-failure)
and a maxBuffer-forwarding spot-check. Uses a real temp git repo (matches this repo's
`checkpoint-commit.test.mts`/`doctor.test.mts` precedent) rather than mocking
`child_process`, so it's exercising the real plugin-std code path, not a stub of it.

**3. `git diff c7f83d38..46e2d0c1 -- src/tests/`** — adds only the new file
`src/tests/run-git.test.mts`; no existing test was touched. Confirms the HARD CONSTRAINT
(zero test-file modifications to pre-existing tests) still holds for this fix commit.

**4. `auto-merge.mts:293` (BRANCH_MISSING) now surfaces the git diagnostic.** The code at
that site is unchanged (`gitStderr: (err?.stderr ?? "").trim()`), but `err.stderr` is no
longer `undefined` — confirmed via the repro above, which runs the identical git command
this call site uses (`git rev-parse --verify <branch>`) and gets back
`"fatal: Needed a single revision"` on `.stderr`. The previously-lost diagnostic now reaches
the thrown `MergeError.gitStderr` as intended.

**Evidence rerun:**
- `bun test src/tests/run-git.test.mts src/tests/auto-merge.test.mts src/tests/worktree-manager.test.mts` → 63 pass / 1 skip / 0 fail (64 total).
- `bun test src/tests/auto-merge.test.mts src/tests/worktree-manager.test.mts --timeout 60000` → 51 pass / 1 skip / 0 fail, matching claimed evidence exactly. (Note: the same two files without an explicit `--timeout` flag hit bun's default 5000ms timeout on a couple of the git-spawning integration tests and reported spurious failures — a test-runner-flag artifact of how I invoked it, not a real regression; the project's documented command already carries `--timeout 60000` for this reason.)
- `bun test src/tests/ --parallel --timeout 60000` → 2659 pass / 1 skip / 0 fail (2660 total) — exactly 12 more passing tests than the pre-fix baseline (2647), matching the 12 new `run-git.test.mts` cases.
- `bunx tsc --project tsconfig.json --noEmit` and `--project tsconfig.test.json --noEmit` — both exit 0.
- `bunx biome lint src/scripts/lib/run-git.mts src/tests/run-git.test.mts` — clean, no warnings/infos.

All items from the original HIGH finding are resolved. No new issues found in the fix's
own diff. Approved.
