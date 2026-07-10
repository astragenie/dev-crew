---
id: PM-REVIEW-FEAT-246
feature: FEAT-246
reviewed_at: 2026-07-09
pm_customer_impact: 0.45
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.6
pm_technical_risk: 0.2
pm_dependency_depth: 0.5
composite_priority: P3
autonomous_safe: true
---
# PM Review — FEAT-246

## Demand Assessment

- **Evidence:** Plan quote (2026-07-07-watcher-implementation-plan.md:204-209, C3 section): 'Watcher A detects root cause in repo B -> IssueBroker files idempotently -> repo B's watcher picks it up via --from-issue next tick (tier-1) or it waits for a human (tier-2). No direct cross-repo dispatch; the tracker IS the queue.' Sequencing (plan line 228): 'B1 -> B1.5 (gate) -> C1 -> C3 -> B2 -> C2' confirms C3 is the explicit next step after C1 in the approved plan, not an ad hoc addition. Stakeholder: same fleet operator persona; C3 is the piece that makes C1's filed issues actually actionable end-to-end rather than sitting inert.

## Scope Challenge

- **Scope notes:** Smallest deliverable: already minimal — the FEAT is described in the plan itself as 'mostly glue' (ACs artifact line 254-256), wiring C1's fileIssue output into B1's existing tier-1/tier-2 tick logic with 'zero special-casing beyond the existing new-issue flow' (AC-2). I do not recommend cutting the tier-2 negative test (AC-3, 'no automated reaction is attempted... issue waits for a human') even under scope pressure, since it is a safety-relevant negative assertion (prevents an unintended auto-reaction against a repo with no loop config) rather than incidental coverage. Overlap: none — this FEAT is the only one in the batch that asserts 'no direct cross-repo dispatch ever' as its own AC (AC-1), a distinct and safety-relevant claim not covered by FEAT-242 or FEAT-245's ACs individually. AC clarity: good — all 3 ACs are Given-When-Then with concrete test evidence (a negative assertion that watcher A's code path never spawns claude -p targeting repo B's cwd; a positive assertion that tier-1 repo B reacts via the existing new-issue flow; a negative assertion that tier-2 registry entries never trigger a Layer 2 spawn). Effort calibration: no cost analog (see FEAT-242 note); effort_estimate 0.15 (1 slice, 0.5 day, 'mostly glue' per the plan) maps to 2 Fibonacci points via pm-effort-mapper.mts — no decomposition concern. dependency_depth scored 0.5 (higher than FEAT-244/245) because this FEAT is the only one in the batch with two unresolved same-repo dependencies (FEAT-242 for tier-1/tier-2 tick logic AND FEAT-245 for fileIssue) rather than one — both are currently unbuilt (pending backlog), and the FEAT body's own 'relates_to' framing ('relates to FEAT-245 (C1 fileIssue)') is prose only, not a machine-readable frontmatter field (see FEAT-242's scopeNotes on the same backlog-discipline gap).

## Scores

- customer_impact: 0.45
- effort_estimate: 0.15
- strategic_alignment: 0.60
- technical_risk: 0.20
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P3
autonomous_safe: true
reasoning: P3: smallest, lowest-risk item in the batch, but blocked by two other unbuilt FEATs in this same backlog (FEAT-242 and FEAT-245) — dependency_depth 0.5 and 'mostly glue' scope place it last in this batch's priority ordering, though it is not low-value: it is the piece that makes C1's cross-repo filing actually actionable.

## Risks

- Technical-risk band rationale (0.2, known-repo-pattern band 0.0-0.2, upper edge): this is glue code reusing FEAT-242's tier-1/tier-2 tick logic and FEAT-245's fileIssue output verbatim, with no new external dependency and trivial git-revert rollback.
- Dependency-chain risk: because this FEAT depends on both FEAT-242 and FEAT-245 landing with stable interfaces first, it is the most exposed of the five to upstream interface drift — if FEAT-242's decomposition (proposed_slices) changes the tier-1/tier-2 registry field names, or FEAT-245's fileIssue() signature changes during its own 2-slice build, this FEAT's glue code needs a follow-up patch.
- Cascade risk (Framework 3, dispatch path): AC-1's negative assertion ('watcher A's code path never invokes a claude -p spawn targeting repo B's cwd') is the load-bearing safety property for this entire track — a regression here would silently reintroduce direct cross-repo dispatch, which the plan explicitly designed against ('the tracker IS the queue'); this is the single AC in this batch most worth a dedicated regression test that fails loudly rather than silently, since the failure mode (an extra unintended headless session against a repo the operator didn't expect to be touched) is exactly the kind of blast-radius surprise the plan's whole architecture is built to avoid.
