# 2026-11-05 audit — index

Entry point for the 2026-11-05 audit set. See `audit-synthesis.md` for the
full cross-repo findings (crew v0.67.0 vs devcrew 1.1.0), `smoke-baseline.md`
for the hook-execution smoke run, `codex-review.md` and `handoff.md` for the
rest of that day's artifacts, `sources/` for raw agent output.

## Hook discovery

Separate from `smoke-baseline.md` (which invoked hook scripts directly with
`bun` and measured crash-on-missing-deps, not discovery), a live two-plugin
marker test the same day found that devcrew's hooks file shipped at
`.claude-plugin/hooks/hooks.json` — a path Claude Code's plugin loader never
discovers. Full method and result:
`.claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md`.
Filed as FEAT-033 (P0, outranking the node_modules crash FEAT-026 — that fix
is moot while the file sits at a dead path) and fixed in SLICE-46: the file
now lives at `hooks/hooks.json` at the plugin root, with no manifest `hooks`
key at the old location (either would double-fire).

### Manual verification

A discovery test (`src/tests/install/hooks-discovery.test.mts`) checks file
placement mechanically. To additionally confirm Claude Code *loads and
executes* the SessionStart hook from a staged plugin copy, run (do not run
this from an automated agent — it spends real budget and needs a throwaway
consumer repo):

```
claude -p --plugin-dir <path to a staged copy of this repo> \
  --max-budget-usd 0.5 --model haiku "Reply with exactly: OK"
```

Expected trace: the reply is exactly `OK`, and the devcrew SessionStart hook
leaves its trace — either a new row appended to the consumer repo's
`.claude/logs/events.jsonl` (written by `crew/scripts/log_event.sh`'s
`session_start` call) or a dedicated marker file if the staged copy swaps in
a throwaway marker command, mirroring the method used in the validation
artifact above (`hk-a`/`hk-b` two-plugin test with unique marker files per
hooks-file location).

**Not run as part of this slice** — SLICE-46's builder did not execute
`claude` (out of scope: no live CLI invocation from an automated dispatch).
The 2026-11-05 validation artifact's own marker test already supplies the
evidence that `hooks/hooks.json` is the one path that loads; this section
exists so a future session (or the CI runner, on re-check per FEAT-033's
AC-4) has the exact repro command and expected output without re-deriving
it. Re-run on the CI runner's Claude Code CLI version and record the result
here — discovery behavior may differ on CLI >= 2.1.295 (noted as an open
risk in the validation artifact; not yet re-checked as of this writing).
