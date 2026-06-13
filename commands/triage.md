---
name: triage
description: Triage every pending backlog FEAT using the PM agent (5-dimension scoring). PM-only — on PM error, validation failure, or budget exceedance, halt and surface to the operator.
auto_execute_steps: false
---

# Triage

Run the `loop:triage` skill: PM-only scoring. Single public triage command.

## Usage

```bash
/loop:triage
/loop:triage --include-triaged    # also re-score FEATs already in triaged/
```

Default: skill reads `pending/` directory, dispatches PM, halts on error. With `--include-triaged`, the skill also enumerates ids from `triaged/` and re-scores them in place — PM overwrites the existing `pm_*` fields + `composite_score` + `autonomous_safe` + `composite_priority`. FEATs in `triaged/` STAY in `triaged/` (no state move). Use after FEAT body edits, after upstream blockers clear, or to validate scoring quality. FEAT-194 / SLICE-110.

## Returns

```json
{
  "triaged": <count>,
  "path": "pm",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

On halt:

```json
{
  "triaged": <count-written-before-halt>,
  "path": "pm",
  "halted": true,
  "halt_reason": "<pm_error|budget_exceeded|validation_fail>",
  "halt_detail": "<stderr | dimension that failed validation | usd delta>",
  "results": [...written so far...]
}
```

## Auto-invocation

Cross-Slice Continuation HARD RULE invokes this command automatically when `pending/` is non-empty.

## Cost guard

Per-batch budget (`.claude/loop.json`):
- `loop.triageBudgetUsdPerBatch` (default 5.0)
- `loop.triageBudgetTokensPerBatch` (default 500000)

On exceedance the skill halts (no silent fallback). Operator decides: re-run with adjusted budget, switch PM model, or hand-score via `/loop:backlog pm-write`.

## Why no fallback

The regex fallback path (`bun src/scripts/loop.mts backlog triage`) was removed 2026-06-11. Defaulting every PM dimension to 0.5 produced meaningless signal that masked upstream failures and silently polluted slice routing. PM failure is now a surfaced halt; the operator sees it.
