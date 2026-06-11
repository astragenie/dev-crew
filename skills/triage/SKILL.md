---
name: loop:triage
description: Triage every pending backlog FEAT via the PM agent (5-dimension LLM scoring). PM-only — on agent error, validation failure, or budget exceedance, halt and surface to the operator. The regex fallback path was removed 2026-06-11.
---

# Triage

PM-only triage. Single public command for the loop.

## Inputs

- Pending FEAT ids enumerated from disk (deterministic; PM never invents ids).
- Per-batch cost budget from `.claude/loop.json`:
  - `loop.triageBudgetUsdPerBatch` (default 5.0)
  - `loop.triageBudgetTokensPerBatch` (default 500000)

## Steps

1. **Enumerate pending ids deterministically.**
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog list-pending-ids --repo "$PWD"
   ```
   Parse `{ "ids": ["FEAT-NNN", ...] }`. If `ids.length === 0`, return `{ triaged: 0, path: "noop" }` and stop.

2. **Capture cost baseline** from the most recent cost-report or cost-advisor sample. Record `(baselineUsd, baselineTokens)`.

3. **Resolve PM skills via preset.** Before dispatching, run:

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" resolve-skills \
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
   - **Decline contract**: if `compositePriority` is `P4`, the result MUST include `declined_per: [<clause-id>, ...]` citing at least one clause ID from `CLAUDE.md`. Missing `declined_per` = validation fail → halt (step 8). See `agents/pm.md` § "Decline contract" for the full clause registry.

6. **Check budget delta.** After PM completes, sample cost again. If `(currentUsd - baselineUsd) > triageBudgetUsdPerBatch` OR `tokens > triageBudgetTokensPerBatch`, mark `BudgetExceeded` and halt (step 8).

7. **Write PM scores** via the existing CLI:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog pm-write \
     --id FEAT-NNN \
     --scores '{"customer_impact":0.8,...}' \
     --priority P1 \
     --autonomous-safe true \
     --evidence "..." \
     --reasoning "..."
   ```
   When the FEAT is currently under `pending/`, `pm-write` also moves it
   to `triaged/` and sets `status: triaged` in the same call — no
   separate `mv` step required (since v0.28.2). Triaged entries that get
   re-scored stay in place.
   Write a PM review artifact per FEAT to `.claude/artifacts/loop/pm-reviews/`.
   Return `{ triaged: N, path: "pm", results: [...] }`.

8. **Halt on PM error | BudgetExceeded | ValidationFail.** No fallback. Surface to operator with a structured message:

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

   Operator decides next step: re-run with adjusted budget, switch PM
   model, hand-score the failing FEAT via `/loop:backlog pm-write`, or
   skip the failing id and re-trigger with the remainder.

9. **Tag `triage_notes`** on every entry — `via=pm` (the only path now).

## Return contract

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
  "halt_detail": "<...>",
  "results": [...written so far...]
}
```

## When this runs

- **Automatically:** Cross-Slice Continuation HARD RULE dispatches when `pending/` is non-empty.
- **Manually:** `/loop:triage`.

## Why no fallback

The regex-fallback path (formerly `bun src/scripts/loop.mts backlog triage`) was removed on 2026-06-11. Reasons:

- **Quality drift**: regex scores defaulted every PM dimension to 0.5 — meaningless signal. The loop kept walking with bogus priorities, masking the upstream PM failure instead of forcing a fix.
- **Operator surprise**: silent fallback meant slice budgets and priority routing came from a heuristic the operator never asked for.
- **Maintenance burden**: two scoring paths to keep in sync; hint regexes (`BUG_HINTS`, `URGENT_HINTS`, etc.) drifted from real backlog vocabulary.

PM failure is a real signal — halt and let the operator see it.
