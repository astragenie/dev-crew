---
name: loop:triage
description: Triage every pending backlog FEAT — PM-first (5-dimension LLM scoring), regex fallback on PM error/budget exceed/validation fail. Dispatched by Cross-Slice Continuation when pending/ is non-empty. Hidden internal command `backlog triage` still runs the regex baseline.
---

# Triage

PM-first triage with regex fallback. Single public command for the loop.

## Inputs

- Pending FEAT ids enumerated from disk (deterministic; PM never invents ids).
- Per-batch cost budget from `.claude/loop.json`:
  - `loop.triageBudgetUsdPerBatch` (default 5.0)
  - `loop.triageBudgetTokensPerBatch` (default 500000)
  - `loop.triageFallbackOnBudgetExceeded` (default true)

## Steps

1. **Enumerate pending ids deterministically.**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog list-pending-ids --repo "$PWD"
   ```
   Parse `{ "ids": ["FEAT-NNN", ...] }`. If `ids.length === 0`, return `{ triaged: 0, path: "noop" }` and stop.

2. **Capture cost baseline** from the most recent cost-report or cost-advisor sample. Record `(baselineUsd, baselineTokens)`.

3. **Resolve PM skills via preset.** Before dispatching, run:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" resolve-skills \
     --variant pm \
     --preset "${CLAUDE_PLUGIN_ROOT}/scripts/presets/$(jq -r .preset .claude/loop.json).json" \
     --override .claude/loop.json
   ```

   On exit 0, capture `.dispatchInstructionBlock` from the JSON output.
   On exit 2, proceed without the block (PM falls back to its baked-in
   "Required skills" list in `agents/pm.md`). On exit 1, halt and
   surface the stderr.

4. **Dispatch `loop:pm` agent.** Prepend the resolved-skills block (when
   present) to the prompt so PM invokes the right `Skill` tools before
   scoring. Prompt MUST include the explicit id list:

   ```
   <dispatchInstructionBlock from step 3 — omit if exit was 2>

   Score the following FEATs (and ONLY these): FEAT-XXX, FEAT-YYY, ...
   For each, return the JSON contract from `agents/pm.md`.
   Do not return entries for any other id.
   ```

5. **Validate PM output.** For each returned result:
   - `result.id` MUST be in the input id list. Reject otherwise.
   - All 5 dimension scores MUST be numeric in `[0, 1]`. Reject otherwise.
   - Required fields present (`scores`, `compositePriority`, `autonomousSafe`, `reasoning`).

6. **Check budget delta.** After PM completes, sample cost again. If `(currentUsd - baselineUsd) > triageBudgetUsdPerBatch` OR `tokens > triageBudgetTokensPerBatch`, mark `BudgetExceeded` and go to fallback (step 8).

7. **Write PM scores** via the existing CLI:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog pm-write \
     --id FEAT-NNN \
     --scores '{"customer_impact":0.8,...}' \
     --priority P1 \
     --autonomous-safe true \
     --evidence "..." \
     --reasoning "..."
   ```
   Then move each entry pending → triaged.
   Write a PM review artifact per FEAT to `.claude/artifacts/loop/pm-reviews/`.
   Return `{ triaged: N, path: "pm", results: [...] }`.

8. **Fallback (PM error | BudgetExceeded | ValidationFail):**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog triage --repo "$PWD"
   ```
   This invokes the regex `triagePending()` deterministically. It writes the same `pm_*` frontmatter keys with 0.5 defaults and moves entries pending → triaged.

9. **Log fallback to audit JSONL** at `.claude/artifacts/loop/auto-dispatch.jsonl`:
   ```json
   { "event": "triage_fallback", "reason": "<pm_error|budget_exceeded|validation_fail>", "cost_usd": 0.0, "ids": ["FEAT-NNN", ...] }
   ```

10. **Tag `triage_notes`** on every entry — `via=pm` or `via=regex_fallback (reason=...)`.

## Return contract

```json
{
  "triaged": <count>,
  "path": "pm" | "regex_fallback" | "noop",
  "fallback_reason": "<reason or null>",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

## When this runs

- **Automatically:** Cross-Slice Continuation HARD RULE dispatches when `pending/` is non-empty.
- **Manually:** `/loop:triage`.

## Pattern alert

If the fallback rate exceeds 50% over a rolling window of 10 runs, raise a warn-severity pattern alert. Sustained PM degradation is a real signal, not background noise.
