---
findings: "🔴:0,🟡:1,❓:0"
status: completed
decision: approved_with_notes
author_id: builder-179
judge_id: crew:reviewer
self_approval: false
---
# Review Result: SLICE-179 (FEAT-276) — wave planner solo-collapse ordering fix

- Created: 2026-08-03T00:00:00Z
- Reviewer: crew:reviewer
- Decision: approved_with_notes (PASS)
- Status: completed
- Commit reviewed: `3407bd8a` on branch `worktree-agent-a83f1050971b0aae1`
  (`fix(wave): stop leading missing-confidence candidate from poisoning
  packWave (FEAT-276/SLICE-179)`)
- Files reviewed:
  - `src/scripts/lib/wave/planner.mts`
  - `src/tests/wave/planner.test.mts`
- Evidence checked: full `git show 3407bd8a` diff read; re-derived the
  `packWave` control flow by hand for every reachable `picked.length===0`
  path; ran `bun test src/tests/wave/planner.test.mts` (18 pass/0 fail, 39
  assertions); ran `bunx tsc --project tsconfig.json --noEmit` and
  `--project tsconfig.test.json` (clean); ran `bunx biome lint` and
  `bunx biome format` on both changed files (format clean; lint warnings
  present are in `parseFrontmatterPlanner`, outside the diff hunk — confirmed
  via `git show` that those lines are unchanged context, not new).

## Findings (severity order)

1. 🟡 **MEDIUM — pre-existing silent-drop when `waveSize` cap is hit mid-loop
   (not a regression from this slice).** The top-of-loop guard
   `if (picked.length >= opts.waveSize) break;`
   (`src/scripts/lib/wave/planner.mts:45`) is unchanged by this commit —
   confirmed via diff, it's untouched context both before and after. When
   this `break` fires, every remaining `ranked` candidate (including any
   missing-confidence ones not yet queued) is dropped without landing in
   either `items` or `rejected`. This also means `waveSize <= 0` causes the
   very first iteration to break before anything is examined, so
   `missingQueue` stays empty, the new `picked.length === 0 &&
   missingQueue.length > 0` solo-guard never fires, and the whole `ranked`
   list vanishes silently. This existed before SLICE-179 (the same
   `break`-then-vanish shape) and is not introduced or worsened here — flag
   for a follow-up FEAT ("every ranked candidate must land in items or
   rejected, including the waveSize-cap break and waveSize<=0"), but it does
   not block this slice, whose scope was specifically the missing-confidence
   ordering bug.

No other findings. No HIGH/CRITICAL issues.

## Verification against the five review questions

1. **Starvation safety** — `picked.length === 0` after the main loop is
   reachable only two ways: (a) `ranked` had zero non-missing candidates
   (empty list or all-missing), or (b) `waveSize <= 0` (loop breaks before
   examining anything). In case (a), `missingQueue` is exactly the
   all-missing set and the guard correctly grants a solo slot — starvation
   is prevented as designed. In case (b), `missingQueue` is empty too, so
   the guard correctly does *not* fire (there's nothing to dispatch solo);
   this degenerates into finding #1 above (pre-existing, not a new
   starvation risk). There is no reachable path where `picked` is empty for
   some *other* reason (e.g. the first non-missing candidate conflicting) —
   `pickedPaths` starts empty, so the first non-missing candidate examined
   can never conflict with anything already picked, and `conflictingPath`
   only checks against previously-added paths, never within a single
   candidate's own path list. So the guard's semantics hold in every
   reachable case.

2. **waveSize respect** — the solo push only executes when
   `picked.length === 0`, so it can add at most one item, bringing
   `picked.length` to 1. Given the analysis above, this branch is only
   reachable when `waveSize >= 1` (the `waveSize <= 0` case never populates
   `missingQueue`), so `1 <= waveSize` always holds. No overfill possible.

3. **Rejection completeness** — every candidate reached by the loop body
   ends up in `picked`, the `conflict_with_*` rejection, or `missingQueue`
   (later resolved to `picked` or a `missing_touches_files_solo_only`
   rejection). The only gap is the pre-existing `waveSize`-cap `break`
   (finding #1), which silently drops unreached candidates — that gap
   predates this commit and is unchanged by it.

4. **Test quality** — the old test asserted the *buggy* behavior directly:
   S1 (missing) dispatched solo and S2 (clean, declared, non-conflicting)
   entirely absent from `rejected` — i.e. it pinned the silent-collapse bug
   as intended. It was genuinely rewritten (not weakened): the new version
   asserts the *opposite* outcome (S2 picked, S1 rejected with an explicit
   `missing`-containing reason), which is strictly more specific than the
   old assertion (`toBeUndefined()`) since it now checks the reason string
   too. The added companion test (no clean candidate exists at all) is a
   real, distinct case — it exercises the solo-grant branch that the
   rewritten test no longer covers. The sibling test at line 84
   ("missing touches_files rejected when picked is non-empty") is untouched
   and still meaningfully covers the `else` branch (missing candidate queued
   behind an already-picked clean one, rejected via the non-solo path) — verified
   it still passes and its assertions still target real behavior.

5. **Destructuring safety** — `const [solo, ...rest] = missingQueue as
   [SliceCandidate, ...SliceCandidate[]]` is only reached inside the
   `missingQueue.length > 0` branch of the enclosing `if`. TypeScript can't
   narrow a separate array binding's type from a `.length` check in a
   boolean expression, so the `as` cast is a compile-time-only assertion
   bridging that gap — at runtime the guard guarantees at least one element
   exists, so the cast is sound. (Minor style nit, not a defect: `as [T,
   ...T[]]` is slightly less idiomatic than `missingQueue[0]!` / `.slice(1)`,
   but introduces no unsoundness given the guard.)

## Scope discipline

AC-4 (touches_files coverage at slice-creation, SLICE-181) and AC-5 (wave
telemetry, SLICE-182) are correctly out of scope and not evaluated here.

## Verdict

**PASS.** The fix correctly resolves the ordering bug described in
FEAT-276/SLICE-179: a leading missing-confidence candidate no longer
collapses the wave or silently discards well-specified candidates behind
it, and the true solo-only path still dispatches rather than starving. One
pre-existing (not introduced by this slice) silent-drop gap under the
`waveSize`-cap `break` / `waveSize <= 0` is noted as a follow-up, not a
blocker.
