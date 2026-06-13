---
id: FEAT-112
status: in-progress
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-115]
derived_from: null
composite_score: 7
source_competitors: [GitHub Copilot Workspace / GitHub Copilot App]
autonomous_safe: true
tags: [documentation, ux, transparency]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.2
pm_effort_estimate: 0.1
pm_strategic_alignment: 0.45
pm_technical_risk: 0.1
pm_dependency_depth: 0.05
triage_notes: "Composite 7 but original Impact: 1, Effort: 0. Named sub-agents with stable user-facing identity. loop already has well-named roles (builder/reviewer/validator/deployer/researcher/pm/architect). The gap is surfacing role attribution per phase in the slice-progress output. This is a docs/template change. Effort: 0 in original is accurate for minimum scope. P3: low customer impact, trivially achievable but marginal value."
github_issue: 181
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/181"
started_at: 2026-06-13
---
# FEAT-112: Named sub-agents with stable user-facing identity (brainstorm / plan / repair)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- GitHub Copilot Workspace / GitHub Copilot App

## Description

Copilot Workspace names its sub-agents in product UI -- brainstorm, plan, repair. The naming is user-discoverable and discussed in documentation. loop / crew have richer role separation (builder / reviewer / validator / deployer / researcher / pm / architect) but the names are infrastructure-internal; end users invoke slash commands. Publishing a "loop role glossary" at slice-start (the slice-progress dashboard already exists -- add a per-phase role-attribution line) would raise transparency without architecture change.

## PM Scoring

```json
{
  "featureId": "FEAT-112",
  "scores": {
    "customer_impact": 0.20,
    "effort_estimate": 0.10,
    "strategic_alignment": 0.45,
    "technical_risk": 0.10,
    "dependency_depth": 0.05
  },
  "compositePriority": "P3",
  "autonomousSafe": true,
  "demandEvidence": "none — inferred from Copilot Workspace audit. Roles are already documented in CLAUDE.md (builder/reviewer/validator etc.).",
  "scopeNotes": "Minimum: add a one-line role-attribution header to each phase in the orchestrate-slice.md template. No code change required. If done as docs-only, this is a single-file edit to agents/ or docs/.",
  "risks": ["No significant risks — docs-only change"],
  "reasoning": "P3: near-zero effort, near-zero impact; roles are already documented in CLAUDE.md; marginal transparency gain."
}
```

## Scoring

- Impact: 1
- Effort: 0
- Fit: 3
- Composite: 7 / 9

## References

- https://github.com/githubnext/copilot-workspace-user-manual/blob/main/overview.md

## Consider rejecting because

Impact score of 1 (lowest tier). loop's role names (builder/reviewer/validator/etc.) are already documented in CLAUDE.md and README.md. This is a docs cosmetic improvement. The role glossary could be added to docs/ as a one-time editorial task without a formal FEAT and slice ceremony.
