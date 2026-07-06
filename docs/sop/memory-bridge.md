# SOP — Memory Bridge

## What it is

`src/scripts/lib/memory-bridge.mts` is a fire-and-forget shim that shells out
to the `astramem` CLI (provided by `memory-plugin`) to emit GEPA-shaped JSON
payloads after key loop lifecycle events. Runner has zero knowledge of providers,
auth, or bearer tokens — all of that lives in `memory-plugin`.

## When it fires

| Event | Source | Trigger |
|---|---|---|
| `slice_close` | `grade-writer::writeGrade` | After every grade write (pass **and** fail). Bad grades are the highest-signal training data. |
| `phase_gate_fail` | `phase-gate::runPhaseGate` | FAIL branch only. PASS is already captured by the next `slice_close`. |
| `slice_started` | `slice-linker::startSlice` | On every slice start (runner-plugin#290). Score = 0.5 (neutral — no outcome yet). |
| `recall_used` | `slice-linker::runRecallHook` | On every slice start where astramem returns ≥1 result (runner-plugin#291). |

## Payload shape (GEPA)

```json
{
  "ts": "<ISO 8601>",
  "slice_id": "SLICE-NNN",
  "feat_id": "FEAT-NNN",
  "source": "close | phase-gate",
  "event": "slice_close | phase_gate_fail",
  "score": 0.87,
  "feedback": "<lessons + surprises, or failing check names>",
  "input":  { "ac_text": "...", "dispatch_instruction": "..." },
  "output": { "changed_files": [...], "decisions": [...] },
  "prompt_version": "<git sha7 of agents/runner.md>"
}
```

## Where logs go

`astramem` handles fail-silent logging on the memory-plugin side at
`~/.astramemory/ingest.log` (append-only, rotates at 10 MB). Runner never
writes memory logs directly.

## CLI resolution state

`astramem` is live (observed at plugin v0.6.0; astramem/#324). `resolveCli()`
returns `null` only when neither `$CLAUDE_PLUGIN_ROOT_MEMORY/bin/astramem` nor
a PATH entry is found — in that case `emit()` skips immediately without
network activity or log noise. In real dispatch environments where the
astramem plugin is installed, the PATH probe finds the plugin's own
`bin/astramem` and this gate is no longer the blocker it once was.

**Known gap (#324):** even when the CLI resolves, `emit()`'s `spawnIngest()`
invokes an `ingest` subcommand that does not exist in the real astramem CLI
(`ingest-transcript | recall | remember | health | config | doctor | connect`).
`emit()` therefore still writes nothing today — it fails silently per the
fail-silent contract below, exactly as if the CLI were absent. `recallPrior()`
is unaffected; its `recall` invocation matches the real CLI contract. See
`docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` for details
and remediation options before assuming `emit()` persists events.

## Off-switch

Set `memory.enabled: "never"` in `.claude/loop.json` to disable all
memory-bridge emission permanently:

```json
{
  "memory": { "enabled": "never" }
}
```

Default is `"auto"` (emit when CLI present). The flag is read fresh on every
emit call from `loop.json` — no restart required.

## Recall config (runner-plugin#291)

The pre-dispatch recall hook is controlled by an optional `recall` block
inside `memory`. Default: enabled with `k=5` and `timeoutMs=5000`.

```json
{
  "memory": {
    "enabled": "auto",
    "recall": {
      "enabled": true,
      "k": 5,
      "timeoutMs": 5000
    }
  }
}
```

- `memory.recall.enabled: false` — skip recall only (emit still fires).
- `memory.enabled: "never"` — disables both recall and emit.
- `k` — number of memories to retrieve from astramem.
- `timeoutMs` — wallclock cap for the astramem recall call (AbortSignal kill).

The recall hook is dormant when `astramem` CLI is absent. When hits > 0, a
`recall_used` trainset event is emitted fire-and-forget for A/B comparison.

## Failure contract

`emit()` is guaranteed to:
- Never throw.
- Resolve within 2 seconds wallclock (Promise.race + 2 s timeout).
- Swallow ALL errors: ENOENT, network failure, non-zero exit, malformed JSON.

Grade writes and phase-gate results are completely unaffected by memory-bridge
errors.
