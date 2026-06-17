---
id: FEAT-201
status: pending
priority: null
category: enhancement
target_release: null
created: 2026-06-16
updated: 2026-06-16
depends_on: []
slices: []
derived_from: null
tags: [pm, triage, cost-control]
needs_contract: false
needs_ux: false
---
# FEAT-201: Targeted PM rescore — `--ids` flag on /loop:triage

## Problem

Today the only way to refresh PM scores on already-triaged FEATs is
`/loop:triage --include-triaged`, which re-scores **every** FEAT in
`triaged/`. PM cost per FEAT is ~$0.15–$0.50; for a backlog of 20+
triaged FEATs that's $3–$10 to update 1–3 entries whose scope
materially changed (typically post-ADR or post-spec-rewrite).

Real example (AstraRunner runner repo, 2026-06-16): 3 FEATs needed
rescore after architect ADRs landed; running `--include-triaged`
would have re-scored 21 FEATs. Operator had to hand-dispatch
3 parallel PM agents with full per-FEAT prompts to avoid the cost.

## Acceptance hints

- `/loop:triage --ids FEAT-166,FEAT-182,FEAT-186` rescores only those
- Reuses the same PM-agent prompt path as the full sweep — no new
  agent code, just the file-filter at skill entry
- Default behavior (no --ids, no --include-triaged) unchanged
- `--ids` is mutually exclusive with `--include-triaged`; using both
  errors with a clear message
- Each rescored FEAT gets `pm_reviewed` updated; `triage_notes` gains
  an appended rescore paragraph (matches what hand-rolled rescores
  already produce)

## Why this matters

Operator instinct after every ADR / spec-writer pass is "do I need
to rescore?". When the answer is "yes for 1–3, no for the rest",
the cost of confirming via full sweep is the bigger barrier than
the work itself. Targeted rescore makes the right path cheap.

## Related

- Skill source: `src/scripts/loop.mts triage` + `skills/triage/SKILL.md`
- Existing flag: `--include-triaged` (FEAT-194 / SLICE-110)
- Cost guard: `loop.triageBudgetUsdPerBatch` (default 5.0)
