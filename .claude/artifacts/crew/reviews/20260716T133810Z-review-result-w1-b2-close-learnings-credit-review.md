---
findings: "🔴:0,🟡:0,❓:0"
status: completed
decision: approved
author_id: crew:fullstack-dev (wave builder B2)
judge_id: crew:reviewer (wave-3 delta, w1-b2)
self_approval: false
---
# Review Result: Review Result

- Created: 2026-07-16T14:10:30.402Z
- Reviewer: reviewer
- Decision: approved
- Status: completed
- Summary: Wave-3 delta (fix commit 37aaccc0 + handoff f4e9d0e7) closes all 3 actionable wave-2 findings with verified evidence: recordMemoryCaptureTrajectory correctly threads learnings/credit outcomes into a memory_capture trajectory step (await-instead-of-void is justified by a real recordStep-buffer/flushTrajectory race, remains bounded/non-throwing/never-gating); the SOP gate-note paragraph is accurate; the 4 new grade-writer tests are genuine end-to-end raw-payload assertions, not mock-mirrors. Typecheck clean at committed SHA on both tsconfig files -- the claimed unresolved-name IDE diagnostic again does not reproduce (stale/false, same pattern as wave-2). Full suite 2961/0/7-skip (up exactly by the 4 new tests). Verdict upgraded to approved.
- Evidence Checked:
  - ## Wave-3 delta re-review

Scope: fix commit 37aaccc0 (3 files) + handoff-update commit f4e9d0e7
  - on top
of the previously-approved 1d8ea5ed. Diff verified via
`git diff 1d8ea5ed..37aaccc0` / `git show 37aaccc0`.

### 1. Finding closed: observability gap (was MEDIUM-HIGH)

`complete-slice.mts` replaces the two prior bare `void fn(...)` calls
(`captureStructuredLearnings`
  - `submitCloseMemoryCredit`) with a single
`await recordMemoryCaptureTrajectory(repoPath
  - sliceId
  - {...})` (new function
  - lines 929+). Read the full function body:

- Runs both underlying calls via `Promise.all` (parallel
  - not sequential)
  - then calls the existing `recordStep(repoPath
  - sliceId
  - "memory_capture"
  - { learningsRecorded
  - learningsSkipped
  - creditedCount
  - creditSkippedReason
  })` from `trajectory-writer.mjs`.
- The ENTIRE function body is wrapped in one try/catch with a bare `catch {}`
  (comment: "best-effort — never blocks slice complete"). No throw path
  survives out of this function under any failure mode.

**Design deviation (await instead of void) is justified and does not violate
ceremony-neutral invariants.** Read `trajectory-writer.mts` directly:
`recordStep` only pushes a pre-serialized line into an in-memory `Map`
buffer (`_buffer`) — it does not touch disk. `flushTrajectory` (called from
`loop.mts`'s CLI handler
  - three call sites
  - all *after* `completeSlice`
returns) reads and clears that same buffer to persist it. Under the prior
`void fn(...)` pattern
  - `completeSlice()` could return and the CLI layer
could call `flushTrajectory` before the fire-and-forget promise chain ever
reached its `recordStep` call — a genuine
  - real race
  - not a hypothetical one.
Awaiting `recordMemoryCaptureTrajectory` closes that race correctly.

Bounded-ness confirmed: `captureStructuredLearnings` loops sequentially over
up to `MAX_LEARNINGS` = 3 entries
  - each going through `recordMemory()`
(`memory-sink.mts`)
  - individually capped at `DEFAULT_MEMORY_CAP_MS` (2s
default) unless overridden — worst case ~6s. `submitCloseMemoryCredit` has
its own single shared deadline
  - `DEFAULT_CREDIT_BATCH_CAP_MS` = 5s default
(verified in wave-2). Both run in `Promise.all` (parallel)
  - so the added
worst-case latency to `completeSlice()`'s return is `max(~6s
  - ~5s)` ~ 6s
bounded
  - not summed
  - and never indefinite. This is a real
  - disclosed
behavioral change (completeSlice's wall-clock duration can now grow by a
bounded amount it previously did not wait on) but it introduces no new throw
path
  - no new gate
  - and the `memory.enabled: "never"` kill switch still fully
short-circuits both underlying calls (unchanged internals
  - still
independently tested). Verdict: acceptable tradeoff
  - correctly reasoned
  - does not violate "never block/gate/fail the ceremony."

### 2. Gate-note paragraph in docs/sop/memory-bridge.md

New paragraph ("Gate note for operators (review finding
  - 2026-07-16)")
states: `memory.feedback.enabled: false` disables `submitSliceProfileFeedback`
auto-credit but does NOT disable `--memories-used` batch credit; only
`memory.enabled: "never"`/`"off"` disables both. This is re-verified accurate
against source: `profile-feedback.mts:64-66` gates on
`config?.memory?.feedback?.enabled === true`; `submitCloseMemoryCredit`
(`close-memory-capture.mts`) gates only on `memCfg.mode === "off"` via
`readMemoryConfig`. Matches exactly. Finding closed.

### 3. New grade-writer-memory-attribution.test.mts — genuine
  - not mock-mirror

Confirmed by reading the file: each of the 4 new tests calls the real public
entry point `writeGrade(repo
  - sliceId)` (via `createGradeFile` +
`fillGrade`)
  - not `emitSliceCloseMemory` or `emitGepaEvent` directly. The
wire-level capture is via `_setWireProvider`'s `remember` callback (the same
seam `memory-gepa.test.mts`/`memory-sink.test.mts` already use) — this
exercises the full real call chain `writeGrade -> emitSliceCloseMemory ->
emitGepaEvent -> sendViaProvider -> fake provider.remember`
  - and asserts on
the raw captured payload's `project`/`agent`/`metadata.project`/
`metadata.agent` fields. Covers: productName-derived project + agent=
crew:builder; explicit `memory.project` overriding productName; omission of
`project` when neither is set (agent still unconditionally tagged); and full
suppression of the GEPA emission under `memory.enabled: "never"`. This is
real coverage of the previously-untested wiring
  - not a shallow mock-mirror
test. Finding closed. Ran standalone: 4/4 pass (see Gates below).

### 4. Typecheck at committed state (stale-IDE-diagnostic re-check)

`git status --short` at HEAD `f4e9d0e7` (37aaccc0 + handoff update) is clean
  - no drift. Ran both configs directly against this commit:

- `bunx tsc -p tsconfig.json --noEmit` -> exit 0
  - no output.
- `bunx tsc -p tsconfig.test.json --noEmit` -> exit 0
  - no output.

Grepped `complete-slice.mts` directly: `recordMemoryCaptureTrajectory` is
defined at line 929 and called (pre-declaration call site
  - valid under
function-declaration hoisting) at line 760; `captureStructuredLearnings`/
`submitCloseMemoryCredit` imports (lines 34/36) are both used inside it
(lines 943/951). The claimed unresolved-name IDE diagnostic does **not**
reproduce against the committed state a second time — same stale/false
pattern as the wave-2 report. No merge-train risk.

### 5. Full suite + disclosed flake

`bun test src/tests/ --parallel --timeout 60000` -> **2961 pass / 0 fail / 7
skip** across 298 files (up from wave-2's 2957/297 by exactly the +4 new
tests / +1 new file). No failure reproduced in this run. Targeted run
(`grade-writer-memory-attribution.test.mts`
  - `close-memory-capture.test.mts`
  - `memory-gepa.test.mts`) -> 41/41 pass.

Best-guess candidate for the builder's disclosed 1-of-5 transient flake
(named cheaply
  - not chased): `close-memory-capture.test.mts`'s "bounds the
whole batch under one shared deadline
  - not per-id" test — it is the only
test among the touched/adjacent files using real `setTimeout(...
  - 80)` delays
(x10 mocked fetches) against a real `Date.now()`-measured shared budget
(250ms configured cap
  - `elapsed < 1000ms` assertion) rather than a mocked
clock. Under `--parallel` test execution and system-load jitter
  - real-timer
assertions like this are the classic flake shape; the assertion margins are
fairly generous (4x headroom on the elapsed bound) so it is low-frequency
  - consistent with "1-of-5." Did not attempt to reproduce further.

### Delta findings

None new. All three actionable wave-2 findings are closed with verified
evidence (source read + tests read + tests re-run + typecheck at the
committed SHA). The one wave-2 LOW item (fact -> note kind mapping) was
already accepted as a documented tradeoff requiring no action
  - and remains
unchanged in this delta.

### Updated verdict

**approved** (upgraded from `approved_with_notes`). The only actionable
follow-ups from the prior review are verified closed in this commit; no new
regressions
  - no new gaps
  - gates green at the exact committed SHA.
- Files Reviewed:
  - src/scripts/lib/slice-linker/complete-slice.mts
  - docs/sop/memory-bridge.md
  - src/tests/grade-writer-memory-attribution.test.mts (new)
  - .claude/artifacts/crew/handoffs/20260716T133543Z-handoff-w1-b2-close-learnings-credit.md
- Test Adequacy: Targeted: grade-writer-memory-attribution.test.mts + close-memory-capture.test.mts + memory-gepa.test.mts -> 41/41 pass. Full suite at commit f4e9d0e7 -> 2961 pass / 0 fail / 7 skip across 298 files (up from wave-2's 2957/297 by exactly the +4 new tests). New tests genuinely exercise the real writeGrade->emitSliceCloseMemory->emitGepaEvent->sendViaProvider chain via _setWireProvider, asserting raw payload project/agent fields including precedence and suppression cases -- not a shallow mock-mirror.
- Author: crew:fullstack-dev (wave builder B2)
- Judge: crew:reviewer (wave-3 delta, w1-b2)
- Risks: completeSlice's wall-clock duration can now grow by a bounded ~6s worst case (was previously not waited on at all) due to the await-instead-of-void fix -- accepted tradeoff for correctness, does not violate ceremony-neutral invariants (no throw, no gate, kill-switch still respected). Disclosed 1-of-5 transient full-suite flake did not reproduce in this re-run; best-guess candidate named (close-memory-capture.test.mts's shared-deadline batch test, the only touched-file test using real setTimeout/Date.now() timing under --parallel execution) but not chased further per instructions.
- Required Follow-up: none -- all wave-2 findings verified closed; no new follow-up required before merge.

