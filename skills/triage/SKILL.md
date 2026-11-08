---
name: triage
prompt_id: triage
version: 1.0.0
tier: workflow
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

1. **Enumerate ids deterministically.**

   Default (no flags): glob `pending/` only.
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" backlog list-pending-ids --repo "$PWD"
   ```

   When the operator invokes `/devcrew:triage --include-triaged` or
   `/devcrew:retriage --include-triaged`, append the flag to the CLI call:

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" backlog list-pending-ids --include-triaged --repo "$PWD"
   ```

   This adds FEATs from `triaged/` to the id list. PM overwrites the existing
   `pm_*` fields on those FEATs in place (no state move). FEAT-194 / SLICE-110.

   When the operator invokes `/devcrew:triage --ids FEAT-166,FEAT-182,FEAT-186`
   (FEAT-201), pass the ids flag instead:

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" backlog list-pending-ids --ids FEAT-166,FEAT-182,FEAT-186 --repo "$PWD"
   ```

   This returns ONLY those ids (all must exist in `triaged/`). On missing or
   malformed ids the CLI exits non-zero (code 1) and surfaces the missing-id
   list in the stderr error message — halt immediately and surface the error to
   the operator. (The `halt_reason` field is available to library callers of
   `listPendingFeatureIds`, not in CLI output.) `--ids` and `--include-triaged`
   are mutually exclusive; combining them exits code 2.

   Parse `{ "ids": ["FEAT-NNN", ...] }`. If `ids.length === 0`, return `{ triaged: 0, path: "noop" }` and stop.

2. **Capture cost baseline** from the most recent cost-report or cost-advisor sample. Record `(baselineUsd, baselineTokens)`.

3. **Resolve PM skills via preset.** Before dispatching, run (no `jq`
   dependency — read the preset name with `bun -e` instead, portable to
   the Windows/no-jq host):

   ```bash
   PRESET_NAME=$(bun -e 'console.log(JSON.parse(require("node:fs").readFileSync(".claude/loop.json","utf8")).preset)')
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" resolve-skills \
     --variant pm \
     --preset "${CLAUDE_PLUGIN_ROOT}/scripts/presets/${PRESET_NAME}.json" \
     --override .claude/loop.json
   ```

   On exit 0, capture `.dispatchInstructionBlock` from the JSON output.
   On exit 2, proceed without the block (PM falls back to its baked-in
   "Required skills" list in `agents/pm.md`). On exit 1, halt and
   surface the stderr.

4. **Dispatch `devcrew:pm` agent.** Prepend the resolved-skills block (when
   present) to the prompt so PM invokes the right `Skill` tools before
   scoring. Prompt MUST include the explicit id list AND a results-file
   path (DEC-058 — PM's `Write` grant is scoped to this one file, under
   `.claude/artifacts/loop/pm-reviews/`):

   ```
   <dispatchInstructionBlock from step 3 — omit if exit was 2>

   Score the following FEATs (and ONLY these): FEAT-XXX, FEAT-YYY, ...
   For each, return the JSON contract from `agents/pm.md`.
   Do not return entries for any other id.

   As each FEAT finishes scoring, APPEND its JSON result object to a
   top-level JSON array written to
   `.claude/artifacts/loop/pm-reviews/<ISO-timestamp>-triage-results.json`
   (rewrite the full array on every append — do not wait for the whole
   batch before the first write, so a truncated final message still
   leaves recoverable results on disk per FEAT-214 AC-5). State the exact
   file path in your final message.
   ```

5. **Validate PM output.** For each returned result:
   - `result.featureId` MUST be in the input id list. Reject otherwise.
   - All 5 dimension scores (`scores.customer_impact`, `.effort_estimate`, `.strategic_alignment`, `.technical_risk`, `.dependency_depth`) MUST be numeric in `[0, 1]`. Reject otherwise.
   - Required fields present (`scores`, `compositePriority`, `autonomousSafe`, `reasoning`) — these are the literal field names PM emits per `agents/pm.md`'s output contract. PM never emits a bare `id` or `evidence` key; do not validate against those stale names.
   - **Decline contract**: if `compositePriority` is `P4`, the result MUST include `declined_per: [<clause-id>, ...]` citing at least one clause ID from `CLAUDE.md`. Missing `declined_per` = validation fail → halt (step 8). See `agents/pm.md` § "Decline contract" for the full clause registry.

6. **Check budget delta.** After PM completes, sample cost again. If `(currentUsd - baselineUsd) > triageBudgetUsdPerBatch` OR `tokens > triageBudgetTokensPerBatch`, mark `BudgetExceeded` and halt (step 8).

7. **Commit PM scores** via the new CLI (DEC-058 hybrid write-path — the
   results file from step 4 is the only thing PM itself writes; this
   subcommand is the sole writer of backlog frontmatter):

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" backlog pm-apply \
     --file ".claude/artifacts/loop/pm-reviews/<ISO-timestamp>-triage-results.json" \
     --ids FEAT-XXX,FEAT-YYY,...
   ```

   `pm-apply` re-validates every entry against the same contract as step 5
   (defense in depth — an operator can also run it standalone against a
   recovered results file after a crash), then per entry: moves
   `pending/` → `triaged/` (or updates in place when already `triaged/`,
   since v0.28.2 behavior), writes `pm_*` frontmatter, appends
   Given-When-Then ACs / proposed slices to the FEAT body when the entry
   carries them, and writes a PM review artifact to
   `.claude/artifacts/loop/pm-reviews/`. A failing entry writes NOTHING
   for that entry — inspect `failures` in the JSON output; re-running
   against the same file is safe (already-applied entries are untouched).
   Omit `--ids` to default to all currently pending FEATs.
   Returns `{ triaged: N, path: "pm-apply", results: [...], failures: [...] }`.

8. **Halt on PM error | BudgetExceeded | ValidationFail.** No fallback.
   `pm-apply`'s own per-entry validation (step 7) is the last line of
   defense — a malformed entry never reaches disk. Surface any CLI-level
   failure (PM dispatch error, budget exceeded, or a non-empty
   `pm-apply` `failures` array) to the operator with a structured message:

   ```json
   {
     "triaged": <count-applied-before-halt>,
     "path": "pm",
     "halted": true,
     "halt_reason": "<pm_error|budget_exceeded|validation_fail>",
     "halt_detail": "<stderr | pm-apply failures[] | usd delta>",
     "results": [...applied so far...]
   }
   ```

   Operator decides next step: re-run with adjusted budget, switch PM
   model, hand-fix the failing entries in the results file and re-run
   `backlog pm-apply --file <path>`, or drop the failing id from `--ids`
   and re-trigger with the remainder.

9. **Tag `triage_notes`** on every entry — `via=pm` (the only path now).

## Return contract

```json
{
  "triaged": <count>,
  "path": "pm",
  "results": [{ "featureId": "FEAT-NNN", "filePath": "...", "movedToTriaged": true }]
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
- **Manually:** `/devcrew:triage`.

## Why no fallback

The regex-fallback path (formerly `bun src/scripts/loop.mts backlog triage`) was removed on 2026-06-11. Reasons:

- **Quality drift**: regex scores defaulted every PM dimension to 0.5 — meaningless signal. The loop kept walking with bogus priorities, masking the upstream PM failure instead of forcing a fix.
- **Operator surprise**: silent fallback meant slice budgets and priority routing came from a heuristic the operator never asked for.
- **Maintenance burden**: two scoring paths to keep in sync; hint regexes (`BUG_HINTS`, `URGENT_HINTS`, etc.) drifted from real backlog vocabulary.

PM failure is a real signal — halt and let the operator see it.
