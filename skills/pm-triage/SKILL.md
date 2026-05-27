---
name: loop:pm-triage
description: Auto-triage all pending backlog features using the PM agent. Dispatched by the autonomous loop before Cross-Slice Continuation picks the next feature. Scores each FEAT across 5 dimensions, computes composite priority and autonomous_safe flag, moves pending to triaged.
---

# PM Triage

Triage all pending features in the backlog using the PM agent.

## Steps

1. List pending features: run the equivalent of `listBacklog` filtered to `pending/` state.
2. For each pending FEAT:
   a. Read the FEAT file (frontmatter + body).
   b. If `derived_from` is set, read the linked SPEC.
   c. Scan recent grades for demand evidence (`.claude/artifacts/loop/grades/`).
   d. Apply the three PM frameworks (Demand Assessment, Scope Challenge, Risk Radar).
   e. Score all 5 dimensions (0.0-1.0).
   f. Compute `compositePriority` using the derivation rules.
   g. Compute `autonomousSafe` using the safety rules.
3. For each scored FEAT, update its frontmatter with `pm_*` fields by running:
   ```
   node scripts/loop.mjs backlog pm-write --id FEAT-NNN --scores '{"customer_impact":0.8,...}' --priority P1 --autonomous-safe true --evidence "..." --reasoning "..."
   ```
4. Move each FEAT from `pending/` to `triaged/` via the standard triage flow.
5. Write a PM review artifact for each FEAT to `.claude/artifacts/loop/pm-reviews/`.
6. Return a summary table:

| FEAT | Priority | Safe? | Reasoning |
|------|----------|-------|-----------|
| FEAT-NNN | P1 | yes | one-line |

## When this runs

- Automatically: loop orchestrator dispatches before Cross-Slice Continuation
- Manually: user invokes `/loop:pm-triage`

## Fallback

If the `loop:pm` agent is unavailable or errors, fall back to `/loop:backlog triage` (regex heuristics). The loop must not stall because PM scoring failed.
