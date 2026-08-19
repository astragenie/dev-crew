---
name: learn
description: Log an operational learning to the persistent learnings store (.claude/artifacts/loop/learnings.jsonl). Use mid-session when you observe something worth preserving for future sessions.
auto_execute_steps: false
---

# Loop Learn

Log an operational learning to `.claude/artifacts/loop/learnings.jsonl`.
Use this mid-session whenever you observe something that would help future
agent sessions avoid a pitfall or use a better approach.

`startSlice` computes a `learningsDigest` field (the last 3 recent
learnings) at slice start, but today that digest is only returned as a
sibling JSON field on the `startSlice` result — it is **not** spliced
into the builder's `dispatchInstruction` string, so the agent does not
yet inherit it automatically. That wiring is tracked as FEAT-219
SLICE-3. Until it lands, pull recent learnings into context manually
via `learnings recent` (below) or `/devcrew:lessons-recent`.

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "<short-key>" \
  --insight "<what you observed>" \
  [--confidence 0.0-1.0] \
  [--slice SLICE-NN]
```

## Parameters

- `--key` (required) — short machine-readable tag, e.g. `tsc-compile-drift`,
  `eslint-complexity-cap`, `test-isolation`
- `--insight` (required) — human-readable observation, one or two sentences
- `--confidence` (optional) — float 0–1 indicating how confident you are;
  omit when uncertain
- `--slice` (optional) — the slice ID where this learning was observed,
  e.g. `SLICE-08`

## Example

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "tsc-compile-drift" \
  --insight "Always recompile after TypeScript edits; CI drift guard will fail otherwise" \
  --confidence 0.95 \
  --slice SLICE-08
```

Returns the written record with `{ id, timestamp, key, insight, confidence, source }`.

## Viewing recent learnings

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings recent \
  --repo "$PWD" \
  --limit 5
```

Returns `{ count, items, digest }` where `digest` is a markdown block ready
to paste into agent context.

## When to log a learning

- You discover a non-obvious constraint (lint cap, compile step, path pattern)
- A test or lint error reveals a repo-specific convention not documented elsewhere
- A subagent dispatch pattern works significantly better than another
- You resolve a blocker that took time to diagnose and want the next session
  to skip that investigation
