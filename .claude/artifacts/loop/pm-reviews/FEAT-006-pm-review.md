---
id: PM-REVIEW-FEAT-006
feature: FEAT-006
reviewed_at: 2026-08-18
pm_customer_impact: 0.6
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.9
pm_technical_risk: 0.95
pm_dependency_depth: 0.9
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-006

## Demand Assessment

- **Evidence:** dev-crew/CLAUDE.md decision record (unification-plan.md section 1): 'Preference for one release train, one surface, one test suite, one agent registry; willingness to pay a one-time scripted cutover across ~10 local repos.' This IS the mission-completion step the operator explicitly signed up for. Task-scoped instruction for this triage run independently states: 'P5 requires explicit operator approval for the marketplace edit and is NOT autonomous_safe' -- confirmed independently by my own technical_risk banding, not merely asserted.

## Scope Challenge

- **Scope notes:** Effort: plan states 2-3 slices for P5 -> pm_effort_estimate 0.35 falls in [0.25,0.4) -> effort_points=3 (below the 8-point mandatory-decomposition threshold; proposedSlices provided for clarity only). No cost analog (dev-crew zero history; a marketplace-entry swap affecting ~10 adopter repos has no precedent in the sampled runner-plugin cost reports, which are all single-repo slices). Adopter count caveat carried forward from the plan itself: 'the section-6 ~10 is a snapshot -- the Appendix A enumeration command re-run at P5 time is authoritative (demolition review observed 9-vs-10 drift between counts taken hours apart)' -- do not treat '10' as fixed at execution time.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.35
- strategic_alignment: 0.90
- technical_risk: 0.95
- dependency_depth: 0.90

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: Highest strategic value (mission completion) but the single most irreversible step in the program -- technical_risk 0.95, banded at the rubric's top row ('public/cross-plugin contract change... hard-to-reverse effects') because the marketplace entry is consumed by every adopter repo; autonomousSafe=false both per the task's explicit instruction and independently confirmed by this banding; effort_points=3 keeps decomposition optional, but the risk floor is what actually gates this phase, not the size.

## Risks

- Pre-mortem Q1: most likely failure is the marketplace swap (crew+runner entries -> one devcrew entry) executing before every adopter repo has actually been migrated -- an adopter still pointing at the old crew/runner entries would silently break if those entries are removed rather than deprecated-then-removed as the plan specifies.
- Pre-mortem Q2: rollback is the most severe in the entire program -- once adopter repos are re-pointed and parent marketplace entries removed, reverting means re-adding the deprecated entries AND re-running migrate-adopter.mts in reverse across every touched repo; this is explicitly cross-plugin coordination, not a git revert.
- Pre-mortem Q3: no existing test anywhere asserts installer idempotence across a live marker-block replacement (runner:start + crew:start -> one devcrew:start); AC-2 below is new coverage for a mechanic (marker-block regeneration) that has never been exercised at this scale before.
- Blocked by FEAT-001 through FEAT-005 (all five prior phases) -- the deepest possible dependency_depth in this batch; the task-scoped sequencing note ('P0 blocks P1 blocks P2...') is reflected directly in dependency_depth=0.9.
