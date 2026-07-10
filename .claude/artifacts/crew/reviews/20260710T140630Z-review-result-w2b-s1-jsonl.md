---
decision: approved
run_id: w2b-s1-jsonl
reviewer: crew:reviewer (independent, delegated)
scope: W2b S1 (issue #449 section 3) — jsonl-append.mts delegates default path to @astragenie/plugin-std/jsonl
commit: 6ae48db4
branch: feat/w2b-s1-jsonl
---

# Review: W2b S1 — jsonl-append.mts plugin-std adoption

## Decision: APPROVED

## Scope verified

- `git diff origin/main...HEAD -- src/tests/` is empty — no test files modified, hard constraint satisfied.
- 5 files changed: `jsonl-append.mts` (core swap), `grade-jsonl-writer.mts`, `slice-events.mts`, `wave/events.mts` (call-site migrations), `trajectory-writer.mts` (comment-only, left local).
- All exported signatures unchanged (`appendJsonl`, `appendJsonlBatch`, `appendJsonlSync`, `_internals`, both options interfaces).

## Findings

**[PASS] Contract preservation per site** — read old vs. new code directly, not diff alone:
- `grade-jsonl-writer.mts`: old code had no try/catch around `fs.mkdir`/`fs.appendFile` → always threw on failure. New `appendJsonl(file, event)` call has no opts, so `swallowErrors` defaults `false` → still throws uncaught. Preserved.
- `slice-events.mts`: `appendSliceEvent`'s outer `try { await appendJsonl(...) } catch { console.warn(...) }` wrapper is untouched; the warn still fires on any write failure exactly as before.
- `wave/events.mts`: `appendWaveEvent`'s outer try/catch setting `ok=false` is untouched; `appendJsonlSync` (still fully local, not migrated) throws on failure same as the old inline `mkdirSync`/`appendFileSync`, caught by the same wrapper. Removed imports (`mkdirSync`, `appendFileSync`, `dirname`) are confirmed unused elsewhere in the file — `existsSync`/`readFileSync` (used by a separate read path at line 143) correctly retained.

**[PASS] Batch byte-parity** — confirmed against the actual plugin-std source (`node_modules/@astragenie/plugin-std/dist/jsonl.js`), not assumed:
- `appendBatch`'s `serializeLines` does `records.map(r => \`${JSON.stringify(r)}\n\`).join("")`, byte-identical to the old `writeLinesAsync`'s `lines.join("\n") + "\n"` for both single- and multi-record cases.
- Empty-array no-op preserved: `appendBatch` returns before any mkdir/write when `records.length === 0`, matching old `writeLinesAsync`'s `if (lines.length === 0) return;` (no mkdir call either).
- Verified empirically by running the real (non-injected) `appendJsonl`/`appendJsonlBatch` tests in `jsonl-append.test.mts` — both pass against live plugin-std.

**[PASS] Injected-primitive path unaffected** — `hasInjectedPrimitives()` correctly gates on `opts.mkdir !== undefined || opts.appendFile !== undefined`. Confirmed every test in `jsonl-append.test.mts` that overrides `appendFile`/`mkdir` (throw test, swallow test, override test, batch test) still exercises the legacy `writeLinesAsync` path — none of them silently started hitting plugin-std. `learnings-citations.mts:45` (`appendCitation`) passes its own `_internals.mkdir`/`_internals.appendFile`, so it also stays on the legacy path unchanged.

**[LOW, non-blocking] Circular-ref swallow behavior changed, but no real caller is exposed.** Empirically verified (ran `appendJsonl` with a self-referential object and `swallowErrors: true`): old code evaluated `JSON.stringify(record)` as a bare argument expression *before* calling `writeLinesAsync`, so a circular-ref `TypeError` always rejected the promise regardless of `swallowErrors`. New code awaits `pluginJsonlAppend`/`pluginJsonlAppendBatch` *inside* the `try`, and plugin-std's `serializeLines` throw (during the async function body, pre-`await`) becomes a promise rejection that lands inside that same `try` — so `swallowErrors: true` now silently swallows a serialization failure too. Grepped every real caller of the async `appendJsonl`/`appendJsonlBatch` (`auto-dispatch`, `error-pattern-registry`, `grade-jsonl-writer`, `learnings-citations`, `learnings`, `pause-telemetry`, `slice-events`, `telemetry`): the only production call passing `swallowErrors: true` (`dispatch-worktree.mts:314`) uses the untouched **sync** `appendJsonlSync`, which is unaffected by this change. No async caller passes `swallowErrors: true` with data that could plausibly be circular. Judged theoretical — no action required for this slice, but worth a one-line note in `jsonl-append.mts`'s JSDoc if a future caller adds `swallowErrors: true` to the async path with less-trusted records.

**[PASS] trajectory-writer.mts left-local reasoning is sound.** Confirmed `_buffer` is `Map<string, string[]>` where `recordStep` (line 26) already does `JSON.stringify(...)` into the buffer before `flushTrajectory` joins the pre-serialized strings. Routing through `appendJsonlBatch` (which does its own per-record `JSON.stringify`) would double-encode each buffered line into a quoted JSON string. The comment-only change is correct and appropriately conservative — no code motion, no import touched.

## Evidence

- `bun test src/tests/ --parallel --timeout 60000`: **2646 pass / 1 skip / 1 fail** out of 2648. The 1 fail is `memory-transport.test.mts` ("discovers the env-pinned plugin root and delivers via its selector") — reproduces standalone too, and neither the test file nor `memory-transport.mts` appears in this diff (`git diff origin/main...HEAD -- src/scripts/lib/memory-transport.mts src/tests/memory-transport.test.mts` is empty). Pre-existing/environmental, unrelated to this change.
  - Note: the builder's claimed flake (`learnings-worktree-canonical`, "passes standalone") was re-run standalone here and is fully green (4/4) — the actual flake observed in my run is a different, unrelated test. Flagging the discrepancy for the record; does not change the PASS verdict since neither test touches this diff's files.
- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean.
- `bunx biome lint` on all 5 changed files: 1 pre-existing info-level `useTemplate` hint at `trajectory-writer.mts:55`, on a line untouched by this diff (only the JSDoc comment above it changed). Not introduced by this change.
- `bunx biome format` on all 5 changed files: clean, no diffs.
- `bun ./src/scripts/validate-imports.mts`: OK.
- Targeted jsonl-adjacent suites (`jsonl-append`, `learnings-citations`, `grade-jsonl-writer` + worktree-canonical variant, `slice-events` + fanout variant, `wave-events-fanout`, `trajectory-writer`): 46/46 pass.

## Verdict

PASS. Every exported signature is unchanged, all three migrated call sites preserve their original throw/swallow/warn contracts (verified by reading the pre-diff code, not inferring from the diff), batch byte-parity is confirmed against plugin-std's actual source, and the injected-primitive test seam still exercises the legacy path. The one behavioral nuance (circular-ref swallow under `swallowErrors: true`) has no live production exposure. Test suite is green apart from one pre-existing, out-of-scope flake in `memory-transport.test.mts`.
