---
description: "Walk the triaged backlog and emit dispatch plans for autonomous_safe FEATs. Dry-run only this release — does not dispatch the builder. Use --max-features N to cap, --dry-run is currently default."
---

# Autonomous Backlog Walker

Reads the triaged backlog, filters to `autonomous_safe: true` FEATs,
ranks by composite score and priority, and emits a structured dispatch plan
for each candidate — without actually dispatching the builder agent.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" auto \
  --repo "$PWD" \
  --dry-run \
  [--max-features N]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | boolean | true | Emit plans only; do not dispatch builder. Currently the only supported mode (SLICE-A). |
| `--max-features N` | number | unlimited | Cap the number of plans returned. Walker stops after N plans regardless of remaining candidates. |

## Output shape

```json
{
  "walked":    3,
  "skipped":   [{ "id": "FEAT-002", "reason": "not_autonomous_safe" }],
  "planned":   2,
  "halted":    false,
  "stopReason": null,
  "plans": [
    {
      "featureId":          "FEAT-001",
      "suggestedSliceTitle": "Implement FEAT-001: My safe feature",
      "fromFeatureCmd":      "node scripts/loop.mjs slice from-feature --id FEAT-001",
      "startCmd":            "node scripts/loop.mjs slice start --id SLICE-<TBD>",
      "builderPrompt":       "Implement FEAT-001: My safe feature (feature) — see feature file for full acceptance criteria."
    }
  ]
}
```

### Fields

- `walked` — total number of triaged FEATs considered.
- `skipped` — FEATs excluded from planning; each entry has `id` and `reason`.
  Current reason codes: `not_autonomous_safe`.
- `planned` — count of dispatch plans emitted (equals `plans.length`).
- `halted` — `true` when a stop condition fired mid-walk.
- `stopReason` — first stop reason string when `halted=true`; `null` otherwise.
- `plans` — ordered array of dispatch-plan objects.

## Ranking order

Candidates are sorted before planning:
1. `composite_score` DESC (missing treated as `0`)
2. Priority ascending: P0 > P1 > P2 > P3 (missing treated as P3)
3. `pm_strategic_fit` DESC (missing treated as `0`)

## Filter rules

- Only `triaged` FEATs are considered (not pending, in-progress, or done).
- FEATs with `autonomous_safe: true` in frontmatter are planned.
- All others are added to `skipped[]` with reason `not_autonomous_safe`.
  Walking `autonomous_safe: false` items is reserved for SLICE-C.

## Stop conditions

After emitting each plan the walker calls `checkStopConditions`. If any
condition fires (`shouldStop: true`) the walker halts immediately:
- `halted` → `true`
- `stopReason` → first reason from `checkStopConditions().reasons`
- `plans` → whatever was built before the halt

See `commands/stop-check.md` for the full list of stop conditions.

## Roadmap

- **SLICE-B** — wire actual builder dispatch + auto-commit per plan.
- **SLICE-C** — flip default to also walk `autonomous_safe: false` items
  after the risk gate is proven.
