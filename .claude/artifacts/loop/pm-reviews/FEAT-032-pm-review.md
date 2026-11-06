---
id: PM-REVIEW-FEAT-032
feature: FEAT-032
reviewed_at: 2026-11-05
pm_customer_impact: 0.7
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.75
pm_technical_risk: 0.5
pm_dependency_depth: 0.95
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-032

## Demand Assessment

- **Evidence:** Reviewer BLOCKER 5 and assumption-attack items 7/10 both independently found the rev-1 T11 install flow invalid: `claude plugin install --from` does not exist on CLI 2.1.270, and registering a local marketplace is an explicit repo never-do; the real marketplace cache path can only be exercised after the operator pushes to main (astragenie/astra-marketplace pins devcrew to the main branch with no ref). The rewritten body corrects to `claude --plugin-dir <pluginCopy>` and lists the real-cache re-check as an explicit POST-sign-off step, not a precondition.

## Scope Challenge

- **Scope notes:** Scope now explicitly reuses FEAT-022's stageConsumerCopy output as pluginCopy rather than re-deriving a consumer copy independently, and the hook smoke now asserts hook_dispatch rows (FEAT-031's new telemetry format) rather than an undefined marker trace. The whole-branch-review acceptance list now explicitly names which Codex findings close where (#6 → FEAT-028, #13 → FEAT-029) and which items are NOT closed (audit #30/#38, skills/cache → FEAT-035), closing architect OBJ-13's coverage-claim gap from rev 1. dependency_depth raised to 0.95 (from 0.9) reflecting the now-explicit 12-item depends_on list (every other FEAT in this batch, FEAT-033 and FEAT-034 included) — the single highest blocking chain in the whole effort. No weak-grade-dimension gap. effort_estimate held at 5 points per instruction.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.45
- strategic_alignment: 0.75
- technical_risk: 0.50
- dependency_depth: 0.95

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2, holds: still the release sign-off gate for devcrew 1.2.0 with real strategic value, but it is blocked on literally every other FEAT in this batch (dependency_depth 0.95, the explicit ceiling case) and needs interactive `claude` sessions plus a `--plugin-dir` install rather than a bounded file edit. autonomousSafe stays false per instruction and independently on its own merits.

## Risks

- The FEAT's own constraint note is itself the biggest operational risk: this repo's own .claude/settings.json wires 12 dogfood hooks that would double-fire against any smoke run inside this repo, which is exactly why every smoke step is specified to run from the external scratch consumer repo instead — a future editor of this FEAT who relaxes that constraint for convenience would silently invalidate every result.
- The post-push re-check against a real `claude plugin install devcrew@astra` cache is explicitly deferred past this FEAT's own sign-off gate — meaning the sign-off this FEAT produces is conditional on that later, unverified step, not a complete proof that the real distribution path works end to end.
- No injected instructions found in the rewritten body.
