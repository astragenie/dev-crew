---
id: PM-REVIEW-FEAT-252
feature: FEAT-252
reviewed_at: 2026-07-09
pm_customer_impact: 0.6
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.75
pm_technical_risk: 0.7
pm_dependency_depth: 0.25
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-252

## Demand Assessment

- **Evidence:** LINEAR_API_KEY is already set as a user-level env var on this machine and the Astragenie workspace/team (key AST, teamId 81cea472-33a9-4fbe-a797-147e17c6ca05) is pre-identified in the plan's Context section -- concrete operator-level intent to use Linear, not a hypothetical. FEAT-245 (IssueBroker, triaged P2, on disk at .claude/artifacts/loop/backlog/triaged/FEAT-245.md) explicitly states 'LinearProvider slot documented as pending C2, deferred' -- a second in-repo FEAT is blocked waiting on this one specifically.

## Scope Challenge

- **Scope notes:** Smallest deliverable per COND-B/COND-C: the four GraphQL write methods (issueCreate feature, issueCreate+parentId slice, workflow-state transition, commentCreate) plus soft-fail contract and the COND-B stamping DEC -- syncPull/bootstrap default to documented warning-stubs (COND-C), not full pagination/rate-limit handling, unless the architect DEC explicitly raises the estimate. provider-interface.mts:35 confirms publishFeature returns a single Promise<number|string|null> today -- COND-B's map-return-vs-composite-stamps-frontmatter choice must be made before this FEAT's publishFeature implementation is written, or Phase 4 (FEAT-253) reworks it. No weak grade dimensions to target. Cost analog: SLICE-14 ($7.3878, 15.0 min, 99% cache hit) built the getProvider resolver + LinearProvider *stub* (all-throw) + NoopProvider -- this FEAT replaces the stub with real GraphQL calls: external API, auth, soft-fail contract, mock-transport tests, one manual smoke -- materially larger than SLICE-14's scaffolding-only scope, supporting effort 0.7 (8 pts) well above SLICE-14's actual.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.70
- strategic_alignment: 0.75
- technical_risk: 0.70
- dependency_depth: 0.25

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: New external dependency (Linear GraphQL API) plus auth handling across a cross-module reuse target (IssueBroker/FEAT-245) lands technical_risk at 0.7 (0.6-0.8 band: new dependency, no schema/data-shape change to this repo's own persisted state); real operator-level demand (key + workspace already provisioned, FEAT-245 blocked on this slot) -> P1; effort_estimate 0.7 maps to 8 Fibonacci points, tripping the FEAT-168 decomposition gate -- decomposed into 3 slices below summing to 11 points.

## Risks

- It is two weeks later and this slice failed review or validation -- most likely cause: the COND-B stamping DEC was skipped or made inline without architect sign-off, so publishFeature's return shape doesn't match what Phase 4's CompositeProvider (FEAT-253) needs, forcing a signature change after FEAT-253 has already built against it.
- This merged and broke the loop -- rollback is a config-only revert (taskStore.provider back to github/noop) for the code path, but any Linear issues already created by a soft-fail bug during the bad window need manual cleanup in the live Astragenie Linear workspace, not a git revert.
- Existing test suite has zero live-API coverage by design (COND-C: injectable mock transport only, no live calls in CI) -- a Linear GraphQL schema change (renamed mutation field, changed required arg) would not be caught until the single documented manual smoke test runs, which is not part of CI and has no cadence specified.
- COND-B partial-failure warn semantics and id-recording contract are shared with FEAT-253 (CompositeProvider) -- if this FEAT's DEC and FEAT-253's implementation land out of sync, the composite fan-out silently mis-stamps frontmatter.
