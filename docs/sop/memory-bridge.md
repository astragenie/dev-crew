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

## Dormant state

**The bridge is a no-op until `memory-plugin` v0.4 ships `astramem`.**
`resolveCli()` returns `null` when neither `$CLAUDE_PLUGIN_ROOT_MEMORY/bin/astramem`
nor a PATH entry is found — `emit()` skips immediately without network activity
or log noise.

See: [memory-plugin issue #8](https://github.com/astragenie/memory-plugin/issues/8)

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

## Failure contract

`emit()` is guaranteed to:
- Never throw.
- Resolve within 2 seconds wallclock (Promise.race + 2 s timeout).
- Swallow ALL errors: ENOENT, network failure, non-zero exit, malformed JSON.

Grade writes and phase-gate results are completely unaffected by memory-bridge
errors.
