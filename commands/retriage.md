---
name: retriage
description: Opt-in higher-quality triage. Three-phase orchestrator — PM clarity check + score-or-flag, orchestrator fans out loop:spec-writer for flagged FEATs, PM re-scores against rewritten AC. Original /loop:triage stays unchanged (cheaper, faster, suitable when AC are already concrete).
auto_execute_steps: false
---

# Retriage (FEAT-193 / SLICE-109)

Higher-quality alternative to `/loop:triage`. Same 5-dimension scoring contract, but the slash command orchestrator splits the work into three phases so PM never has to dispatch sibling agents itself. This works around the PM-subagent runtime surface bug where `Agent` is not loadable via `ToolSearch` from inside a subagent.

## When to use

- FEATs added from external drafts (`/loop:backlog-add --body "..."` with rough text).
- FEATs previously triaged with `composite_priority: "needs-review"` that were never re-scored.
- Any FEAT where the operator suspects AC are vague but doesn't want to hand-write a SPEC.

When the AC are already concrete (measurable values, Given-When-Then, edge cases covered), use `/loop:triage` instead — cheaper (one PM dispatch per FEAT, no rewrite hop).

## Usage

```bash
/loop:retriage
/loop:retriage --include-triaged    # also re-score FEATs already in triaged/
```

Default: reads `pending/` directory. With `--include-triaged`, also enumerates ids from `triaged/`. FEATs in `triaged/` STAY in `triaged/` (no state move).

## Orchestration model

The slash command is the orchestrator. PM and spec-writer are bounded specialists; neither dispatches the other. Three phases run per batch.

### Phase A — PM clarity check + score-or-flag

For each FEAT in scope, dispatch `loop:pm` with the prompt block below PREPENDED to the standard scoring prompt. PM either scores against clear AC OR flags `status: "needs-rewrite"` without dispatching anything.

```
## AC clarity gate (PHASE A — flag-or-score)

For THIS FEAT:

1. Read the FEAT body at <absolute path>.
2. Check AC clarity against the `loop:authoring-slices` checklist —
   testable with concrete values, evidence-backed, edge + error coverage.
3. If AC PASS: score the FEAT against the 5-dimension contract per
   `agents/pm.md`. Persist scoring frontmatter (pm_*, composite_score,
   composite_priority, autonomous_safe). Emit:
     { "id": "...", "status": "scored", "priority": "P0|P1|P2|P3|P4",
       "autonomous_safe": <bool>, "compositeScore": <num>,
       "acClarity": { "rewrite": false } }
4. If AC FAIL: DO NOT dispatch any other agent. DO NOT write scoring
   frontmatter. Persist only `ac_clarity_status: failed` and a short
   `triage_notes` line. Emit:
     { "id": "...", "status": "needs-rewrite",
       "reason": "<one-sentence: what AC dimension fails>",
       "absolutePath": "<absolute path to the FEAT file>" }
```

PM tools required for phase A: `Read`, `Edit`, `Write` (Markdown), nothing else. No `Agent` surface needed.

### Phase B — orchestrator fans out spec-writer

The orchestrator collects every phase-A result with `status: "needs-rewrite"`. If the set is empty, skip to phase C summary.

Otherwise, dispatch `loop:spec-writer` in ONE message with PARALLEL Agent tool calls — one per flagged FEAT. Per-FEAT prompt:

```
Rewrite the acceptance criteria for FEAT-NNN in Given-When-Then form
with concrete values, edge cases, and error coverage. Edit the FEAT
body in place at `<absolute path>`. Follow the
`loop:authoring-slices` checklist. Do NOT touch frontmatter. Return
when done with a short JSON summary:
  { "id": "FEAT-NNN", "rewriteOk": <bool>, "criteriaWritten": <int> }
```

Per-FEAT outcomes:

- `rewriteOk: true` — proceeds to phase C.
- `rewriteOk: false` (or dispatch error / timeout / no edits) — orchestrator writes `composite_priority: needs-review` + `acClarity: { rewrite: true, rewriteDispatchOk: false }` to the FEAT frontmatter directly (no PM round-trip). FEAT excluded from phase C.

### Phase C — PM re-score against rewritten AC

For each phase-B success, dispatch `loop:pm` with the prompt block below PREPENDED to the standard scoring prompt. PM re-reads the FEAT (now with Given-When-Then AC) and scores.

```
## Re-score (PHASE C — post-rewrite scoring)

For THIS FEAT:

1. Re-read the FEAT body at <absolute path>. AC have been rewritten
   by `loop:spec-writer` since the previous PM pass.
2. Score the FEAT against the 5-dimension contract per `agents/pm.md`.
   Persist scoring frontmatter (pm_*, composite_score,
   composite_priority, autonomous_safe).
3. Emit:
     { "id": "...", "status": "scored", "priority": "P0|P1|P2|P3|P4",
       "autonomous_safe": <bool>, "compositeScore": <num>,
       "acClarity": { "rewrite": true, "rewriteDispatchOk": true } }
```

## Returns

Final summary printed by orchestrator:

```json
{
  "triaged": <count>,
  "path": "retriage",
  "results": [
    {
      "id": "FEAT-NNN",
      "priority": "P1",
      "autonomous_safe": true,
      "compositeScore": 0.74,
      "acClarity": { "rewrite": false }
    },
    {
      "id": "FEAT-MMM",
      "priority": "P2",
      "autonomous_safe": true,
      "compositeScore": 0.68,
      "acClarity": { "rewrite": true, "rewriteDispatchOk": true }
    },
    {
      "id": "FEAT-OOO",
      "priority": "needs-review",
      "autonomous_safe": false,
      "acClarity": { "rewrite": true, "rewriteDispatchOk": false }
    }
  ],
  "phaseB": { "fannedOut": <int>, "rewriteOk": <int>, "rewriteFail": <int> }
}
```

Invariant: `triaged == sum(results)` and `phaseB.fannedOut == phaseB.rewriteOk + phaseB.rewriteFail`.

## Failure escalation

- Phase A failure (PM error, validation failure) for a FEAT → halt batch; surface PM halt JSON.
- Phase B failure for a single FEAT → orchestrator writes `composite_priority: needs-review` to that FEAT and CONTINUES processing the rest. Reported in `phaseB.rewriteFail`.
- Phase C failure for a single FEAT → orchestrator writes `composite_priority: needs-review`, `acClarity: { rewrite: true, rewriteDispatchOk: true, scoreOk: false }` and CONTINUES. Reported in results with `priority: needs-review`.

Walker does not auto-promote any FEAT with `composite_priority: needs-review` until an operator resolves manually or re-runs `/loop:retriage` after a fix.

## Cost guard

Same per-batch budget as `/loop:triage` (`.claude/loop.json::loop.triageBudgetUsdPerBatch`, default 5.0). Worst case per FEAT: PM phase-A + spec-writer phase-B + PM phase-C ≈ 3× single-PM cost. Halt fires on budget overrun.

## Why three phases instead of one PM dispatch

The original design had PM dispatch `loop:spec-writer` inline. That requires `Agent` tool surface inside the PM subagent. In the current Claude Code subagent runtime, `Agent` is a deferred tool that PM cannot load via `ToolSearch` — observed empirically on FEAT-020 retriage 2026-06-12. Pulling the dispatch up to the orchestrator removes the constraint and adds free parallelism on phase B.

## Back-compat with `/loop:triage` and prior `/loop:retriage`

- `/loop:triage` — unchanged cheap default, PM-only scoring on whatever AC exist.
- `/loop:retriage` — three-phase orchestrator (PM → spec-writer → PM). Replaces the prior single-PM-with-inline-dispatch model. Output schema is a superset of the prior shape (`phaseB` block is new).
- `/loop:intake` Phase 1 still calls `/loop:triage`. A future FEAT may swap it for `/loop:retriage` once we measure the cost vs. quality trade-off.

## Refs

- `agents/pm.md` — base PM agent contract.
- `agents/spec-writer.md` — spec-writer agent (Given-When-Then AC rewriter).
- `skills/authoring-slices/SKILL.md` — AC clarity checklist.
- `commands/triage.md` — legacy cheap path.
- `commands/intake.md` — Phase 1 / Phase 2 orchestration pattern this command mirrors.
