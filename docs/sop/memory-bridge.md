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

This is the in-process trainset shape kept for the local JSONL store
(gepa-core file-store, the GEPA optimizer's actual read path). What actually
crosses the wire to astramem is a narrower `remember` mapping — see
"Wire contract to astramem" below.

## Wire contract to astramem (FEAT-223 / DEC-067)

`emit()` persists a GEPA payload through the real `astramem remember`
subcommand (`buildRememberArgs()` in memory-bridge.mts):

| astramem flag | Source |
|---|---|
| `--type` | `payload.event` (free string; `remember` does not validate or coerce it — this is a different vocabulary from memory-sink.mts's closed `MemoryKind` enum, they simply coexist on the same flag) |
| `--content` | `payload.feedback`, sanitized + length-capped |
| `--metadata` | bounded JSON: `{ sliceId, featId, score, phase, source, prompt_version, input, output }` — `input`/`output` are recursively summarized (string/array/key/depth caps) so an arbitrarily large caller object can never blow up the argv size |

No `--project` and no `--agent`: `GepaPayload` carries neither field.

**`--metadata` is write-only.** astramem's `RecallHitSchema` has no
`metadata` field and its response schema is non-strict, so anything placed
there is silently stripped on the way back out via `recall` — for every
consumer, not just this one. Do not design around round-tripping GEPA
fields through astramem; the GEPA optimizer never reads astramem in the
first place; it reads the local JSONL store shown above.

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

`emit()` persists through the real `remember` subcommand (see "Wire contract
to astramem" above) — the `#324` gap where `spawnIngest()` invoked a
nonexistent `ingest` subcommand is fixed as of FEAT-223/DEC-067.
`recallPrior()` was never affected; its `recall` invocation already matched
the real CLI contract. See
`docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` for the
original investigation.

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
