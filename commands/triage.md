---
description: Triage every pending backlog FEAT using the PM agent with 5-dimension scoring; falls back to deterministic regex baseline on PM error or budget exceed.
---

# Triage

Run the `loop:triage` skill: PM-first scoring with deterministic regex fallback. Single public triage command.

## Usage

```bash
/loop:triage
```

No arguments. Skill reads `pending/` directory, dispatches PM, falls through to regex on error.

## Returns

```json
{
  "triaged": <count>,
  "path": "pm" | "regex_fallback" | "noop",
  "fallback_reason": "<reason or null>",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

## Auto-invocation

Cross-Slice Continuation HARD RULE invokes this command automatically when `docs/backlog/pending/` is non-empty.

## Cost guard

Per-batch budget (`.claude/loop.json`):
- `loop.triageBudgetUsdPerBatch` (default 5.0)
- `loop.triageBudgetTokensPerBatch` (default 500000)
- `loop.triageFallbackOnBudgetExceeded` (default true)

## Fallback path

On PM error, budget exceeded, or output validation fail, the skill calls the internal CLI subcommand `node scripts/loop.mjs backlog triage` which runs the deterministic regex baseline. The fallback writes the same frontmatter shape with 0.5 defaults.

Audit trail: every fallback appends to `.claude/artifacts/loop/auto-dispatch.jsonl` with `event: "triage_fallback"`. Pattern alert fires when fallback rate exceeds 50% over rolling 10 runs.
