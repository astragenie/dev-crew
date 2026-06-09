---
id: FEAT-082
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-09
depends_on: []
slices: [SLICE-86]
derived_from: null
composite_score: 7
source_competitors: [Cursor agents]
autonomous_safe: false
tags: [skill-routing, rules, context-injection]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.4
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.1
triage_notes: "Composite 7. Glob-scoped rule auto-attachment is directionally similar to FEAT-102 (rule activation triggers). Near-exact duplicate of FEAT-105. These two FEATs overlap heavily — if FEAT-102 (model_decision + glob triggers) ships, this is largely satisfied. autonomousSafe: false — needs schema design."
started_at: 2026-06-09
slices_complete: [SLICE-86]
completed_at: 2026-06-09
---
# FEAT-082: Glob-scoped auto-attach rules with remote import

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

.mdc rules in .cursor/rules/ auto-attach based on file globs, always-apply flag, or AI relevance inference. Rules can be imported from remote GitHub repos via .cursor/rules/imported/<repoName>/. Four-tier precedence (user < project < team < enterprise).

## PM Scoring

```json
{
  "featureId": "FEAT-082",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.40,
    "strategic_alignment": 0.65,
    "technical_risk": 0.40,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Cursor audit. No direct user request for glob-scoped rule auto-attach in grades or feedback.",
  "scopeNotes": "Near-exact duplicate of FEAT-105. Heavily overlaps with FEAT-102 (rule activation triggers). Remote import via GitHub adds network dependency. Minimum: glob trigger in SKILL.md frontmatter (subset of FEAT-102). Remote import is a separate, higher-risk slice.",
  "risks": [
    "Near-exact duplicate of FEAT-105",
    "Remote import introduces network dependency and security surface (supply-chain risk for injected rules)",
    "Four-tier precedence model adds significant complexity to the resolver",
    "Substantial overlap with FEAT-102 — should be consolidated"
  ],
  "reasoning": "P2: glob trigger is valuable but is a subset of FEAT-102; remote import is higher risk and should be a separate FEAT."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cursor.com/docs/rules

## Consider rejecting because

Near-exact duplicate of FEAT-105 and heavily overlaps FEAT-102. Remote import from GitHub repos introduces supply-chain risk for injected prompt content — a security review gate would be needed. The four-tier precedence model (user < project < team < enterprise) implies a multi-environment install setup that this single-developer plugin does not currently have.
