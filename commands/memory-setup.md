---
name: memory-setup
description: Seed or migrate the memory config block in .claude/loop.json. Idempotent. Writes memory.enabled, memory.project (derived from repo name), memory.profile.*, and memory.feedback.creditLoop so a repo matches the validate-memory-config.mts contract.
auto_execute_steps: true
---

# Loop Memory Setup

Seed the memory-related config keys in `.claude/loop.json` so a consumer
repo passes the `validate-memory-config.mts` drift guard (FEAT-274 —
13/15 fleet repos shipped with no memory block at all, the rollout gap
behind the 1.6% usefulness finding in runner-plugin#525).

## What it does

- Creates `memory.enabled`, `memory.project`, `memory.profile.{enabled,
  topLessons,timeoutMs}`, and `memory.feedback.{enabled,timeoutMs,
  creditLoop.{enabled,k}}` if missing.
- Leaves any already-set value alone — including an explicit `false` — and
  preserves any custom keys already present under `memory.*`. Re-running
  against an unchanged config is a no-op (mirrors `runner:cost-setup`'s
  idempotent-migrate behavior).

## Defaults applied when nothing is set yet

| Key | Default |
|---|---|
| `memory.enabled` | `true` |
| `memory.project` | basename of the repo directory |
| `memory.profile.enabled` | `true` |
| `memory.profile.topLessons` | `10` |
| `memory.profile.timeoutMs` | `20000` |
| `memory.feedback.enabled` | `true` |
| `memory.feedback.timeoutMs` | `20000` |
| `memory.feedback.creditLoop.enabled` | `true` |
| `memory.feedback.creditLoop.k` | `5` |

## Usage

Run once (idempotent — safe to re-run):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
```

Override one or more values at the same time:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD" \
  --features "project=my-repo,topLessons=15,creditLoopK=7"
```

Opt a repo out explicitly (respected on every future re-run, never
silently re-enabled):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD" \
  --features "enabled=false"
```

## Output

JSON with three fields:

- `configPath` — absolute path to `.claude/loop.json`
- `written` — `true` if the file changed, `false` if already current
- `effective` — `{ enabled, project, profile: {...}, feedback: {...} }`
  final values

## Validate the result

```bash
bun ./src/scripts/validate-memory-config.mts
```
