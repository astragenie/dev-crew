---
filed: 2026-07-08
target_plugin: astramem-plugin
target_repo: astragenie/astramem-plugin
status: open
loop_tracking_feat: FEAT-233
loop_related_decision: .claude/artifacts/loop/decisions/DEC-071.md
loop_related_research: null
resolved: null
resolved_by: null
upstream_issue: astragenie/astramem-plugin#29
---

# Upstream-request: `AbortSignal` / unref'd-timer support so capped `MemoryProvider` calls can actually be cancelled

## Filed against

- **Plugin:** astramem-plugin (`@astragenie/astramem-plugin`, consumed transitively via `@astragenie/astramem-client`)
- **Surface:** the `MemoryProvider.remember()` / `.recall()` implementations' internal abort/timeout timers (provider-side, inside astramem-plugin — not visible from this repo's source tree).
- **Reason:** runner-plugin's memory transport (`src/scripts/lib/memory-transport.mts::sendViaProvider`, thin adapter over `@astragenie/astramem-client`'s `rememberSilent`/`recallSilent`) races a provider call against a caller-supplied wallclock cap (`capMs`). When the cap wins the race, the LOSING provider call is only abandoned client-side — it is never told to stop. astramem-plugin's own internal timers are neither `unref()`'d nor driven by an `AbortSignal`, so the abandoned call can keep the process's event loop alive for up to that internal timeout even after `sendViaProvider`/`recallSilent` has already resolved `false`/empty to its caller.

## Problem

Both of runner-plugin's capped memory paths hit this:

1. **Capture** — `memory-sink.mts::recordMemory` calls `sendViaProvider(payload, capMs)`
   (default 2000ms, `DEFAULT_MEMORY_CAP_MS`, see DEC-071). If the provider is
   slow-but-reachable, `sendViaProvider` resolves `false` at the cap, letting
   `recordMemory` fall through to the CLI-spawn fallback — but the original
   provider call is still running underneath.
2. **Recall** — `start-slice.mts::runRecallHook` calls `recallSilent(req, {
   capMs: timeoutMs })` (default 5000ms, `DEFAULT_RECALL_CAP_MS`, see
   DEC-071). Same shape: the losing call is abandoned, not cancelled.

Concretely, this means a short-lived CLI process (e.g. `/runner:start`
finishing its work and about to exit) can be held open for up to astramem's
own internal abort window (observed ~5s) past the point where the caller
already moved on. It is bounded (not unbounded — the plain-absent-backend
case fails fast via `ECONNREFUSED` and clears its own timer normally) but it
is real, and it is invisible to anyone reading only runner-plugin's source,
since the timers live inside astramem-plugin.

## Why this can't be fixed consumer-side

The CLI-spawn transport (a hand-rolled HTTP client living in runner-plugin)
was deliberately retired in favor of the in-process `MemoryProvider` per
dev-team#172 (FEAT-188 S1b). Reimplementing a parallel HTTP client here to
add our own cancellation would be reintroducing the exact thing that
migration removed, just to work around the provider's own timers. The only
sanctioned fix is upstream: astramem-plugin's provider implementations need
to accept and honor an `AbortSignal` (or at minimum `unref()` their internal
timers so they don't hold a short-lived process open).

## Ask

1. `MemoryProvider.remember()` and `MemoryProvider.recall()` (and whatever
   internal HTTP/RPC client backs them) accept an optional `AbortSignal` and
   actually abort the in-flight request/timer when it fires, rather than only
   racing a `Promise.race`-style internal timeout that leaves the loser's
   timer running.
2. Failing that (or in addition), any internal `setTimeout`/`setInterval`
   used for the provider's own retry/abort bookkeeping should be `unref()`'d
   so an abandoned call cannot keep a Node process's event loop alive after
   the caller has already moved on.
3. Once either lands, `@astragenie/astramem-client`'s `rememberSilent` /
   `recallSilent` should thread the signal through from their `capMs` option
   (deriving an `AbortSignal.timeout(capMs)`-equivalent internally, or
   accepting a caller-supplied `signal` directly) so consumers like
   runner-plugin don't need any local change beyond passing it along.

## Local seam (already landed, FEAT-233 Part B)

`memory-transport.mts::sendViaProvider`'s JSDoc now carries the KNOWN LIMIT
note (referencing this file + issue #29) and marks exactly where a `signal?:
AbortSignal` parameter would be added once upstream ships — see the function
doc in `src/scripts/lib/memory-transport.mts`. No local workaround (no
reimplemented HTTP client, no client-side hard-kill of the provider call) has
been added; the seam is the only local change for this half of FEAT-233.

## Notes for whoever picks this up on the astramem-plugin side

- Verify against the `>=0.6.0` peer range runner-plugin currently pins
  (`@astragenie/astramem-client`'s `peerDependencies`, `bun.lock`).
- `@astragenie/astramem-client` lives in `plugins-common` (sibling repo) —
  the AbortSignal plumbing likely needs a coordinated bump there too once
  astramem-plugin ships its half.
