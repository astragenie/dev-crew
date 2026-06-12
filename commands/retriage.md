---
description: Opt-in higher-quality triage. Dispatches PM with an AC-clarity-gate pre-flight — when a FEAT has vague AC, PM dispatches loop:spec-writer to rewrite the AC in Given-When-Then form, waits, re-reads, and scores against the cleaned AC. Original /loop:triage stays unchanged (cheaper, faster, suitable when AC are already concrete).
---

# Retriage (FEAT-193 / SLICE-109)

Higher-quality alternative to `/loop:triage`. Same 5-dimension scoring contract, but PM normalizes vague AC before scoring so the dimensions (especially `effort_estimate` and `technical_risk`) reflect the real shape of the work.

## When to use

- FEATs added from external drafts (`/loop:backlog-add --body "..."` with rough text).
- FEATs previously triaged with `composite_priority: "needs-review"` that were never re-scored.
- Any FEAT where the operator suspects AC are vague but doesn't want to hand-write a SPEC.

When the AC are already concrete (measurable values, Given-When-Then, edge cases covered), use `/loop:triage` instead — it's cheaper (one PM dispatch per FEAT vs. PM + possible spec-writer).

## Usage

```bash
/loop:retriage
/loop:retriage --include-triaged    # also re-score FEATs already in triaged/
```

Default: reads `pending/` directory, dispatches PM with the pre-flight instruction below per FEAT, halts on error. With `--include-triaged`, the skill also enumerates ids from `triaged/` and re-runs the AC-clarity gate + scoring on each — PM overwrites the existing `pm_*` + composite + `autonomous_safe` + `composite_priority`. FEATs in `triaged/` STAY in `triaged/` (no state move). Use after `loop:spec-writer` rewrites AC on an already-triaged FEAT, or to validate the retriage cost/quality model on a known batch.

## PM dispatch — pre-flight contract

The slash command PREPENDS the following instruction block to the PM dispatch prompt. The base PM agent (`loop:pm`) is NOT modified; it reads the prepended block and follows the gate.

```
## AC clarity gate (PRE-FLIGHT — required before scoring)

Before emitting scores for THIS FEAT, run the following 7-step gate:

1. Read the FEAT body.
2. Check AC clarity against the `loop:authoring-slices` checklist — testable
   with concrete values, evidence-backed, edge + error coverage.
3. If AC PASS the clarity check, skip to step 7 (score directly).
4. If AC FAIL the clarity check, dispatch the `loop:spec-writer` agent
   with this prompt:
   > Rewrite the acceptance criteria for FEAT-NNN in Given-When-Then form
   > with concrete values, edge cases, and error coverage. Edit the FEAT
   > body in place at `<absolute path to the FEAT file>`. Return when done.
5. Wait for the spec-writer dispatch to return.
6. Re-read the FEAT body (now with rewritten AC). If spec-writer dispatch
   FAILED (error, timeout, parse failure, no edits), set
   `composite_priority: "needs-review"` and explain in `scopeNotes` that
   spec-writer pre-flight failed and the operator must intervene. Skip the
   rest of this gate; emit the partial JSON contract with the
   needs-review verdict.
7. Score the FEAT against the (possibly rewritten) AC. Emit the full
   5-dimension JSON contract per `agents/pm.md`. Include the new field
   `acClarity`:
     - `{ "rewrite": false }` when step 3 passed (AC already clear).
     - `{ "rewrite": true, "rewriteDispatchOk": true }` when steps 4-6
       succeeded.
   On the needs-review escalation, emit
   `acClarity: { "rewrite": true, "rewriteDispatchOk": false }`.
```

## Returns

Same shape as `/loop:triage`, with one new field per result:

```json
{
  "triaged": <count>,
  "path": "pm",
  "results": [
    {
      "id": "FEAT-NNN",
      "priority": "P1",
      "autonomous_safe": true,
      "acClarity": { "rewrite": false }
    },
    {
      "id": "FEAT-MMM",
      "priority": "needs-review",
      "autonomous_safe": false,
      "acClarity": { "rewrite": true, "rewriteDispatchOk": false }
    }
  ]
}
```

## Failure escalation

When `loop:spec-writer` dispatch fails mid-flight (error, timeout, no edits returned), PM MUST set `composite_priority: "needs-review"` and explain in `scopeNotes`. The FEAT does NOT get auto-promoted by the walker until an operator resolves the AC manually or re-runs `/loop:retriage` after a fix.

## Cost guard

Same per-batch budget as `/loop:triage` (`.claude/loop.json::loop.triageBudgetUsdPerBatch`, default 5.0). Worst case: 2× the per-FEAT cost (PM dispatch + spec-writer dispatch). Halt fires on budget overrun.

## Back-compat with `/loop:triage`

- `/loop:triage` is the unchanged cheap default — PM-only scoring on whatever AC exist.
- `/loop:retriage` is the opt-in higher-quality alternative — PM + inline spec-writer pre-flight when AC are vague.
- `/loop:intake` Phase 1 still calls `/loop:triage`. A future FEAT may swap it for `/loop:retriage` once we measure the cost vs. quality trade-off.

## Refs

- `agents/pm.md` — base PM agent contract.
- `agents/spec-writer.md` — spec-writer agent (Given-When-Then AC rewriter).
- `skills/authoring-slices/SKILL.md` — AC clarity checklist.
- `commands/triage.md` — legacy cheap path.
- `commands/intake.md` — Phase 1 / Phase 2 orchestration.
