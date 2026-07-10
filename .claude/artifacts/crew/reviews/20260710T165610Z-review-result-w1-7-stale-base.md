---
decision: approved
reviewer: crew:reviewer (independent, read-only)
commit: 48e2f3fc4bfb6f27a7300b7e129a47efee9eae41
branch: fix/w1-7
worktree: C:/work/mega/runner-plugin-worktrees/w1-7
feature: FEAT-261
---

# Review result — W1-7 stale-base dispatch guard

## Decision: APPROVED

## Scope reviewed

`git diff origin/main...HEAD` (7 files, +334/-12):
`src/scripts/dispatch.mts`, `src/scripts/lib/dispatch-types.mts`,
`src/scripts/lib/dispatch-worktree.mts`, `src/scripts/lib/hierarchical-dispatch.mts`,
`src/scripts/lib/worktree-manager.mts`, `src/tests/dispatch-worktree.test.mts`,
`src/tests/worktree-manager.test.mts`.

## Findings

1. **[INFO] Existing tests unmodified — additions-only confirmed.**
   `git diff origin/main...HEAD -- src/tests/` shows both test files only append
   new `test(...)` blocks after the final pre-existing test; no existing
   assertion body was touched. Matches the incident-followup contract.

2. **[INFO] Guard correctness matches FEAT-261's AC.**
   `resolveDispatchBase` (`dispatch-worktree.mts`) defaults to
   `git rev-parse --verify HEAD` in `repoRoot`, honors an explicit override,
   and throws `DispatchWorktreeError` on an unresolvable ref. `resolveWorktreeBase`
   (`worktree-manager.mts`) mirrors this for the async `git()` wrapper.
   `assertSliceExistsAtBase` walks all four backlog status dirs
   (`pending/triaged/in-progress/done`) and throws a structured error naming
   the id prefix, the resolved base sha, every candidate path, and an explicit
   "stale... refresh it (fetch/pull) or pass an explicit base ref" hint —
   satisfies "loud failure" requirement. Happy-path behavior is byte-compatible:
   in every pre-existing test, the checkout's HEAD already equals `parentBranch`
   at call time (tests either just created/checked-out that branch, or never
   advanced HEAD past the single init commit), so the base-ref switch is a
   no-op for old assertions — confirmed by the full suite passing unchanged.

3. **[LOW / INFO] `worktree-manager.mts`'s `main`→resolved-HEAD change is a real behavior change, outside strict incident scope, but nothing found that depends on the old behavior.**
   Grepped `README.md`, `ADOPTION.md`, and `docs/superpowers/**` for any doc
   asserting that `/runner:start`'s single-slice worktree deliberately bases
   on `main` regardless of the invoking branch — found none; the only "main"
   references are about wave-mode *merge* target, not worktree *base*. The
   sole call site (`start-slice.mts:421` → `ensureSliceWorktree`) doesn't pass
   `baseRef`, so it now defaults to invoking HEAD instead of a hardcoded
   `"main"` literal — directionally consistent with the FEAT-261 fix, and
   currently dormant in this repo since `.claude/loop.json` doesn't set
   `worktreeMode` (this repo runs wave mode via `dispatch-worktree.mts`, the
   module the incident actually hit). Builder's choice to skip the
   slice-existence guard here (synthetic test repos have no backlog dirs) is
   reasonable and doesn't weaken the fix — the guard's absence here just means
   this path relies on the base-ref fix alone, not the loud-failure fix. Not
   blocking, but flag for whoever owns `worktreeMode`-enabled repos to confirm
   the new behavior (branch off current HEAD, not `main`) is what they want.

4. **[INFO] Sync/async discipline preserved.**
   `dispatch-worktree.mts`'s new exports (`resolveDispatchBase`,
   `assertSliceExistsAtBase`) stay synchronous (`execFileSync`), consistent
   with the rest of the module. `worktree-manager.mts`'s new
   `resolveWorktreeBase` is `async`, consistent with its existing `git()`
   wrapper. No signature was async-ified or sync-ified against its module's
   grain.

5. **[INFO] `assertSliceExistsAtBase` git plumbing verified live in a worktree.**
   Uses `execFileSync("git", ["cat-file", "-e", ...])` — sync, matching the
   module. Live-probed directly in this worktree checkout:
   `git cat-file -e <HEAD-sha>:.claude/artifacts/loop/backlog/pending/FEAT-261.md`
   succeeds, and a missing path fails with exit 128 as expected — confirms
   git plumbing resolves shas correctly from inside a worktree (shared object
   store), not just a primary checkout.

6. **[INFO] Independent verification run (parallel suite + typecheck + lint), not just the builder's serial claim.**
   - `bun test src/tests/ --parallel --timeout 60000` → **2707 pass, 1 skip, 0 fail** (2708 tests / 280 files, 33.64s) — matches the builder's claimed count, run independently.
   - `bunx tsc --project tsconfig.json --noEmit` → clean, exit 0.
   - `bunx tsc --project tsconfig.test.json --noEmit` → clean, exit 0.
   - `bunx biome lint` on all 7 touched files → 2 warnings + 3(→4) infos, all confirmed **pre-existing on `origin/main`** by lint-checking the unmodified `origin/main` copies of `dispatch.mts` and `worktree-manager.test.mts` side-by-side (`parseArgs` cognitive-complexity 26, `cmdPrune` cognitive-complexity 17, and a `useTemplate` info in a pre-existing test at line ~452/379). No new lint violation introduced by this diff.
   - `bunx biome format` (check mode) on all 7 touched files → clean, no diff.

## Process note (non-blocking)

FEAT-261 has no `SLICE-*` file and is still `status: pending` — this landed
as a direct hotfix commit rather than through the slice ceremony. Given the
incident write-up and evidence trail (dispatch ledger + grade lessons) already
live in the FEAT body, this is acceptable for an incident followup, but the
FEAT should still be moved through `/runner:close` (or explicitly reconciled)
so backlog state doesn't drift — see this repo's own memory note on
direct-merge-strands-FEATs-in-pending.

## Verdict

No correctness, safety, or regression issues found. Test-suite, typecheck,
and lint are all independently confirmed clean (lint findings pre-date this
diff). **APPROVED.**
