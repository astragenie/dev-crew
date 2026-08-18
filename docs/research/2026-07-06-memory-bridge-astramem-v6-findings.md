# Memory bridge / astramem v0.6 findings — 2026-07-06

**Issue:** GitHub #324 — memory-bridge stale (astramem v0.6 / plugin-vs-CLI).
**Files investigated:** `src/scripts/lib/memory-bridge.mts`,
`src/scripts/lib/memory-recall.mts`, plus the astramem plugin's own CLI
source (read from the locally-cached plugin install,
`~/.claude/plugins/cache/astra/astramem/{0.5.4,0.6.0}/`, 0.6.0 not orphaned
— i.e. the live install in this environment).

## Summary

The `// Dormant until memory-plugin v0.4 ships astramem.` comment (and its
sibling in `docs/sop/memory-bridge.md`) was stale — astramem is live and,
in a real dispatch environment, its `bin/astramem` CLI is genuinely
resolvable (this session's `PATH` includes
`.../astra/astramem/0.6.0/bin`, and `where astramem` finds it plus two
other global installs). **Fixed** — comments now describe the current
state honestly, including a second, more consequential bug this
investigation surfaced.

That second bug: even once `resolveCli()` finds the real CLI, **`emit()`
does not work**, because it invokes an `ingest` subcommand that does not
exist in the real astramem CLI. This was true in both the 0.5.4 and 0.6.0
cached plugin builds. `recallPrior()` is fine — its `recall` invocation
matches the real CLI contract in both versions.

## What "gating on a nonexistent-CLI check" turned out to mean

The dispatch task described the problem as gating being stuck on a
"nonexistent-CLI check." Investigating the actual gating code
(`resolveCli()` in `memory-bridge.mts:89-134`) and its callers
(`grade-writer.mts`, `phase-gate.mts`, `phase-gate/parallel-orchestrator.mts`,
`slice-linker/start-slice.mts`) shows the gate is already structurally
correct: every call site checks `config.memory.enabled !== "never"` first,
then calls `resolveCli()` and no-ops when it returns `null`. That is
already "active by default once a provider is paired" — it was written
assuming a CLI would eventually exist, and now one does.

**No code change was needed in the gating logic itself.** The gate was
never wrong; the CLI it gates on simply didn't exist yet when the comments
were written. What *is* wrong is what happens after the gate opens for
`emit()` (see below) — that's a payload/contract bug, not a gating bug, and
flipping any kind of "always active" switch would not have fixed it.

## The real astramem CLI contract (verified against 0.5.4 and 0.6.0)

`bin/astramem` dispatches exactly these subcommands (both versions):

```
ingest-transcript | recall | remember | health | config | doctor | connect
```

There is **no generic `ingest` subcommand**. `ingest-transcript` is a
distinct, narrower feature: it reads a JSONL *session transcript* file,
scrubs/tails/truncates turns, and POSTs a `TranscriptIngestPayload` — built
for the hook-shim transcript-capture use case, not for arbitrary
single-event JSON like the GEPA payload shape `emit()` sends.

| Consumer | Subcommand invoked | Real CLI arg surface | Match? |
|---|---|---|---|
| `memory-bridge.mts::spawnIngest` | `ingest --json <payload>` | no such subcommand | **NO** — unknown-subcommand exit, swallowed by fail-silent contract |
| `memory-recall.mts::spawnRecall` | `recall --query --k --project --agent --repo --format json` | `recall.ts` (0.6.0): `--query --k --repo --project --agent` | Yes — `--format json` is an extra flag the real CLI ignores (falls to `default:` case), harmless. Real CLI always prints JSON regardless. `--agent` was added between 0.5.4 (not supported) and 0.6.0 (supported) — recallPrior() is compatible with the live 0.6.0 build. |
| `memory-sink.mts::recordMemory` | `remember --content --type [--project] [--agent]` | `remember.ts` (0.6.0): `--content --type --metadata --agent` (folds `agent` into `metadata.agent`) | Mostly — **`--project` is not parsed by `remember.ts`** in either cached version; memory-sink.mts passes it but the real CLI silently drops it (falls to `default:`). Not fatal (silently ignored, same fail-open shape as the `--format` case above) but worth a follow-up since project-scoped decision/lesson recall may be weaker than intended. |
| `memory-doctor.mts::spawnDoctor` | `doctor --format json` | `doctor.ts` (0.6.0): checks `args.includes('--json')`, not `--format json` | **NO** — flag name mismatch means `--json` mode never activates; real CLI would return the human-readable text report, which `mapDoctorOutput()` cannot parse (JSON.parse would throw, function returns `unreachable`/malformed). **Also:** even if the flag were fixed, the real `doctor --json` output shape (`env_vars`, `local_url`, `local_url_source`, `pending`, `deprecation_hits`) has none of the fields `mapDoctorOutput()` reads (`health`, `provider`, `version`, `url`, `last_ingest_at`). Its health ternary falls through to `"ok"` by default when `obj["health"]` is absent — meaning if the flag mismatch were fixed today, `probeMemory()` would silently report `health: "ok"` unconditionally rather than reflecting real state. Out of this task's named scope (`memory-doctor.mts` was not one of the two files assigned) but flagged here since it shares the exact same "designed against an assumed CLI contract that was never verified" root cause. |

## Why the test suite didn't catch this

`memory-bridge.test.mts`'s round-trip test
(`"emit passes well-formed JSON as the --json argument"`, line ~273) writes
its own **fake** `astramem` script and asserts the captured argv starts
with `"ingest"` — i.e. it locks in the assumed (wrong) contract rather than
validating against the real CLI. Same pattern in `memory-doctor.test.mts`:
its fixtures fabricate a fake CLI that echoes a hand-written `{ health,
provider, ... }` JSON blob matching `mapDoctorOutput()`'s expectations,
never exercising the real `doctor.ts` output shape or flag names. Green
tests here mean "internally self-consistent," not "matches astramem."

## What was changed in this task

1. `src/scripts/lib/memory-bridge.mts` — replaced the stale "Dormant until
   v0.4" docstring with an accurate description of the live CLI, plus an
   explicit note on the `ingest`-subcommand gap at both the module
   docstring and the `spawnIngest()` call site.
2. `docs/sop/memory-bridge.md` — replaced the "Dormant state" section with
   a "CLI resolution state" section describing the same two facts (CLI is
   real and resolvable; `emit()` still silently writes nothing today) and
   pointing at this doc.
3. No behavioral / gating code changes. `emit()`/`recallPrior()`'s
   fire-and-forget, fail-silent, 2s/5s-capped contracts are unchanged.
   `recallPrior()` needed no fix — it already matches the real CLI.

## What was deliberately NOT done, and why

- **Did not rename `ingest` to anything else.** There is no drop-in
  replacement subcommand. The two candidates both fail the "clean,
  low-risk seam" bar from the dispatch brief:
  - `ingest-transcript` is semantically wrong (transcript-shaped, file-based,
    turn-scrubbing pipeline — not a single structured event).
  - `remember` (single `content`/`type`/`metadata` item) could technically
    hold a JSON-stringified GEPA payload, but that's a genuine wire-contract
    redesign (what does `--type` become for a `slice_close` event? does
    `score`/`input`/`output` round-trip through `--metadata`? how does this
    interact with `memory-sink.mts`'s existing, already-correct use of
    `remember` for decisions/lessons/notes/failures?) — not a bug fix.
  Per the dispatch brief's own stop condition ("If no clean low-risk seam
  exists, STOP at step 2 and write your findings"), this is that case.
- **Did not touch `memory-doctor.mts`.** Not in the named scope for this
  task (`memory-bridge.mts` + `memory-recall.mts` only) and its fix
  (flag rename + full output-shape rewrite) is a separable, mechanical
  follow-up — captured in the table above with exact line references so
  it doesn't need re-discovery.
- **Did not attempt the CLI→MCP transport migration.** Confirmed
  out-of-scope per the dispatch brief (subagents can't exercise MCP tool
  calls the way the plugin runtime does, so a rewrite here would be
  untestable). This investigation adds independent evidence *for* that
  migration: the CLI surface has already drifted from what callers assume
  twice (emit's subcommand, doctor's flag+shape), which is exactly the
  fragility the issue's "plugin now owns transport" framing was warning
  about.

## Recommended next slice(s)

1. **Fix `memory-doctor.mts`** (flag name + output shape) — small, mechanical,
   well-scoped; the real `doctor --json` fields are enumerated above.
2. **Decide `emit()`'s fate**: either (a) file an upstream request against
   astramem for a generic single-event ingest subcommand (keeps the GEPA
   payload shape and `emit()`'s call sites unchanged — least churn), or
   (b) redesign `emit()` to shape its payload through `remember`
   (touches the wire contract, the fail-silent tests, and probably
   `docs/sop/memory-bridge.md`'s payload-shape section). Needs a design
   decision before either is safe to build, per DEC-065/DEC-066's
   precedent of writing these down before implementing.
3. **`memory-sink.mts`'s dropped `--project` on `remember`** — low
   priority, silently degrades rather than breaks, but worth closing once
   (2) is settled since both touch the same `remember` call site.
4. The CLI→MCP transport migration itself (#324's stated end goal) —
   needs to happen somewhere that can actually invoke MCP tools during
   development/test (i.e., not a bounded subagent dispatch).
