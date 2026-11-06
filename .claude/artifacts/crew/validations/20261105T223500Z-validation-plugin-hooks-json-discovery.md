---
kind: validation-result
validator: lead (session "crew", Fable 5.1)
subject: Does Claude Code load a plugin's `.claude-plugin/hooks/hooks.json`?
decision: FAIL
created_at: 2026-11-05T22:35:00Z
host: Windows 11, claude 2.1.270
---

# Validation: plugin hooks.json discovery path

## Question

devcrew ships all 38 hook entries in `.claude-plugin/hooks/hooks.json` and
`.claude-plugin/plugin.json` has no `hooks` key. Official docs
(code.claude.com/docs/en/plugins/components) document only `hooks/hooks.json`
at the plugin root or the manifest `hooks` key; `.claude-plugin/hooks/` is
never mentioned. Does the shipped layout load at all?

## Method

Two throwaway plugins in the session scratchpad, identical except for the
hooks file location, each with one SessionStart command hook writing a
unique marker file into `$CLAUDE_PROJECT_DIR`:

| plugin | hooks file | command |
|---|---|---|
| hk-a | `.claude-plugin/hooks/hooks.json` | `echo MARK > "$CLAUDE_PROJECT_DIR/marker-a.txt"` |
| hk-b | `hooks/hooks.json` | `echo MARK > "$CLAUDE_PROJECT_DIR/marker-b.txt"` |

Both JSON files validated with `JSON.parse` before the run. Fresh `git init`
consumer repo. Command:

```
claude -p --plugin-dir <hk-a> --plugin-dir <hk-b> --max-budget-usd 0.5 --model haiku "Reply with exactly: OK"
```

## Result

```
OK
=== markers ===
.../repoC/marker-b.txt
```

`marker-a.txt` absent. **Only `hooks/hooks.json` is discovered.**

## Corroborating evidence

- runner@astra 0.78.0 is enabled on this host and ships
  `.claude-plugin/hooks/hooks.json` (same layout as devcrew). Its SessionStart
  `hooks/bootstrap-context.mjs:62` writes a bootstrap block to stdout
  unconditionally; this session's SessionStart output contained only caveman
  and superpowers blocks.
- crew@astra 0.67.0 ships `hooks/hooks.json` and demonstrably ran this
  session (`.claude/state/checkpoint-cadence/<session>.json` written by its
  checkpoint-cadence hook).
- Earlier runs with `--plugin-dir C:\work\mega\devcrew` and without it both
  produced `.claude/logs/events.jsonl` in the scratch repo — written by the
  installed crew 0.67.0 `log_event.sh`, not by devcrew — hence the need for
  the unique-marker test.

## Consequence

For every consumer on devcrew 1.1.0, **no devcrew hook runs**: not the
gate guard, not the pre-push gate, not guard-feat-dispatch, not telemetry.
The 2026-11-05 smoke baseline invoked hook scripts by hand with `bun`, so it
measured crash-on-missing-deps but never tested discovery. The node_modules
crash (audit #41) is real but second-order: fixing it alone changes nothing
for consumers while the file sits under `.claude-plugin/`.

This also means the repo's own dogfood hooks (`.claude/settings.json`,
12 entries) are what has been enforcing anything locally, and that the
hooks.json path census in `docs/planning/hooksjson-crew-path-inventory.json`
(gate 9) and `docs/ci-gates.md:66` encode the wrong location.

## Follow-up

File as a P0 FEAT ahead of FEAT-026: move to `hooks/hooks.json` (or declare
`"hooks": "./.claude-plugin/hooks/hooks.json"` in plugin.json — the manifest
key form is documented), update the inventory + validators, and make
FEAT-022's smoke test assert discovery, not just execution. Re-check on a
CLI >= 2.1.295 before closing, in case discovery differs by version.
