---
id: PM-REVIEW-FEAT-250
feature: FEAT-250
reviewed_at: 2026-07-09
pm_customer_impact: 0.5
pm_effort_estimate: 0.8
pm_strategic_alignment: 0.75
pm_technical_risk: 0.65
pm_dependency_depth: 0.45
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-250

## Demand Assessment

- **Evidence:** Architecture review (.claude/artifacts/crew/reviews/2026-07-09-tracker-provider-plan-review.md:14-18) MAJOR finding 1: 'Phase 1 slice-side scope understated -- no canonical slice-writer exists to consolidate... New construction + divergence reconciliation, not delegate swap.' Program's headline AC (plan line 219-220) 'Flipping taskStore.provider/providers... changes all publish+sync behavior, zero code edits' is structurally impossible without this storage seam existing first.

## Scope Challenge

- **Scope notes:** COND-A requires the slice-side new-construction and feature-side delegate swap be budgeted together, not split casually. `grep -rl backlog-writer.mjs src/scripts` confirms 11 caller files (matches review finding 7, not the plan's original 8). Weak dimensions: none currently (all loop-snapshot averages >=0.80). No direct cost analog on disk; SLICE-14 ($7.39/15min) built the getProvider resolver itself, not this storage layer, so it's not comparable. Using FEAT-242 (pm_effort_estimate 0.65 -> 8 Fibonacci points, 4-slice decomposition, architect-approved, still in-progress so no closed-cost actual) only as a scope-shape anchor: FEAT-250's combined interface-design + 11-caller conversion + net-new slice-writer consolidation + CI allowlist gate exceeds FEAT-242's blast radius, supporting effort_estimate 0.8 -> 13 points.

## Scores

- customer_impact: 0.50
- effort_estimate: 0.80
- strategic_alignment: 0.75
- technical_risk: 0.65
- dependency_depth: 0.45

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: Cross-module reach (11+ callers, 3+ scattered write sites to consolidate, new CI allowlist gate) with no new external dependency and no persisted-data-shape change lands technical_risk at 0.65 (bottom of the 0.6-0.8 band), triggering the mandatory pre-mortem; foundational to every downstream phase (2-6) -> P1; effort_estimate 0.8 maps to 13 Fibonacci points, tripping the FEAT-168 decomposition gate -- decomposed into 4 slices below summing to 16 points.

## Risks

- It is two weeks later and this slice failed review or validation -- most likely cause: the slice-side 'new construction' (COND-A) under-scoped wave/failure-pivot.mts's hand-rolled regex frontmatter mutation, and porting it to mergeFrontmatter silently changed output shape on an edge-case frontmatter block that wave-mode's light test coverage never exercised.
- This merged and broke the loop -- rollback requires more than git revert once Phase 2/3/4 FEATs start calling BacklogStore: a mid-migration revert leaves a mixed thin-delegate/raw-fs state across the 11 converted callers that is hard to bisect cleanly, not a clean single-commit revert.
- Existing tests exercise backlog-writer.mts's moveFeature and the DORA emitter directly, but there is no existing integration test asserting the new createSlice/updateSliceFrontmatter/moveSlice produce byte-identical frontmatter to the three consolidated raw-fs writers (complete-slice.mts, feature-lifecycle.mts x2) -- that parity test does not exist today and must be added as an AC, not assumed.
- HARD DEPENDENCY on FEAT-247 (triaged P1, not yet started) -- do not start Phase 1 code until FEAT-247's moveFeature integration test lands and stays green untouched through this refactor.
