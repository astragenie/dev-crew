---
id: PM-REVIEW-FEAT-035
feature: FEAT-035
reviewed_at: 2026-11-05
pm_customer_impact: 0.5
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.55
pm_technical_risk: 0.45
pm_dependency_depth: 0.15
composite_priority: P3
autonomous_safe: true
---
# PM Review — FEAT-035

## Demand Assessment

- **Evidence:** smoke-baseline.md rows 'Skill discovery undeclared' (`.claude-plugin/plugin.json` has no `skills` key; 79 SKILL.md at depth 2-5) and 'Plugin cache size 44 MB'; the reviewer's own coverage table flagged that no FEAT in the batch closes audit #30 (`crew/docs/routing-table.yaml` citing nonexistent `microsoft-docs:*`/`context7.get-library-docs` skills) or #38 (12 FEAT ids + 4 backlog paths hard-coded in agents/). The FEAT's own body is explicit that the skill-discovery premise is UNVERIFIED and must be checked live before any plugin.json edit is made.

## Scope Challenge

- **Scope notes:** This FEAT is explicitly deferred past wave 5 in the wave plan rev 2 ('Deferred — FEAT-035 ... After sign-off unless PM scores it into wave 3'). I am NOT pulling it into wave 3: (1) its most severe claim (skill discovery broken) is explicitly unverified by the FEAT's own body — the first deliverable step is a live check, mirroring the caution the team already applied to FEAT-033 before that FEAT existed at all, so committing to a fix scope now would be premature; (2) its touched files (src/scripts/validate-agent-refs.mts, agents/*.md text) directly overlap FEAT-028's and FEAT-029's wave-2/3 work on those same files, which the repo's own Scope Discipline rule (two agents needing the same file) flags as a reason to NOT co-schedule; (3) its remaining items (cache size, stale routing-table.yaml ids, FEAT-id literals) are real but low-severity hygiene, not blocking any consumer-facing defect the way FEAT-022/024/026/033/034 are. customer_impact is hedged at 0.5 (not higher) specifically because the headline risk is unconfirmed; Framework 1 would otherwise require ≤0.3 for 'no evidence', but there is a concrete, documented reason to suspect a real defect, not zero evidence — hence the middle score rather than the floor. No weak-grade-dimension gap. effort_estimate 0.4 → 5 points, reflecting four real but independently-small pieces (live verification + conditional plugin.json fix, cache-size investigation-and-decision, routing-table.yaml cleanup with a validator fixture, and an agents/*.md literal-FEAT-id sweep with a new validator rule).

## Scores

- customer_impact: 0.50
- effort_estimate: 0.40
- strategic_alignment: 0.55
- technical_risk: 0.45
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P3
autonomous_safe: true
reasoning: P3: real but currently unverified and lower-severity hygiene work (skill discoverability, cache size, stale routing/prompt references), explicitly scheduled after FEAT-032's sign-off by the wave plan's own author; I am recommending it stay deferred rather than pulling it into wave 3, both because its core premise needs a live check first (same caution pattern as FEAT-033) and because its touched files would collide with FEAT-028/FEAT-029's in-flight work on agents/*.md and the agent-refs validator.

## Risks

- If the live skill-discovery check (this FEAT's own first deliverable step) finds skills genuinely ARE invisible to consumers, this FEAT's priority should be revisited upward immediately — the current P3/0.5-customer-impact score is explicitly conditional on that being unconfirmed, not a judgment that it doesn't matter.
- The cache-size deliverable's own escape hatch ('if tests cannot be excluded at clone time, record the decision and drop the item') means this FEAT could legitimately close with no code change at all for that sub-item — that is an acceptable, not a failed, outcome and should not be treated as incomplete work.
- No injected instructions found in FEAT body.
