---
description: "Walk the triaged backlog and emit dispatch plans for all viable FEATs. Ranks by composite score, processes both autonomous_safe=true and autonomous_safe=false items with risk gate. Use --auto-mode to flip default to live dispatch (SLICE-C)."
---

# Autonomous Backlog Walker

Reads the triaged backlog, ranks by composite score and priority, and emits
a structured dispatch plan for each candidate. Walks both `autonomous_safe: true`
and `autonomous_safe: false` FEATs (with risk gate). Respects cost cap and
escalation thresholds from loop.json.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" auto \
  --repo "$PWD" \
  [--dry-run] \
  [--auto-mode] \
  [--max-features N]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | boolean | false | Emit plans only; do not dispatch builder. When false with --auto-mode, triggers live dispatch. |
| `--auto-mode` | boolean | false | Include `autoMode: true` in all plans and `orchConfig.autoMode: true` to suppress per-plan approval gates (SLICE-C). |
| `--max-features N` | number | unlimited | Cap the number of plans returned. Walker stops after N plans regardless of remaining candidates. |

## Output shape

```json
{
  "walked":    3,
  "skipped":   [{ "id": "FEAT-002", "reason": "not_autonomous_safe" }],
  "planned":   2,
  "halted":    false,
  "stopReason": null,
  "summaryPath": ".claude/artifacts/loop/auto-runs/2026-06-03T12-34-56-789Z-auto-run.md",
  "orchConfig": {
    "costStopThreshold": 5,
    "escalationThreshold": 3,
    "autoMode": false
  },
  "plans": [
    {
      "featureId":          "FEAT-001",
      "suggestedSliceTitle": "Implement FEAT-001: My safe feature",
      "fromFeatureCmd":      "bun src/scripts/loop.mts slice from-feature --id FEAT-001",
      "startCmd":            "bun src/scripts/loop.mts slice start --id SLICE-<TBD>",
      "orchestratorMode":    "lead",
      "dispatchPrompt":      "Orchestrate FEAT-001: My safe feature (feature) — dispatch architect (if contracts/topology need design), builder, reviewer ladder, and validator. See feature file + slice file for acceptance criteria; close via /loop:slice complete and /loop:slice grade.",
      "builderPrompt":       "Orchestrate FEAT-001: My safe feature (feature) — dispatch architect (if contracts/topology need design), builder, reviewer ladder, and validator. See feature file + slice file for acceptance criteria; close via /loop:slice complete and /loop:slice grade.",
      "autoMode":            false
    }
  ]
}
```

### Fields

- `walked` — total number of triaged FEATs considered.
- `skipped` — FEATs excluded from planning; each entry has `id` and `reason`.
  Reason codes: `not_autonomous_safe`, `deferred`, `depends_on: [...]`, `risk gate blocked`.
- `planned` — count of dispatch plans emitted (equals `plans.length`).
- `halted` — `true` when a stop condition or cost cap fired mid-walk.
- `stopReason` — first stop reason string when `halted=true`; `null` otherwise.
- `summaryPath` — path to artifact under `.claude/artifacts/loop/auto-runs/` (SLICE-B).
- `orchConfig` — hints for orchestrator layer (SLICE-C):
  - `costStopThreshold`: from `loop.json` or option; plan-count cap for cost control.
  - `escalationThreshold`: 3 (hard-coded; 3 consecutive fails per FEAT → escalate).
  - `autoMode`: reflects the `--auto-mode` option.
- `plans` — ordered array of dispatch-plan objects.
  - `orchestratorMode`: which subagent the orchestrator should dispatch
    (`"lead"` default, `"orchestrate-slice"`, or `"direct-builder"`).
    Mirrors `loop.orchestratorMode` from `.claude/loop.json`.
  - `dispatchPrompt`: prompt for the dispatched agent. Framed as orchestration
    when mode is `"lead"`, as direct implementation when `"direct-builder"`,
    or as a `/crew:orchestrate-slice` invocation when `"orchestrate-slice"`.
  - `builderPrompt`: **deprecated** alias of `dispatchPrompt` retained for
    v0.38.x readers. New consumers should use `dispatchPrompt` and route
    based on `orchestratorMode`.
  - `requiresPlanPreflight`: true for `autonomous_safe: false` FEATs.
  - `riskGate`: populated when `pm_risk_level >= 0.7`.
  - `autoMode`: set when `--auto-mode` passed.

## Ranking order

Candidates are sorted before planning:
1. `composite_score` DESC (missing treated as `0`)
2. Priority ascending: P0 > P1 > P2 > P3 (missing treated as P3)
3. `pm_strategic_fit` DESC (missing treated as `0`)

## Filter rules

- Only `triaged` FEATs are considered (not pending, in-progress, or done).
- FEATs must have `autonomous_safe: true` or `autonomous_safe: false` (not null/undefined).
- `autonomous_safe: false` items are subject to risk gate (see below).
- Skipped due to risk gate if: `deferred: true`, `depends_on` incomplete, or other blockers.

## Stop conditions

After emitting each plan the walker checks two conditions:

1. **Cost cap (SLICE-C):** If `costStopThreshold` is set (from `--max-features`,
   `loop.json costStopThreshold`, or orchestrator layer), halt when
   `plans.length >= costStopThreshold` with `stopReason: "cost_cap: ..."`.

2. **Global stop (all slices):** Calls `checkStopConditions`. If any condition
   fires (`shouldStop: true`), halt immediately with `stopReason` from the first reason.

See `commands/stop-check.md` for the full list of stop conditions.

## Risk gate (autonomous_safe=false items)

When `autonomous_safe: false` is encountered, the walker evaluates:

| Condition | Action |
|---|---|
| `deferred: true` | Skip with reason `"deferred"` |
| `depends_on` non-empty (unfinished) | Skip, listing deps in reason |
| `pm_risk_level >= 0.7` | Include in plans with `riskGate.warn` (SPEC recommended) |
| Otherwise | Include in plans with `requiresPlanPreflight: true` |

## Roadmap

- **SLICE-A** — Backlog walker + auto-decisions for autonomous_safe=true items only. ✓ Shipped
- **SLICE-B** — Plan Mode pre-flight + risk gate + /crew:fix auto-pivot. ✓ Shipped
- **SLICE-C** — Stop-condition wiring + cost cap + escalation flag. ✓ Shipped
