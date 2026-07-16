# SOP — Memory Bridge

## What it is

**`src/scripts/lib/memory-bridge.mts` no longer exists.** It was retired by
FEAT-235 (Decision 1) and its CLI-spawn `emit()`/`buildRememberArgs()` were
deleted outright — the discovery chain they hand-rolled is a verified strict
subset of `@astragenie/astramem-client`'s `resolveWireProvider()` (see
DEC-072). GEPA-shaped trainset capture now lives in
`src/scripts/lib/memory-gepa.mts` (`emitGepaEvent` / `buildGepaMetadata`),
which sends through the same in-process `MemoryProvider` transport as
`memory-sink.mts` (`sendViaProvider`) — **no CLI subprocess, no `astramem`
binary spawn, no `--type`/`--content`/`--metadata` argv**. This section
historically described the CLI-spawn wire contract; it is corrected below to
describe the current provider-only path. Runner has zero knowledge of
providers, auth, or bearer tokens — all of that lives in the installed
astramem plugin.

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

## Wire contract to astramem (FEAT-223 / DEC-067; provider path since FEAT-235)

`emitGepaEvent()` (`memory-gepa.mts`) sends a GEPA payload through
`sendViaProvider()` (`memory-transport.mts`) — the same in-process
`MemoryProvider.remember()` call `memory-sink.mts` uses, not a CLI
subcommand:

| `ProviderIngestPayload` field | Source |
|---|---|
| `type` | `GEPA_KIND_MAP[payload.event]` — mapped onto memory-sink.mts's closed `MemoryKind` enum (`decision`\|`lesson`\|`note`\|`failure`), not the free `payload.event` string (FEAT-235/DEC-072 fixed a prior mismatch here) |
| `text` | `payload.feedback`, sanitized + length-capped |
| `metadata` | bounded JSON via `buildGepaMetadata()`: `{ sliceId, featId, score, phase, source, prompt_version, input, output }` — `input`/`output` are recursively summarized (string/array/key/depth caps) so an arbitrarily large caller object can never blow up the payload |

`GepaPayload` still carries no `project`/`agent` fields today, so
`emitGepaEvent()` does not tag GEPA events by project/agent — unlike
`memory-sink.mts::recordMemory`, which as of this fix (CANARY-REVIEWER-8801)
sends `project`/`agent` as **top-level** `ProviderIngestPayload` fields (in
addition to the `metadata.project`/`metadata.agent` copy kept for
back-compat) — mirroring the top-level `project`/`agent` vocabulary
`@astragenie/astramem-client`'s `RecallRequest`/daemon `RememberRequest`
types already use for reads. Threading `project`/`agent` through
`GepaPayload`/`emitGepaEvent()` the same way is tracked as follow-up work,
not yet done.

**`metadata` is write-only.** astramem's `RecallHitSchema` has no
`metadata` field and its response schema is non-strict, so anything placed
there is silently stripped on the way back out via `recall` — for every
consumer, not just this one. Do not design around round-tripping GEPA
fields through astramem; the GEPA optimizer never reads astramem in the
first place; it reads the local JSONL store shown above.

## Where logs go

`astramem` handles fail-silent logging on the memory-plugin side at
`~/.astramemory/ingest.log` (append-only, rotates at 10 MB). Runner never
writes memory logs directly.

## Provider resolution state (post-FEAT-235)

`resolveWireProvider()` (`@astragenie/astramem-client`) tries, in order: an
injected test provider, the astramem-plugin dep-mode selector, the
dep-mode local/saas provider probe, then runtime plugin-root discovery
(`CLAUDE_PLUGIN_ROOT_MEMORY` env or an `astramem` binary found on `PATH`).
It returns `null` only when every strategy fails — in that case
`sendViaProvider()`/`recallSilent()` skip immediately without network
activity or log noise (`no-cli` reason in `RecordResult`, a legacy name kept
for back-compat since the old CLI-spawn era). See
`docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` for the
original (now historical) CLI-era investigation.

## Off-switch

Set `memory.enabled: "never"` in `.claude/loop.json` to disable all
memory capture (`memory-sink.mts`) and GEPA emission (`memory-gepa.mts`)
permanently:

```json
{
  "memory": { "enabled": "never" }
}
```

Default is `"auto"` (send when a provider resolves). The flag is read fresh
on every call from `loop.json` — no restart required.

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

The recall hook is dormant when no astramem provider resolves (same
`resolveWireProvider()` chain as capture, above). When hits > 0, a
`recall_used` trainset event is emitted fire-and-forget for A/B comparison.

## Failure contract

`sendViaProvider()` / `recallSilent()` (and therefore `recordMemory()` /
`emitGepaEvent()` / the recall hook, all built on top of them) are
guaranteed to:
- Never throw.
- Resolve within their wallclock cap (`DEFAULT_MEMORY_CAP_MS` = 2 s for
  capture, `DEFAULT_RECALL_CAP_MS` = 5 s for recall, or a `memory.capMs` /
  `memory.recall.timeoutMs` override — DEC-071).
- Swallow ALL errors: no provider resolved, network failure, provider
  rejection, malformed input.

Grade writes and phase-gate results are completely unaffected by memory
capture errors.

## Memory e2e daemon preflight (SLICE-160 / FEAT-263, runner-plugin#514)

The memory e2e test suite talks to a real **astramem-local daemon** on
`127.0.0.1:7777` — a separate concern from the fail-silent runtime transport
documented above. `src/scripts/lib/astramem-e2e-preflight.mts` exports
`preflightAstramemDaemon()`, a fast bounded HTTP health check the e2e suite
runs before exercising any real MCP tool call, so a missing or hung daemon
fails fast with an actionable message instead of an opaque `ECONNREFUSED` or
a multi-minute hang (this regression-guards a live incident where an
astramem MCP call hung 300s with no response).

### Daemon dependency

The e2e suite requires the daemon listening on `127.0.0.1:7777` (or
whatever `MEMORY_API_URL` points at). Start it with one of:

```sh
node dist/cli/index.js reinstall      # first-time setup
node dist/cli/index.js serve --port 7777   # daemon already installed
```

`preflightAstramemDaemon()` GETs `${MEMORY_API_URL || 'http://127.0.0.1:7777'}/health`
under a ~2000ms bounded timeout (`AbortSignal.timeout`-style, plus a hard
`Promise.race` fallback so a misbehaving connection can never stall the
caller past the bound). A response is treated as healthy only when its
`status` field is one of `ok`, `starting`, or `degraded`; anything else
(unreachable, non-2xx, unparseable body, or an unrecognized status) fails
with the same actionable start-command message above.

Note: `memory-doctor.mts::probeMemory()` (CLI-based, `astramem doctor
--json`) is a different diagnostic and does **not** report true daemon
reachability — its payload shape has no field for that (see the module's
own header comment). `astramem-e2e-preflight.mts` is complementary, not a
replacement.

### `ASTRAMEM_E2E` toggle

The memory e2e suite is opt-in, controlled by `ASTRAMEM_E2E`:

| Value | Resolved mode | Behavior |
|---|---|---|
| unset, `0`, `false`, `skip` (default) | `skip` | Preflight and every memory-dependent test are skipped; no network request is made. |
| `1`, `true`, `require` (case-insensitive) | `require` | Preflight runs; on failure the suite fails loudly (non-zero exit / failing test) rather than skipping. |

Resolve via `astramemE2eMode(env)` from the same module.

### Strict mode (FEAT-263 Phase 2)

`preflightAstramemDaemon({ strict: true })` additionally requires
`embed.ok === true` AND `status === "ok"` — the default (`strict: false` /
omitted) still accepts `degraded` (embed down) as healthy, since FTS-only
recall keeps working without a live embedder, but a semantic-recall test run
against a degraded embedder is meaningless. Backwards-compatible: omitting
`strict` preserves the original permissive behavior exactly.

### The e2e smoke suite (`src/tests/astramem-e2e.test.mts`)

Codifies the T1–T6 smoke battery from
`.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md`
as a repeatable, `ASTRAMEM_E2E`-gated suite:

| # | Test | What it proves |
|---|---|---|
| T1 | `/health` × 5 | daemon reachable, `status: ok`, min latency budget |
| T2 | `recordMemory()` → project-filtered `/recall` | write path tags `project`/`agent`; a fresh atom is findable within ~10s (polled, not single-shot) |
| T3 | 10× semantic `/recall`, k=15 | p50/p95 latency budget |
| T4 | `profileSilent()` (`GET /agents/:agent/profile`) | the T2 canary attributes to `runner:researcher`, with an agent-filtered-recall fallback |
| T5 | `feedbackSilent()` (`POST /memory/:id/used`) | usefulness moves off 0.5 for the credited atom |
| T6 | `boundedFetch()` against a connection that accepts but never responds | the suite's own wire calls can never hang past their bound (regression guard for the 300s-hang incident, astramem-local#347) |

Run it against a live daemon with:

```sh
ASTRAMEM_E2E=1 CLAUDE_PLUGIN_ROOT_MEMORY=/path/to/plugins/cache/astra/astramem/<version> \
  bun test src/tests/astramem-e2e.test.mts
```

`CLAUDE_PLUGIN_ROOT_MEMORY` is required for T2: `recordMemory()`
(`memory-sink.mts`) only resolves a real provider through that env-pinned
plugin-root path in a test process — the PATH-probe fallback is disabled
repo-wide for every test run (`_test-env-guard.mts` sets
`ASTRAMEM_DISABLE_PATH_PROBE=1`), by design, so a test run can never
silently fall back to a real globally-installed CLI. Without it, T2 fails
loudly in require mode rather than reporting a false pass.

Every real wire call the suite makes directly (T1/T2/T3/T4-fallback/T6)
goes through the shared `boundedFetch()` helper
(`src/scripts/lib/bounded-fetch.mts`) — the same AbortSignal-plus-hard-
`Promise.race` dual bound as `preflightAstramemDaemon()`. T4/T5 additionally
use `@astragenie/astramem-client`'s `profileSilent`/`feedbackSilent`, which
carry their own single-layer AbortController bound from that package's
`AstramemDaemonClient`.

In require mode, each test appends one JSONL line to
`.claude/artifacts/loop/memory-e2e/<run-timestamp>-smoke.jsonl` (created on
first write). Skip mode writes nothing.
