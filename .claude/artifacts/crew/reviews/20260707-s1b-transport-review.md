# Review — FEAT-188 S1b transport migration (runner-plugin#357)

**Scope**: `src/scripts/lib/memory-transport.mts` (new), `memory-sink.mts`, `memory-bridge.mts`
(both modified), `src/tests/memory-transport.test.mts` (new). Plus
`astramemory-plugin/package.json` `./selector` export.

**Post-fix verdict (2026-07-07): PASS-with-followups.** See "Post-fix re-verification" at the
bottom for what changed and what was independently re-checked. The original FAIL below is kept
as-is for the audit trail.

---

## Original review (pre-fix)

**Verdict: FAIL** — two correctness bugs in the fail-silent/latency contract this migration exists
to preserve. Neither is caught by the new tests because the tests inject a fake provider and never
exercise the real discovery path or a genuinely slow (not merely absent) backend.

---

## Findings

### [HIGH] `memory-transport.mts:119-129` (`withCap`) + astramem `local.ts` internal timeouts — abandoned loser can hold the process open past CAP_MS

`withCap` races the real work against a `setTimeout(..., CAP_MS)` and returns the fallback at 2s,
but the loser promise is not cancelled — only `.catch()`'d to avoid an unhandled rejection. The
comment at line 118 asserts "the plugin's providers carry their own internal timeouts, so strays
settle," but those internal timeouts are **longer than CAP_MS and are real `setTimeout` handles
that are not `.unref()`'d**:

- `LocalProvider.remember()` (astramemory-plugin `src/providers/local.ts:248-260`) uses a 5000ms
  `fetchWithTimeout`.
- `resolveAuto()`'s health probe (astramemory-plugin `src/lib/selector.ts:316-330`,
  `defaultHealthProbe`) uses a 5000ms internal abort timer.

`sendViaProvider` calls `withCap(resolveProviderCached(), null)` and then, if a provider resolved,
`withCap(provider.remember(...), false)` — **two separate 2000ms caps**, each racing against a
backend call whose own internal timeout is 5000ms. When the backend is reachable but slow (daemon
present but degraded, or SaaS configured behind a slow/firewalled path — not the "absent" case,
which fails fast via ECONNREFUSED and clears its timer normally), our function returns in ~2s but
the real `fetch` + its un-aborted internal timer keep running for up to ~3s more. In a short-lived
`bun` invocation (every `emit`/`recordMemory` caller here is a one-shot CLI process, not a daemon —
see below) with no `process.exit()` at the entry point (`loop.mts` uses `process.exitCode`, not
`process.exit`, on every path that reaches these code paths), the process will not exit until the
event loop drains, i.e. **the whole slice-close/phase-gate/slice-start CLI command hangs for the
extra time**, not just the awaited promise. This is the exact class of bug the review request
flagged from runner-plugin#360 (Promise.race not cancelling losers) reappearing in the new
transport.

Fix: thread an `AbortSignal` (or explicit cap) into `provider.remember()`/resolution so the real
call is actually cancelled, not just abandoned — or accept a hard, non-negotiable process-level
timeout at the CLI entry point instead of relying on the callee's cooperation.

### [HIGH] `memory-sink.mts:112-140`, `memory-bridge.mts:254-276` — shared-deadline contract is broken; provider path alone can burn 2× CAP_MS

Both modules document "a single CAP_MS wallclock envelope shared by BOTH transports: the provider
attempt spends from it first, the CLI fallback gets only what remains" (`memory-sink.mts:112-113`,
`memory-bridge.mts:255-256`). But `sendViaProvider` does **not** receive or respect that shared
deadline — it applies its own fixed, independent `CAP_MS = 2000` twice in sequence (resolve, then
remember; `memory-transport.mts:137-148`). Worst case, `sendViaProvider` alone takes ~4000ms.

Meanwhile the caller's `deadline = Date.now() + CAP_MS` (2000ms) was computed *before* that call.
So:

```
memory-sink.mts:114        deadline = now + 2000
memory-sink.mts:132        sent = await sendViaProvider(...)      // can take up to ~4000ms
memory-sink.mts:140        recordViaCliFallback(deadline, ...)
memory-sink.mts:155          remaining = deadline - Date.now()    // already <= -2000 in the worst case
memory-sink.mts:156          if (remaining <= 0) return { recorded: false, reason: "error" }
```

Exactly when the provider is slow-but-ultimately-unavailable (the scenario the fallback exists
for), the CLI fallback is guaranteed to get zero budget and the write is dropped — an outcome that,
pre-S1b, would have succeeded via the CLI spawn with the full 2s. `memory-bridge.mts:emit()` has
the identical shape (`deadline = Date.now() + 2000` at line 257, then the same
`sendViaProvider` call before checking `remaining`). This also explains the new `"error"` reason
value called out in the review request (point 5): it's not just a new label, it's a real regression
in delivery rate for the slow-provider case, silently downgrading what should be an "ok via CLI"
result.

Fix: pass the caller's actual remaining budget into `sendViaProvider` (e.g.
`sendViaProvider(payload, remainingMs)`) and have it split *that* budget across resolve+remember,
rather than each stage independently claiming a full fresh 2000ms.

### [MEDIUM] All four `emit()` call sites pre-gate on `resolveCli()`, defeating the point of the migration for those paths (not in this diff, but directly relevant)

`grade-writer.mts:549-550`, `phase-gate.mts:465-466`,
`phase-gate/parallel-orchestrator.mts` (same pattern), and `slice-linker/start-slice.mts` (both call
sites, lines ~890 and ~933) all do:

```js
const { emit, resolveCli } = await import("./memory-bridge.mjs");
const cli = await resolveCli();
if (!cli) return; // Dormant: astramem not installed.
...
await emit({...});
```

`emit()` itself is now provider-first and doesn't need a resolvable CLI binary at all — but every
caller still requires one as a precondition to calling `emit()` in the first place. In any
environment where the astramem plugin exposes an in-process provider without a discoverable CLI
binary (env override root missing a `bin/astramem[.ext]`, and PATH probe disabled or the binary not
installed), these four call sites will never invoke `emit()` — the provider-first path added in
this PR is dead code for them. `memory-sink.mts::recordMemory` does not have this problem (it calls
`sendViaProvider` unconditionally, gated only on enablement). Worth a fast-follow to drop the
pre-check at these four call sites, or to gate on something transport-agnostic.

### [LOW] `memory-transport.mts:64-72` — test seams have no environment guard

`_setProvider` / `_resetTransportCache` are exported, callable from any code in the process, with
no `NODE_ENV === 'test'` guard — unlike the equivalent seams in the astramem plugin itself
(`selector.ts` `_setHealthProbeFn` / `_resetHealthCache`, both explicitly no-op outside
`NODE_ENV=test`). Low likelihood of misuse in this repo today, but cheap to harden to match the
sibling plugin's own convention, especially since `_providerCache`/`_injectedProvider` are
module-scope and persist for the process lifetime once set.

### [LOW] Discovery path (`candidateRoots` / `resolveFromRoot`) has zero test coverage

Every test in `memory-transport.test.mts` calls `_setProvider(...)` before invoking
`sendViaProvider`/`recordMemory`/`emit`, so `_injectedProvider !== undefined` short-circuits
`resolveProviderCached()` before it ever reaches `candidateRoots()`/`resolveFromRoot()`
(`memory-transport.mts:104-115`). The actual root-derivation (env var vs.
`resolveCli()`-derived path) and the `pathToFileURL` + dynamic-import of `selector.ts` — the core
new logic in this file — is exercised by no test. Given this repo runs on win32 and the path
handling (`path.dirname(path.dirname(cli.path))`, `pathToFileURL(...).href`) is exactly the kind of
thing that silently breaks cross-platform, a test with a fake plugin-root fixture (temp dir with a
real `src/lib/selector.ts` stub) exercising `sendViaProvider` with `_injectedProvider` left
`undefined` would close this gap.

### Informational — empty-text handling is fine in `memory-sink.mts`, unguarded but low-risk in `memory-bridge.mts`

`memory-sink.mts::recordMemory` gates on `sanitizeContent(...)` being non-empty (line 116-117)
*before* calling `sendViaProvider`, so `IngestPayloadSchema`'s `text.min(1)` is always satisfied on
that path. `memory-bridge.mts::emit()` has no equivalent guard — `sanitizeContent(payload.feedback)`
could theoretically be empty — but every current caller interpolates a non-empty fallback
(`"unknown stage"`, `"unknown group"`, etc.), so this isn't reachable today. If it ever were, the
provider would reject server-side (4xx via `assertOk`), the rejection is caught by `withCap`'s
`.catch(() => fallback)`, and the code falls back to the CLI path — which has the same historical
gap (pre-existing, not a regression). Not blocking, worth a one-line guard for defense in depth.

### Not a problem — cache semantics, ESM cycle avoidance, sanitize/argv construction

- `_providerCache` (`false` = confirmed absent) vs `_injectedProvider` (`undefined` = not
  injected) is a clean two-state design; every test resets both in `beforeEach`/`afterEach` and
  re-injects synchronously before the first await, so there's no cross-test leakage within this
  file.
- The lazy `await import("./memory-transport.mjs")` inside `emit()` (rather than a static import)
  correctly avoids the `memory-transport → memory-bridge → (would-be) memory-transport` cycle;
  confirmed by tracing imports — no cycle exists.
- No caller anywhere in `src/scripts` branches on the specific `RecordResult.reason` string values
  (`grade-writer.mts`, `learnings.mts` only check `.recorded`/ignore-and-catch), so the new
  `"error"` value itself doesn't break any consumer — see the deadline-math finding above for why
  its *frequency* matters anyway.

---

## Summary

| # | Severity | File:line | Issue |
|---|----------|-----------|-------|
| 1 | HIGH | `memory-transport.mts:119-148`, astramem `local.ts:248-260`/`selector.ts:316-330` | Abandoned loser promise + un-aborted internal timeout can hold a short-lived CLI process open past CAP_MS when backend is slow-not-absent |
| 2 | HIGH | `memory-sink.mts:112-156`, `memory-bridge.mts:254-276` | Shared 2s envelope not actually shared — provider path can consume ~4s, starving the CLI fallback exactly when it's needed |
| 3 | MEDIUM | `grade-writer.mts:549-550` + 3 other `emit()` call sites | Callers pre-gate on `resolveCli()`, so the provider-first migration is unreachable for those paths without an already-resolvable CLI |
| 4 | LOW | `memory-transport.mts:64-72` | Test seams lack `NODE_ENV==='test'` guard present in the sibling plugin's own seams |
| 5 | LOW | `memory-transport.test.mts` (whole file) | Real discovery path (`candidateRoots`/`resolveFromRoot`) has no test coverage — every test bypasses it via injection |

Recommend fixing #1 and #2 before merge — both directly contradict the fail-silent/CAP_MS contract
this module's own docstring promises, and #2 is a functional regression (lower delivery rate than
pre-S1b in the slow-provider case). #3-5 can be fast-follows.

---

## Post-fix re-verification (2026-07-07)

Re-read every changed file from disk (not from memory) and independently ran tests/typecheck/lint
rather than taking the fix report at face value.

### #2 (shared envelope) — FIXED, verified

`sendViaProvider` (`memory-transport.mts:157-175`) now takes `capMs` as a parameter and applies it
as a **single** deadline: `withCap(resolveProviderCached(), null, capMs)`, then recomputes
`remaining = deadline - Date.now()` and passes *that* (not a fresh `capMs`) into the second
`withCap` for `provider.remember()`. Both callers now pass their live remaining budget instead of
a fixed constant:

- `memory-sink.mts:132-139`: `sendViaProvider({...}, deadline - Date.now())`, computed immediately
  before the call (after sanitize/config-read time has already been spent).
- `memory-bridge.mts:264-271` (`emit()`): same pattern, `deadline - Date.now()` computed inline.

Worst case is now bounded by the caller's original `CAP_MS`/2000ms envelope, not 2×. Confirmed by
reading `recordViaCliFallback`'s `remaining = deadline - Date.now()` (`memory-sink.mts:158`) — it
now sees a deadline that `sendViaProvider` actually respected, so the CLI fallback gets a real
remainder instead of a guaranteed-negative one. No remaining defect found in the math.

### #3 (resolveCli pre-gates) — FIXED, verified

Grepped all five call sites; each now has an explicit `// No resolveCli() pre-gate: emit() is
provider-first (S1b) and no-ops...` comment and no longer calls `resolveCli()` before `emit()`:
`grade-writer.mts:548`, `phase-gate.mts:464`, `phase-gate/parallel-orchestrator.mts:178`,
`slice-linker/start-slice.mts:872` and `:932` (the `recall_used` IIFE and the slice-started emit).
`emit()` is genuinely self-gating now — the provider-first path is reachable from every caller
regardless of CLI resolvability.

### #4 (seam guard) — FIXED, verified

`_setProvider`/`_resetTransportCache` (`memory-transport.mts:65-76`) now no-op unless
`isTestEnv()` (`NODE_ENV === "test" || BUN_TEST`) is true. Independently confirmed this doesn't
break the test suite (Bun sets `NODE_ENV=test` for `bun test` runs by default) — ran
`bun test src/tests/memory-transport.test.mts src/tests/memory-sink.test.mts
src/tests/memory-bridge.test.mts` directly: **48 pass / 0 fail**.

### #5 (discovery coverage) — FIXED, verified

Two new tests in `memory-transport.test.mts` (`"sendViaProvider — runtime discovery (no
injection)"`, lines 43-93) write a real fake plugin root to a temp dir
(`src/lib/selector.ts` with a working `resolveProvider` export), env-pin
`CLAUDE_PLUGIN_ROOT_MEMORY` to it, and call `sendViaProvider` **without** `_setProvider` —
genuinely exercising `candidateRoots()` → `resolveFromRoot()` → `pathToFileURL(...).href` dynamic
import on this platform (win32), plus a degrade case (selector file removed). This closes the gap;
previously every test bypassed discovery via injection.

### #1 (abandoned loser / un-unref'd internal timers) — accepted as documented KNOWN LIMIT + upstream issue

Confirmed this cannot be fixed consumer-side without reimplementing the HTTP client, which is
explicitly out of scope (the CLI-spawn transport was the thing being retired, per dev-team#172 —
reintroducing a parallel hand-rolled HTTP client to work around the plugin's own timeouts would be
the wrong direction). The docstring on `sendViaProvider` (`memory-transport.mts:148-155`) now
states the limitation precisely: which internal timeouts are involved, why it's bounded (~5s, not
unbounded), and why it only manifests when the backend is slow-but-reachable (the plain-absent case
fails fast via ECONNREFUSED and clears its timer normally).

Verified the upstream filing is real and accurately scoped — `gh issue view 29` against
`astramemory-plugin` shows an OPEN issue titled "providers: internal 5s timers are not unref'd and
take no AbortSignal — slow backend holds short-lived consumer processes open," citing this exact
review finding, `local.ts:248-260` and `selector.ts:316-330` by line, the runner-plugin#360
precedent, and both consumers affected (dev-team's `astramem-provider.ts` and this module). The
ask (accept an `AbortSignal`, or at minimum `unref()` the internal timers) is the correct fix and
belongs upstream, not here.

Accepting this disposition: the remaining exposure is a bounded (~3-5s) latency tail on a
fire-and-forget path, only under a specific condition (backend up but slow/firewalled) that is
already rare relative to "daemon simply not running," and is now honestly documented rather than
silently present. Not a blocker.

### Independent verification run (not just re-reading the fix report)

- `bun test src/tests/memory-transport.test.mts src/tests/memory-sink.test.mts src/tests/memory-bridge.test.mts` → 48 pass / 0 fail.
- `bunx tsc --project tsconfig.json --noEmit` → clean (exit 0).
- `bunx biome lint` + `bunx biome format` on all four touched files → clean (exit 0; only
  pre-existing `useLiteralKeys` infos on bracket-notation `expect(meta["score"])` assertions
  carried over unchanged from the original test file — info-level, not warnings/errors, doesn't
  fail the gate).

### Final disposition

PASS-with-followups. #2-5 fixed and independently confirmed; #1 has no clean consumer-side fix,
is now honestly documented as a known bound, and is tracked upstream at astramem-plugin#29 with an
accurate, actionable ask. Safe to merge.
