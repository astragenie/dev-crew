---
id: FEAT-088
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 7
source_competitors: [superpowers]
autonomous_safe: true
tags: [skill-quality, conventions, documentation]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.40
pm_effort_estimate: 0.20
pm_strategic_alignment: 0.70
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
triage_notes: "Composite 7. Iron Law hard-gate tag convention in skill Markdown. Near-exact duplicate of FEAT-115. This is a pure documentation/convention change — add XML-like HARD-GATE and EXTREMELY-IMPORTANT tags to owned SKILL.md files. validate-content-length.mjs already enforces line caps; no new validator needed for initial adoption. autonomousSafe: true — bounded to owned skills/*.md files, no runtime behavior change, content-length check still passes."
---
# FEAT-088: Iron Law hard-gate tag convention in skill Markdown

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- superpowers

## Description

Superpowers uses HARD-GATE and EXTREMELY-IMPORTANT XML-like tags in skill Markdown with tested behaviour-shaping efficacy. loop/crew use free-form HARD RULE prose but lack the standardised tag framing that makes violations explicit and self-documenting.

## PM Scoring

```json
{
  "featureId": "FEAT-088",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.20,
    "strategic_alignment": 0.70,
    "technical_risk": 0.15,
    "dependency_depth": 0.05
  },
  "compositePriority": "P2",
  "autonomousSafe": true,
  "demandEvidence": "none — inferred from superpowers audit. HARD RULE prose already used in CLAUDE.md and loop/rules.md; this standardises the framing.",
  "scopeNotes": "Near-exact duplicate of FEAT-115. Minimum: define the tag convention in docs/code-conventions.md; retrofit 3-5 highest-impact HARD RULE blocks in owned SKILL.md files (e.g., loop:pm, loop:architect). AC: before/after diff on at least 3 skill files; no content-length violations.",
  "risks": [
    "Near-exact duplicate of FEAT-115",
    "XML-like tags in Markdown are a convention, not enforced — LLM may still ignore them",
    "Content-length cap (200 lines for SKILL.md) may be tight if tags add visual bulk"
  ],
  "reasoning": "autonomousSafe: true — pure doc/convention change to owned skill files; low risk, bounded scope, no runtime changes."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- skills/brainstorming/SKILL.md, skills/test-driven-development/SKILL.md, skills/verification-before-completion/SKILL.md

## Consider rejecting because

Near-exact duplicate of FEAT-115. The efficacy of XML-like tags vs. plain HARD RULE prose in LLM instruction-following is not proven in this codebase specifically. If the tags add line bulk and push SKILL.md files against the 200-line cap, the convention may conflict with the existing content-length enforcement.
