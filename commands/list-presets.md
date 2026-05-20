---
description: Show built-in autonomous-loop presets with their stack defaults.
---

# List Autonomous Loop Presets

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" list-presets
```

Returns an array of `{ name, description }` for each `presets/*.json` shipped
by the plugin.

v1 ships:

- `dotnet-aspire-python` — C# .NET + Aspire local orchestration + Python
  LangGraph agents + Terraform infra. Default stack for AstraGenie-style
  monorepos.

Pick the preset closest to the repo's stack at install time, then override
specific stage commands in `.claude/autonomous-loop.json`. Each stage in
`stack.*` accepts a `{ cmd, args, cwd? }` triple — the args array is what
makes the phase-gate runner injection-safe.

To add a new preset:

1. Author `presets/<name>.json` mirroring the structure of
   `dotnet-aspire-python.json`.
2. Reinstall the plugin so the cache picks up the new preset, or copy the
   preset file into the plugin cache directly during dev.
3. Reference the new preset with `--preset <name>` at install time.
