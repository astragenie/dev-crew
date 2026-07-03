---
id: FEAT-201
status: done
priority: P2
category: enhancement
target_release: null
created: 2026-06-16
updated: 2026-07-02
depends_on: []
slices: []
derived_from: null
tags: [pm, triage, cost-control]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.5
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.5
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.0-0.2: known repo pattern (file-filter at existing skill entry point), 1-2 files touched (loop.mts + SKILL.md), trivially git-revertable. P2 because customer_impact is real but moderate (cost-control convenience for an infrequent operator workflow, not a recurring blocker)."
completed_at: 2026-07-02
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
