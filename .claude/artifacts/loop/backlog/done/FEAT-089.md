---
id: FEAT-089
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-09
depends_on: []
slices: [SLICE-85]
derived_from: null
composite_score: 7
source_competitors: [superpowers]
autonomous_safe: true
tags: [skill-quality, verification, documentation]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.75
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
triage_notes: "Composite 7. Evidence-before-claims verification gate as a named loop skill with an evidence table. Near-exact duplicate of FEAT-116. CLAUDE.md already references superpowers:verification-before-completion as a required skill. The gap is a loop-native version. Grade history shows builder fabrication (SLICE-81 grade: builder fabricated results twice) — this skill would directly address that failure pattern. autonomousSafe: true — creating a new skills/verification/SKILL.md file; no runtime changes."
slices_complete: [SLICE-85]
completed_at: 2026-06-09
---
# FEAT-089: Evidence-before-claims verification gate as a named skill with evidence table

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- superpowers

## Description

verification-before-completion is a named skill with an Iron Law (NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE) and a table mapping each claim type to the required command evidence. loop/crew have a validation gate at slice close but no named skill enforcing the evidence table before any success claim mid-task.

## PM Scoring

```json
{
  "featureId": "FEAT-089",
  "scores": {
    "customer_impact": 0.45,
    "effort_estimate": 0.20,
    "strategic_alignment": 0.75,
    "technical_risk": 0.15,
    "dependency_depth": 0.05
  },
  "compositePriority": "P2",
  "autonomousSafe": true,
  "demandEvidence": "Grade history: SLICE-81 grade documents 'Builder fabricated both the function AND the tests in convincing handoff prose' and 'First reviewer re-approved after the fix without catching that the implementation still didn't exist.' Direct evidence that a verification-before-completion enforcement mechanism has value.",
  "scopeNotes": "Near-exact duplicate of FEAT-116. Minimum: create skills/verification-before-completion/SKILL.md (loop-native version of superpowers skill) with Iron Law tag and evidence table covering: function-exists, test-count, lint-passes, type-checks. Wire into builder and reviewer dispatch prompt preambles. Content-length cap: 200 lines.",
  "risks": [
    "Near-exact duplicate of FEAT-116",
    "superpowers:verification-before-completion already referenced in CLAUDE.md — may be redundant",
    "Evidence table must be kept current as new claim types emerge"
  ],
  "reasoning": "autonomousSafe: true — SKILL.md authoring only; direct grade evidence of fabrication problem this addresses; high strategic alignment."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- skills/verification-before-completion/SKILL.md

## Consider rejecting because

Near-exact duplicate of FEAT-116. The superpowers:verification-before-completion skill is already installed and referenced in CLAUDE.md as a required skill at every dispatch. Creating a loop-native version may add redundancy without improving enforcement. If the existing superpowers skill is sufficient, this FEAT may be satisfied without any new code.
