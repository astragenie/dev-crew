---
id: FEAT-134
status: done
priority: P1
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-09
depends_on: []
slices: [SLICE-84]
derived_from: null
composite_score: 8
source_competitors: ["\\"Windsurf (Codeium", "now Cognition)\\""]
autonomous_safe: true
tags: [skills, context-budget, rules]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.8
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
triage_notes: "TOP PRIORITY. Adding a 'trigger' frontmatter field to SKILL.md files is a non-breaking schema extension with well-defined semantics. model_decision trigger (lazy-load) is particularly valuable for context-budget discipline — directly serves the plugin's autonomous loop mission. Scope is bounded: frontmatter parser + dispatch routing table update. autonomous_safe: true because no new external deps and change is additive."
slices_complete: [SLICE-84]
completed_at: 2026-06-09
---
# FEAT-134: Rule activation triggers (`always_on` | `model_decision` | `glob` | `manual`)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Windsurf (Codeium, now Cognition)

## Description

Rules declare a `trigger` field in YAML frontmatter that controls when they get injected into the agent context. `model_decision` (only description shown initially, full content fetched on relevance) is particularly powerful for context-budget discipline; `glob` ties rules to file patterns (`globs: **/*.test.ts`); `manual` activates only on `@rule-name` mention.

## Scoring

- Impact: 3
- Effort: 1
- Fit: 3
- Composite: 8 / 9

## References

- https://docs.devin.ai/desktop/cascade/memories

## PM Scoring

```json
{
  "featureId": "FEAT-134",
  "scores": {
    "customer_impact": 0.70,
    "effort_estimate": 0.30,
    "strategic_alignment": 0.80,
    "technical_risk": 0.20,
    "dependency_depth": 0.10
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "Competitor gap audit 2026-05-28 (Windsurf Cascade). Context-budget discipline is a documented pain point in loop grades (redundantReadStop halt-badge, FEAT-057). The model_decision trigger directly addresses context inflation from always-on skills. skills/ directory already has SKILL.md frontmatter schema — trigger is a non-breaking additive field.",
  "scopeNotes": "Minimum deliverable: define trigger field in SKILL.md schema docs; add trigger parsing to skill loader; implement always_on (default, backward-compat), manual (skip unless @skill-name in prompt), and glob (skip unless active file matches). model_decision (lazy-load description only) is stretch — can be a second slice. One slice for the parser + routing table change.",
  "risks": [
    "model_decision trigger requires a two-phase fetch mechanism (description first, full body on relevance) — this is the complex part; defer to slice 2",
    "glob matching at dispatch time requires knowing the active file context, which may not be available in all dispatch paths"
  ],
  "reasoning": "P1 autonomous_safe: composite 8/9, additive schema extension, directly reduces context inflation, bounded implementation with clear scope split."
}
```

## Consider rejecting because

No strong objection. The `always_on` default preserves backward compatibility. Partial implementation (always_on + manual triggers only, no model_decision) still delivers standalone value.
