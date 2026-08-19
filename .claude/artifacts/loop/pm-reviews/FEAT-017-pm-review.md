---
id: PM-REVIEW-FEAT-017
feature: FEAT-017
reviewed_at: 2026-08-19
pm_customer_impact: 0.4
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.6
pm_technical_risk: 0.3
pm_dependency_depth: 0.65
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-017

## Demand Assessment

- **Evidence:** FEAT directly enforces the constitution.md-recorded decision for this program: 'hard /devcrew:* cutover no shims'. The legacy allowlist in guard-feat-dispatch was deliberately kept functional through the cutover per that same decision, and this FEAT is its scheduled retirement.

## Scope Challenge

- **Scope notes:** Mechanically trivial (empty one allowlist array, update its tests) but explicitly NOT YET ACTIONABLE: FEAT text schedules this for 'one release after devcrew 1.0.0 goes live' (FEAT-019). Dispatching this today would hard-fail any straggler still on legacy /crew:/ /runner: tokens before the promised deprecation window has elapsed.

## Scores

- customer_impact: 0.40
- effort_estimate: 0.20
- strategic_alignment: 0.60
- technical_risk: 0.30
- dependency_depth: 0.65

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: Trivial code change but genuinely blocked on an external, time-based release gate (FEAT-019 shipping plus one full release cycle) that is not expressible in frontmatter depends_on -- dependency_depth is scored at 0.65 to reflect that real gate, which forces autonomousSafe:false so the loop does not grab this low-effort P2 item prematurely and hard-fail legacy-token consumers ahead of schedule.

## Risks

- none
