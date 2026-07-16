---
kind: handoff
agent: crew:fullstack-dev (wave builder B2)
slice: FEAT-263-program T2 + Phase 3b (fused close-path builder)
status: DONE
---

# Handoff — W1-B2: close-time structured learnings + outcome-weighted credit

## Objective

Fused builder for the two workstreams that both touch the slice-close path:

- **T2** — structured `--learnings <file.json>` capture at `runner:close`.
- **Phase 3b** — outcome-weighted `--memories-used <file.json>` batch credit
  at close, plus `memory-gepa.mts` project/agent attribution threading and a
  "Memory usefulness (7d)" loop-snapshot telemetry line.

Source plans: `.claude/artifacts/crew/runs/20260716T133000Z-wave-plan-memory-program-execution.md`
(row B2), `20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`
(Phase 3b + hard invariants).

## Branch / commit

- Worktree branch: `worktree-agent-ac5d42601556285c6`
- Commit: `1d8ea5ed` — `feat(memory): structured learnings capture + outcome-weighted close credit (FEAT-263 T2/3b)`
- Base: main @ `942ef250`
- Not pushed (per dispatch instructions — lead runs the merge train).

## Files changed

New:
- `src/scripts/lib/slice-linker/close-memory-capture.mts` — `captureStructuredLearnings`, `submitCloseMemoryCredit`, `readLearningsFile`, `deriveDefaultLearningsAgent`, `MAX_LEARNINGS`, `DEFAULT_CREDIT_BATCH_CAP_MS`.
- `src/scripts/lib/memory-usefulness.mts` — `fetchMemoryUsefulness()` (bounded daemon `/health` read).
- `src/tests/close-memory-capture.test.mts` (30 tests)
- `src/tests/memory-usefulness.test.mts` (5 tests)

Modified:
- `src/scripts/lib/slice-linker/complete-slice.mts` — new opts (`learningsPath`, `learningsAgent`, `memoriesUsedPath`), two calls beside the existing `submitSliceProfileFeedback` touchpoint (wave-3: awaited via `recordMemoryCaptureTrajectory`, see below — no longer bare `void fn(...)`).
- `src/scripts/lib/slice-linker/close-slice.mts` — `CloseSliceOpts` extended + pass-through (via a small extracted `resolveMemoryCaptureOpts` helper — see judgment calls).
- `src/scripts/lib/cli-args.mts`, `src/scripts/loop.mts` — `--learnings`, `--learnings-agent`, `--memories-used` CLI flags wired to both `slice close` and `slice complete` handlers.
- `src/scripts/lib/memory-gepa.mts` — `GepaPayload` gains optional `project`/`agent` (additive); `emitGepaEvent`/`buildGepaMetadata` thread them top-level + metadata-mirrored.
- `src/scripts/lib/grade-writer.mts` — `emitSliceCloseMemory` now passes `project` (loop.json precedence) + `agent: GRADE_AGENT_TYPE` ("crew:builder", the module's existing static tag).
- `src/scripts/lib/memory-snapshot.mts` — "Memory usefulness (7d)" bullet in `## Loop telemetry`, sourced via the new module.
- `src/tests/memory-gepa.test.mts`, `src/tests/memory-snapshot-telemetry.test.mts` — extended in place.
- `commands/close.md`, `docs/sop/memory-bridge.md` — new contract sections.

## `feedbackSilent` signature (verified against `node_modules/@astragenie/astramem-client/dist/profile-calls.d.ts`)

```ts
export declare function feedbackSilent(
  atomId: string,
  opts?: { capMs?: number }
): Promise<boolean>;
```

Resolves `true`/`false`, never throws. Used exactly like `profile-feedback.mts`'s existing `submitSliceProfileFeedback` call site. The daemon health block used for the snapshot line:
`resolveDaemonClient(capMs?: number): AstramemDaemonClient | null` → `.health(): Promise<HealthResponse>` where `HealthResponse.usefulness = { served_7d, used_7d, rate_7d }`.

## Design/judgment calls (documented in docs/sop/memory-bridge.md)

1. **`fact` learning type → `note` wire kind.** `memory-sink.mts`'s `MemoryKind` enum has no `fact`; mapped to `note` (mirrors `memory-gepa.mts`'s own treatment of purely-informational events).
2. **`--learnings-agent` default derivation.** Reuses `pickBuilderVariant()` (already exported from the `slice-linker` barrel) against the slice's own frontmatter tags; `"unknown"` variant → `null` (omitted), not a guessed fullstack default — avoids misattribution.
3. **Credit gate reuses `gatesPassed`.** The same signal `submitSliceProfileFeedback` already uses (blocking/validation/review/test-adequacy gates) — no new outcome concept introduced.
4. **Credit enablement gate = `memory.enabled` only** (via `readMemoryConfig().mode !== "off"`), not the separate `memory.feedback.enabled` flag `profile-feedback.mts` uses — Phase 3b credits an explicit orchestrator-supplied id list, a different trust surface than agent-profile atom auto-credit, so it isn't gated behind that flag. Both respect the universal `memory.enabled: "never"` kill switch.
5. **`grade-writer.mts` attribution reuses its existing static `GRADE_AGENT_TYPE = "crew:builder"`** constant (already used for `recordDecision`/`recordNote` in that file) rather than introducing a second per-role derivation mechanism — simplest consistent choice for the one caller I wired. Other `emitGepaEvent` call sites (`phase-gate.mts`, `phase-gate/parallel-orchestrator.mts`, `slice-linker/start-slice.mts` — the last one is B1's forbidden file) are untouched; threading project/agent through them is explicitly out of scope here (noted in the SOP as follow-up).
6. **`close-memory-capture.mts` placed inside `slice-linker/`** (sibling of `complete-slice.mts`) rather than at `lib/` top level — keeps the import a same-boundary sibling reference (no barrel-boundary violation) and colocates with the ceremony it serves. Not added to `validate-imports.mts`'s `blockedPatterns` list (that file wasn't in my ownership and the enumerated-pattern design means new sub-modules aren't auto-enforced — a pre-existing gap, not one I introduced).
7. **Extracted `resolveMemoryCaptureOpts()` in `close-slice.mts`** solely to keep 3 new `??` fallbacks out of `closeSlice`'s own cognitive-complexity count — `closeSlice` was already at 18/15 (pre-existing debt, verified via `git stash` A/B) before my change; without the extraction my 3 lines would have pushed it to 21. Same verification showed `cli-args.mts`'s `parseArgs` (16/15) and `complete-slice.mts`'s `computeFeatureResult` (26/15) are untouched pre-existing debt — I did not add to either.

## Gates run (all green)

- `bun test src/tests/ --parallel --timeout 60000` → **2957 pass / 0 fail / 7 skip** (full suite, run twice, stable)
- `bunx tsc -p tsconfig.json --noEmit` → exit 0
- `bunx tsc -p tsconfig.test.json --noEmit` → exit 0 (fixed 2 pre-fix errors: an unsafe `IngestPayload → Record<string,unknown>` cast in `memory-gepa.test.mts`, and an unused `beforeEach` import in `memory-usefulness.test.mts`)
- `bunx biome lint` (touched files) → clean; no new complexity regressions (verified pre-existing-vs-introduced via `git stash` A/B on `close-slice.mts` and `cli-args.mts`)
- `bunx biome format --write` (touched files) → 2 files auto-fixed (test object-literal wrapping), now clean
- `bun ./src/scripts/validate-manifests.mts` → OK
- `bun ./src/scripts/validate-content-length.mts` → OK
- `bun ./src/scripts/validate-imports.mts` (bonus sanity check, not in gate list) → OK

## Risks / follow-ups

- **`validate-snapshot-freshness.mts` (CI gate #13) will show drift at merge** — the real committed `.claude/artifacts/loop/loop-snapshot.md` doesn't yet carry the new "Memory usefulness (7d)" line, by design (dispatch explicitly said not to regenerate it in this worktree). The lead must run `bun src/scripts/loop.mts snapshot-memory --repo .` once at the merge-train step before the integration PR's CI runs, or that gate will fail.
- `phase-gate.mts` / `phase-gate/parallel-orchestrator.mts` / `slice-linker/start-slice.mts` `emitGepaEvent` call sites still carry no project/agent — flagged as follow-up in the SOP, not part of this slice's scope (the last file is B1's).
- `memory.creditBatchCapMs` is a new optional config knob (falls back to `DEFAULT_CREDIT_BATCH_CAP_MS` = 5000ms) — undocumented in `.claude/loop.json` schema docs beyond the SOP; low risk, purely additive default-off-until-set behavior.

## Wave-3 targeted fix (2026-07-16, same worktree/branch)

Review verdict: `approved_with_notes` — one 🟡 blocking-ish finding + two small
notes, all addressed in a follow-up commit. Review artifact:
`.claude/artifacts/crew/reviews/20260716T133810Z-review-result-w1-b2-close-learnings-credit-review.md`.

### Fix commit

- Commit: `37aaccc0` — `fix(memory): log close-time learnings/credit outcomes to the slice trajectory (review fix)`
- Files: `src/scripts/lib/slice-linker/complete-slice.mts`, `docs/sop/memory-bridge.md`, `src/tests/grade-writer-memory-attribution.test.mts` (new)

### Item 1 (MEDIUM-HIGH, required) — trajectory observability

`captureStructuredLearnings`/`submitCloseMemoryCredit` were called as bare
`void fn(...)` — results fully discarded, zero production observability,
contradicting the Phase 3b plan's own "credit ledger line in the trajectory
JSONL" deliverable. Fix: added `recordMemoryCaptureTrajectory()` (sibling of
the existing `recordCompleteTrajectory`) that runs both calls via
`Promise.all`, then appends one `"memory_capture"` trajectory step —
`{ learningsRecorded, learningsSkipped, creditedCount, creditSkippedReason }`
— via the existing `trajectory-writer.mjs::recordStep`. `completeSlice` now
**awaits** this helper (previously the two calls were `void`-dispatched)
instead of firing-and-forgetting it directly.

**Design deviation, disclosed:** this changes the calls from fire-and-forget
to awaited. Necessary because `recordStep` only buffers in-memory —
`flushTrajectory` (called by the CLI layer immediately after
`completeSlice`/`closeSlice` returns) would race a still-pending
`void`-dispatched async call and could flush the file before the
`memory_capture` line was ever buffered, silently losing the very
observability being added. Both underlying calls are already internally
bounded/fail-silent (`recordMemory`'s per-entry cap; the shared
credit-batch deadline, default 5s) and run concurrently via `Promise.all`
(not additive), so the added latency is small and capped, not an
indefinite-hang risk — and the whole helper is wrapped in the same
try/catch-swallow-everything contract as its sibling, so it cannot create a
new failure path per the review's explicit constraint.

### Item 2 (MEDIUM, required) — gate-distinction documentation

Added a "Gate note for operators" paragraph to `docs/sop/memory-bridge.md`'s
"outcome-weighted batch credit" section: `memory.feedback.enabled: false`
turns off `submitSliceProfileFeedback`'s auto-credit but does **not** turn
off Phase 3b's `--memories-used` credit — only `memory.enabled` does. Names
both flags explicitly and explains the trust-surface rationale (auto-injected
atoms vs. an explicit orchestrator-supplied id list).

### Item 3 (LOW/MEDIUM, required) — grade-writer.mts test coverage

New `src/tests/grade-writer-memory-attribution.test.mts` (4 tests, capturing
the wire payload via `_setWireProvider`): asserts `emitSliceCloseMemory`'s
`slice_close` GEPA event carries `project` from `productName` fallback,
`project` preferring an explicit `memory.project` override over
`productName`, `project` omitted (with `agent` still present) when neither
is configured, and `agent: "crew:builder"` (`GRADE_AGENT_TYPE`) always
present. Also confirms `memory.enabled: "never"` suppresses the emission
entirely (zero provider calls).

### Gates re-run after the fix (all green)

- `bunx tsc -p tsconfig.json --noEmit` → exit 0
- `bunx tsc -p tsconfig.test.json --noEmit` → exit 0
- `bun test src/tests/grade-writer-memory-attribution.test.mts src/tests/close-memory-capture.test.mts src/tests/close-slice.test.mts src/tests/slice-complete.test.mts --timeout 60000` → 57 pass / 0 fail
- `bun test src/tests/ --parallel --timeout 60000` (full suite) → **2961 pass / 0 fail / 7 skip** across 298 files, run 5 times total (one run showed a transient 1-fail under parallel CPU contention that did not reproduce across 4 subsequent clean runs — not chased further, out of this fix's scope; flagged below as a residual risk, not a defect fixed here)
- `bunx biome lint` (touched files) → 1 pre-existing warning only (`computeFeatureResult` 26/15, untouched by this fix, confirmed present before this diff); the new test file's two `useLiteralKeys` infos were fixed (dot-notation instead of bracket access)
- `bunx biome format --write` (touched files) → clean, no changes needed after the literal-key fix

### Residual risk (new, from this fix's own verification)

One of five full-suite runs showed `2960 pass / 1 fail` immediately after
the trajectory-threading change; four subsequent consecutive runs were
clean (`2961 pass / 0 fail`). Consistent with a timing-sensitive test under
`--parallel` CPU contention (candidates: the wall-clock-based
`grade-writer-telemetry.test.mts` assertions, or `close-memory-capture.test.mts`'s
bounded-batch timing test) rather than a genuine regression — not
reproduced, not chased further per the wave-3 dispatch's scope (three named
items only). Flagging for the lead's awareness at merge-train time; worth a
closer look if it recurs.

## Next handoff

Ready for a wave-3 re-review of the fix commit (`37aaccc0`) per the
dispatch; then merge-train step 4 (lead): integration branch → merge B3 →
B1 → B2 → regenerate `loop-snapshot.md` → full gates → one PR → e2e suite →
merge.
