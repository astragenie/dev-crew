---
name: cost-setup
description: Seed or migrate the cost config block in .claude/loop.json. Idempotent. Auto-rewrites legacy flat keys (costSliceCeiling, costStopThreshold, costRegression*) into the nested loop.cost.* shape.
---

# Loop Cost Setup

Seed or migrate the cost-related config keys in `.claude/loop.json`.

## What it does

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

## Defaults applied when nothing set yet

| Key | Default |
|---|---|
| `loop.cost.ceilingUsd` | `75` |
| `loop.cost.regression.multiplier` | `3.0` |
| `loop.cost.regression.window` | `5` |
| `loop.cost.regression.minSamples` | `3` |

## Usage

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

## Output

JSON with four fields:

- `configPath` — absolute path to `.claude/loop.json`
- `written` — `true` if the file changed, `false` if already current
- `migratedLegacyKeys` — `string[]` of flat keys that were rewritten + deleted
- `effective` — `{ ceilingUsd, regression: {...} }` final values
