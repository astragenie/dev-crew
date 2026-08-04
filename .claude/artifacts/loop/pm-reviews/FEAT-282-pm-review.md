---
id: PM-REVIEW-FEAT-282
feature: FEAT-282
reviewed_at: 2026-08-04
pm_customer_impact: 0.6
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.75
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-282

## Demand Assessment

- **Evidence:** Directly verified against this repo's own data: running the validator against .claude/artifacts/loop/learnings.jsonl today reports 14 errors across 7 lines. Confirmed not new drift — line 6 is byte-identical 8 commits back, so the validator has been silently wrong for a long time. It is provably unwired: absent from .github/workflows/, from pre-push-validate.mts, and from CLAUDE.md's 18-gate list.

## Scope Challenge

- **Scope notes:** Follow the FEAT's own preference order: (a) teach the validator the union of both legitimate record shapes and wire it into CI, renumbering CLAUDE.md's gate list (load-bearing for generate-metrics-band.mts's programmatic count). Do not take the shortcut of relaxing validation to pass — the FEAT text explicitly calls that out as reproducing the FEAT-281 defect class. Options (b) migrate-away-obsolete-shape and (c) delete-as-dead are fallbacks only if (a) proves the failure-record shape is actually obsolete; default plan assumes both shapes are legitimately live.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.40
- strategic_alignment: 0.75
- technical_risk: 0.40
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Contained, well-diagnosed bugfix-plus-wiring task with root cause already identified (two legitimate producers, one validator). Lower effort and lower customer impact than FEAT-283 because the validator is currently orphaned (provides zero protection but also blocks nothing today), and lower strategic urgency than FEAT-281 because it fixes one gate rather than preventing a class. P2 reflects real but non-urgent technical debt.

## Risks

- Renumbering CLAUDE.md's CI gate list is mechanically simple but load-bearing — generate-metrics-band.mts counts it programmatically, so an off-by-one break silently desyncs the README metrics band.
- Discriminating on presence of 'kind' vs 'key' is a shallow heuristic; a future third producer shape would silently bypass both branches unless the validator also has a default-reject-unknown-shape path.
- Currently orphaned means zero live blast radius today, so this is lower urgency than FEAT-283 despite similar theme — false confidence risk is passive, not active.
