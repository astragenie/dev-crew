---
id: FEAT-097
status: triaged
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
composite_score: 6
source_competitors: [Devin / SWE-Agent]
autonomous_safe: false
tags: [model-routing, cost-optimization]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.25
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.45
pm_technical_risk: 0.65
pm_dependency_depth: 0.2
triage_notes: "Composite 6. Role-specialized model family (purpose-built review/retrieval models). Near-exact duplicate of FEAT-125. SWE-Check and SWE-grep are Devin's proprietary models — this plugin cannot ship them. The actionable gap is updating loop.json modelRouting when new specialized models become available via Claude or other APIs. Configuring loop.json to use a faster review model when available is low-effort; building new models is out of scope."
github_issue: 175
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/175"
---
# FEAT-097: Role-specialized model family (purpose-built review and retrieval models)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

Devin ships SWE-Check (review model matching Opus 4.6 at ~10x speed) and SWE-grep/mini (parallel retrieval specialist) as distinct models per role. loop model-router does phase-based routing but assigns general-purpose models. A purpose-built fast review model would reduce cost and latency at the review gate.

## PM Scoring

```json
{
  "featureId": "FEAT-097",
  "scores": {
    "customer_impact": 0.25,
    "effort_estimate": 0.60,
    "strategic_alignment": 0.45,
    "technical_risk": 0.65,
    "dependency_depth": 0.20
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Devin audit. SWE-Check and SWE-grep are proprietary Cognition models, not available to third-party plugins.",
  "scopeNotes": "Near-exact duplicate of FEAT-125. The actionable subset: update loop.json modelRouting to use haiku or a faster model for retrieval-only passes when that capability becomes available. Building purpose-built models is out of scope.",
  "risks": [
    "Near-exact duplicate of FEAT-125",
    "SWE-Check and SWE-grep are proprietary — cannot be adopted",
    "Smaller/faster models for review may have lower accuracy — needs benchmarking",
    "Dependent on Anthropic model API availability"
  ],
  "reasoning": "P3: proprietary models not adoptable; actionable subset (routing update) is low-impact config change."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://cognition.ai/blog (SWE-Check 04.14.26, SWE-grep 10.16.25)

## Consider rejecting because

Near-exact duplicate of FEAT-125. SWE-Check and SWE-grep are Cognition's proprietary models — this plugin cannot ship or access them. The actionable gap (using a faster/cheaper review model when one becomes available) is a one-line change to loop.json modelRouting, not a feature requiring a FEAT and slices.
