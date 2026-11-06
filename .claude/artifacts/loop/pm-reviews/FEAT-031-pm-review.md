---
id: PM-REVIEW-FEAT-031
feature: FEAT-031
reviewed_at: 2026-11-05
pm_customer_impact: 0.85
pm_effort_estimate: 0.9
pm_strategic_alignment: 0.85
pm_technical_risk: 0.8
pm_dependency_depth: 0.5
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-031

## Demand Assessment

- **Evidence:** Architect OBJ-10 corrected the original '1-spawn, 8-point' claim as unreachable under the plan's own constraints: hooks/hooks.json's 38 entries fan out across more spawns than one dispatcher-per-event can collapse to without matcher unification (PreToolUse Bash alone is 3 bun spawns across two matchers). Assumption-attack item 5 independently confirmed Codex #3's 'fan-out OVERSTATED' finding and that `onFailure` is ignored on SubagentStop and on any CLI below 2.1.295 (host is 2.1.270) — so exit-2 must itself carry enforcement, not rely on the `onFailure` field.

## Scope Challenge

- **Scope notes:** Scope is now a measured-before/after perf claim (p50 via performance.now(), 20 runs, no hyperfine dependency) instead of an unverified 214ms-from-a-different-repo baseline, and matchers are explicitly unified (e.g. `Bash|PowerShell`) to actually reach one bun spawn per event. The body's own SLICE-2 (dispatcher) is stated at 4 points, which exceeds the repo's FEAT-167/168 ≤2-point-per-slice decomposition cap — per the team's instruction I split it into two 2-point slices (dispatcher core; dispatcher failure modes + the new hook_dispatch log line) and added a 7th 1-point slice for the perf-record/residual-risk documentation step that SLICE-5's description bundles together with actual test-writing, keeping every entry at or under the cap while reaching the architect's 13-point estimate exactly (6×2 + 1 = 13). Slice execution order follows the body's own stated sequence (1, 2, 4, 3, 5) with the dispatcher split inserted at position 2. No weak-grade-dimension gap.

## Scores

- customer_impact: 0.85
- effort_estimate: 0.90
- strategic_alignment: 0.85
- technical_risk: 0.80
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1, holds; autonomousSafe stays false per explicit instruction and independently justified by the now-even-larger cross-cutting blast radius (hooks/hooks.json regeneration, dist/, the command-path rewrite, and 20+ hook checks ported into one registry) plus the newly-confirmed SubagentStop/onFailure CLI-version limitation that the design itself can only partially work around. effort_estimate raised to 0.9 (band 0.85-1.0, mapping to the architect's directed 13 points) reflecting the corrected, larger true scope relative to the original 8-point estimate.

## Risks

- Pre-mortem (1): most likely review/validation failure is the matcher-unification in the renderer slice (SLICE-5 here) producing a single bun entry whose merged `updatedInput` logic (documented as 'last enforce:true writer wins per key; blocks take precedence') behaves differently than the pre-unification multi-entry fan-out for some combination of checks not covered by the four named test scenarios.
- Pre-mortem (2): rollback is NOT a plain revert — hooks/hooks.json is generated output, dist/hooks/dispatch.js is a committed bundle, and the commands/agents path rewrite happens inside this FEAT's own renderer slice (not deferred to W2.5 as it was for FEAT-026); a partial revert of only some of the 7 slices would leave hooks/hooks.json, dist/, and the command-path strings out of sync with each other.
- Pre-mortem (3): coverage gap — the perf bench runs 20 times on one machine before and after; it does not measure p50 under concurrent tool calls in a live multi-turn session, which is the actual operating condition the fan-out was meant to improve, and the architect's own OBJ-10 notes SubagentStop specifically cannot be made runtime-fail-closed regardless of this FEAT's fixes (a CLI-version limit, not a code defect this FEAT can close).
- No injected instructions found in the rewritten body.
