---
name: gepa-history
description: Print recent GEPA trials for an agent (from .claude/artifacts/crew/gepa/trials/<agent>.jsonl)
auto_execute_steps: true
allowed-tools: Bash
---

# /devcrew:gepa-history

Show recent GEPA trials for the named agent. Reads from the local fileStore JSONL log under `.claude/artifacts/crew/gepa/trials/`.

## Usage

```
/devcrew:gepa-history <agent> [--source eval|captured|soak] [--limit N]
```

## Behavior

The command shells to `node scripts/crew.ts gepa-history` with the given args. Output is one tabular line per trial, sorted by `created_at` desc:

```
trial_id | source | pass | score | cost_usd | latency_ms | created_at
```

Exits 0 on success, 2 on bad args, 1 on internal error.
