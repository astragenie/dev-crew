---
name: cost-setup
description: Seed or migrate both cost-related config blocks in one pass — .claude/loop.json's loop.cost.* (ceiling + regression) and .claude/crew.json's features block (cost-hygiene, redundant-read-stop, shell-preflight, subagent-inline-warn). Idempotent.
auto_execute_steps: true
---

# Cost Setup

Configure both of dev-crew's cost-related config surfaces for this repo in
one pass.

## Step 1 — Loop cost config (.claude/loop.json)

Seed or migrate the cost-related config keys in `.claude/loop.json`.

### What it does

- Creates `loop.cost.ceilingUsd` and `loop.cost.regression.{multiplier,window,minSamples}` if missing.
- Migrates legacy flat keys to the nested shape and deletes the originals:
  - `loop.costSliceCeiling` → `loop.cost.ceilingUsd`
  - `loop.costRegressionMultiplier` → `loop.cost.regression.multiplier`
  - `loop.costRegressionWindow` → `loop.cost.regression.window`
  - `loop.costRegressionMinSamples` → `loop.cost.regression.minSamples`
  - `loop.costRegressionMode` → `loop.cost.regression.mode`
  - `loop.costMedianUsdPerPoint` → `loop.cost.regression.medianUsdPerPoint`
  - `loop.costProject` → `loop.cost.regression.project`
  - `loop.costProjectAliases` → `loop.cost.regression.projectAliases`
- Drops `loop.costStopThreshold` entirely. It had confusingly dual semantics
  (max plan count in auto-walker vs HIGH cost-alert tolerance in
  stop-conditions). The plan-count cap is gone; HIGH cost alerts are now
  advisory-only (mirror cost-regression).

### Defaults applied when nothing set yet

| Key | Default |
|---|---|
| `loop.cost.ceilingUsd` | `75` |
| `loop.cost.regression.multiplier` | `3.0` |
| `loop.cost.regression.window` | `5` |
| `loop.cost.regression.minSamples` | `3` |

### Usage

Run once (idempotent — safe to re-run):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD"
```

Override one or more values at the same time:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD" \
  --features "ceilingUsd=200,regressionMultiplier=2.5,regressionWindow=7"
```

Project-scope cost evaluation (multi-project workstation):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD" \
  --features "project=astrarunner,projectAliases=runner-hardening|runner-feat-202"
```

### Output

JSON with four fields:

- `configPath` — absolute path to `.claude/loop.json`
- `written` — `true` if the file changed, `false` if already current
- `migratedLegacyKeys` — `string[]` of flat keys that were rewritten + deleted
- `effective` — `{ ceilingUsd, regression: {...} }` final values

## Step 2 — Crew gating features (.claude/crew.json)

Configure the crew plugin's cost-hygiene and gating features for this repo.

This writes `.claude/crew.json` with a `features` block that mirrors the
defaults declared in the plugin's `FEATURES` registry. Features default to
**on**. To disable one, pass `--features <name>=off`.

Replaces the legacy env-var toggles (`CREW_COST_HYGIENE`,
`CREW_TOOL_PREFLIGHT`, `CREW_SUBAGENT_INLINE_THRESHOLD`). Those env vars are
gone — control is config-only now.

### Usage

1. Run the setup (idempotent — safe to re-run):
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/crew.mts" cost-setup --repo "$PWD"
   ```

2. To override one or more feature defaults at the same time:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/crew.mts" cost-setup --repo "$PWD" --features "cost-hygiene=off,shell-preflight=off"
   ```

3. To inspect the current registry without writing:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/crew.mts" features-list
   ```

### Output

JSON with three fields:

- `configPath` — absolute path to `.claude/crew.json`
- `written` — `true` if the file was changed, `false` if already current
- `features` — `[{ name, enabled, default }]` for every registered feature

### What gets written

A `features` block in `.claude/crew.json`:

```json
{
  "features": {
    "cost-hygiene":         { "enabled": true },
    "redundant-read-stop":  { "enabled": true },
    "shell-preflight":      { "enabled": true },
    "subagent-inline-warn": { "enabled": true }
  }
}
```

User-set values for fields outside `features` are preserved.

## After running

Both steps are independent and idempotent — running one does not require
the other to have run first, but `/devcrew:cost-setup` runs both by
default. Verify hooks pick up the change immediately — open a new tool call
(Read, Edit, Bash, etc.) and check the `[features] <name>: enabled|disabled`
line on stderr. No restart needed.
</content>
