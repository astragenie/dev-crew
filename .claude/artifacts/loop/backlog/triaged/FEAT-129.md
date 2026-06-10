---
id: FEAT-129
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 6
source_competitors: [OpenHands]
autonomous_safe: false
tags: [skill-routing, context-injection, keywords]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.4
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.1
triage_notes: "Composite 6. Keyword-triggered skills (auto-inject prompt fragments by conversation content). Directionally aligned with FEAT-102 (rule activation triggers). A keywords: frontmatter field on SKILL.md + pre-dispatch content scanner is the minimum. Medium-high strategic alignment — would allow tech-specific skills (kubernetes, azure) to auto-activate without manual /skill invocation. autonomousSafe: false — pre-dispatch scanner is new infrastructure with security implications."
github_issue: 184
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/184"
---
# FEAT-129: Keyword-triggered skills (auto-inject prompt fragments by conversation content)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- OpenHands

## Description

OpenHands Skills/microagents declare `trigger: keyword` with a keyword list. When any keyword appears in conversation, the skill body is auto-injected. loop skills are activated by slash command or by routing-table mapping, never by content-aware match. A `keywords:` frontmatter field on `skills/**/SKILL.md` plus a pre-dispatch scanner would let, e.g., a "kubernetes" or "azure" skill auto-activate.

## PM Scoring

```json
{
  "featureId": "FEAT-129",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.45,
    "strategic_alignment": 0.65,
    "technical_risk": 0.40,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from OpenHands audit. Keyword triggering is a subset of FEAT-102 (rule activation triggers with glob/model_decision).",
  "scopeNotes": "Overlaps FEAT-102. Minimum: add optional keywords: [] field to SKILL.md frontmatter; update validate-manifests.mjs to validate field; document convention. The pre-dispatch scanner that reads task content and matches keywords is a separate, more complex slice. Consider consolidating with FEAT-102.",
  "risks": [
    "Overlaps FEAT-102 — may be redundant if FEAT-102 ships first",
    "Keyword matching on conversation content requires access to the dispatch prompt at injection time",
    "Keyword false-positives could inject irrelevant skills and consume context budget",
    "Pre-dispatch scanner adds latency to every dispatch"
  ],
  "reasoning": "P2: useful for tech-specific skill auto-activation; overlaps FEAT-102; scanner latency and false-positive risks need mitigation."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://github.com/OpenHands/OpenHands/blob/main/skills/README.md ; https://docs.openhands.dev/overview/skills

## Consider rejecting because

Heavily overlaps FEAT-102 (rule activation triggers). Keyword matching on free-form conversation content is noisy — a "kubernetes" mention in a cost discussion should not inject the kubernetes skill. If FEAT-102 ships with model_decision trigger, it covers keyword-like relevance matching in a more principled way. Consolidate with FEAT-102 rather than treating separately.
