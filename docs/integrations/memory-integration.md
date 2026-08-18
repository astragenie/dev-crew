# Memory integration (agent-profile load + feedback)

**Status:** shipped — load in v0.74.0, feedback in v0.75.0.
**Design decision:** [`DEC-009`](../decisions/DEC-009-memory-integration-programmatic-not-skill.md)
— the runner loads and credits memory **programmatically** at dispatch/close,
**not** through a model-invoked skill (skills did not fire reliably for
autonomous subagents).

This is the handoff for anyone extending or debugging memory in the runner.

## What it does

Closes a **load → use → feedback** loop against the astramem daemon so
autonomous-loop agents get smarter across slices:

1. **Load** — when a slice dispatches a builder/reviewer, the agent's astramem
   *profile* (its ranked corrections, recent decisions, and top lessons) is
   spliced into the dispatch prompt.
2. **Use** — the agent reads that block as ordinary prompt context (corrections
   first — they are prior mistakes not to repeat).
3. **Feedback** — on a clean gate pass at slice-close, every profile atom that
   was injected into the slice is credited back to the daemon
   (`POST /memory/:id/used`), lifting genuinely-useful memory up the usefulness
   ranking.

Every part is **opt-in** and **fail-silent**: disabled, agentless, or
daemon-unreachable → byte-identical no-op, never a thrown error, never a blocked
slice.

## Architecture / data flow

```
dispatch assembly                         slice close
─────────────────                         ───────────
buildMemoryContext(opts.sliceId)          completeSlice(sliceId)
  profileSilent(agentType) ──► daemon        gatesPassed = !blocked && !escalated
  profileToLines()  → prompt block                     && validation/review/test-adequacy ok
  profileAtomIds()  → [ids]                 submitSliceProfileFeedback({passed})
       │                                        readInjectedAtoms(sliceId)
       ▼                                        feedbackSilent(id) ──► daemon POST /memory/:id/used
  writeInjectedAtoms(sliceId, ids)  ───────────►  .claude/state/loop/injected-atoms/<sliceId>.json
                                                   (machine-local, git-ignored, union-merged)
```

- Transport is `@astragenie/astramem-client` (`profileSilent`, `feedbackSilent`),
  imported **dynamically** inside the memory-enabled gate so a missing package in
  the plugin cache can never crash module load (the FEAT-238 ENOENT lesson).
- `profileAtomIds` mirrors `profileToLines` exactly (same non-empty-text filter,
  same top-N lesson cap), so the recorded "injected" set equals the rendered set
  — feedback credits only what the agent actually saw.
- The sidecar is **union-merged**: a slice dispatches memory context more than
  once (builder, then the reviewer fan-out), and no write may clobber another's
  ids.

## Files

| File | Role |
|---|---|
| `src/scripts/lib/memory-context.mts` | `buildMemoryContext` (load + splice); `profileToLines`, `profileAtomIds`; writes the injected-atoms sidecar when `opts.sliceId` is set |
| `src/scripts/lib/profile-feedback.mts` | `writeInjectedAtoms` / `readInjectedAtoms` (sidecar); `submitSliceProfileFeedback` (opt-in credit on gate pass) |
| `src/scripts/lib/slice-linker/complete-slice.mts` | fires `submitSliceProfileFeedback` on `gatesPassed` |
| `src/scripts/lib/post-builder-fanout.mts` | reviewer dispatch — passes `sliceId` |
| `src/scripts/lib/wave/dispatch-prompt.mts` | builder dispatch — passes `sliceId` |
| `src/tests/profile-feedback.test.mts` | 7 tests (sidecar merge, id capture, gate gating, disabled-default, fail-silent) |
| `src/tests/memory-context-profile.test.mts` | profile-injection tests |

## Enable

Two flags + two env vars (nothing runs without them):

1. **Daemon + env** — run the astramem daemon (or point at a SaaS URL). The
   client resolves off `ASTRAMEM_BASE_URL` (default `http://127.0.0.1:7777`) and
   `ASTRAMEM_BEARER` ?? `MEMORY_BEARER`.
2. **Flags** in `<repo>/.claude/loop.json`:
   ```json
   {
     "memory": {
       "enabled": true,
       "profile":  { "enabled": true, "topLessons": 10, "timeoutMs": 5000 },
       "feedback": { "enabled": true, "timeoutMs": 5000 }
     }
   }
   ```
   - `memory.enabled` — master gate for all memory context.
   - `memory.profile.enabled` — gates **load** (profile injection + sidecar write).
   - `memory.feedback.enabled` — gates **send** (crediting atoms at slice-close).
     Off ⇒ the sidecar is still written but nothing is ever sent to the daemon.

Both `profile` and `feedback` default **off**. `feedback.timeoutMs` falls back
through `profile.timeoutMs` → `recall.timeoutMs` → 5000.

## Verify

- **Unit / integration (mocked daemon):** `bun test src/tests/profile-feedback.test.mts`
  — sidecar union-merge, inject-time capture (`injected == rendered`), gate
  gating, disabled-by-default, failed-gate no-credit, daemon-unreachable
  fail-silent.
- **Live daemon e2e (NOT YET RUN — see Open items):** with the daemon up and
  the flags on, dispatch a real slice, confirm the profile block appears in the
  dispatch prompt, complete the slice on a pass, and confirm the daemon received
  `POST /memory/:id/used` for each injected atom (or that the atom's `used`
  count incremented).

## Open items / phase-2

- **Live daemon e2e is outstanding.** The loop has only been proven against a
  mocked daemon; the local daemon was down at release time. Run the live
  end-to-end (inject → complete → credit) and record the result here.
- **Reference-level attribution.** v1 is an *outcome backstop*: a pass credits
  every injected atom. Phase-2 should credit only atoms the agent provably used
  (e.g. an agent-emitted "used ids" signal), so noise stops getting lifted.
- **Grade-pass vs gate-pass.** Crediting fires on the slice-close **gate** pass.
  A grade PASS is higher-signal but runs as a later step; consider moving (or
  adding) the credit to grade-time.
- **Cross-plugin parity.** Keep this programmatic path conceptually aligned with
  crew's `using-memory` skill + `SubagentStart` hook so the two memory surfaces
  don't drift. See [`DEC-009`](../decisions/DEC-009-memory-integration-programmatic-not-skill.md).
