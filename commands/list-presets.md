---
name: list-presets
description: Show built-in loop presets with their stack defaults.
auto_execute_steps: false
---

# List Autonomous Loop Presets

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" list-presets
```

Returns an array of `{ name, description }` for each `scripts/presets/*.json`
shipped by the plugin.

Built-in presets:

- `dotnet-python` — C# .NET + Aspire local orchestration + Python
  LangGraph agents + Terraform infra. **Default** stack for AstraGenie-style
  monorepos (split: FE React + BE .NET).
- `dotnet-only` — C# .NET backend only. No frontend, Aspire, or Python
  sidecars. Standalone .NET service or library repos.
- `dotnet-react` — C# .NET backend + React / Vite frontend. One solution,
  one dashboard.
- `dotnet-typescript-vue` — C# .NET backend + Vue 3 / Vite (TypeScript)
  frontend + .NET Aspire orchestration.
- `typescript-plugin-dev` — TypeScript Claude Code plugin repos. Bun test
  runner + manifest / content-length validators.
- `typescript-service` — TypeScript Node service / daemon. Fastify +
  better-sqlite3 / sqlite-vec, `tsc` build, Vitest, JSON-schema (ajv)
  contracts, OS-service deployment. Fits astramemory-local.

Pick the preset closest to the repo's stack at install time, then override
specific stage commands in `.claude/loop.json`. Each stage in
`stack.*` accepts a `{ cmd, args, cwd? }` triple — the args array is what
makes the phase-gate runner injection-safe.

To add a new preset:

1. Author `scripts/presets/<name>.json` mirroring the structure of
   `dotnet-python.json` (split BE/FE) or `typescript-service.json`
   (single-surface).
2. Reinstall the plugin so the cache picks up the new preset, or copy the
   preset file into the plugin cache directly during dev.
3. Reference the new preset with `--preset <name>` at install time.
