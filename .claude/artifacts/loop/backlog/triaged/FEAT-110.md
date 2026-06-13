---
id: FEAT-110
status: in-progress
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-129]
derived_from: null
composite_score: 7
source_competitors: [GitHub Copilot Workspace / GitHub Copilot App]
autonomous_safe: false
tags: [workflow, pr-lifecycle, ci-integration]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.7
pm_technical_risk: 0.6
pm_dependency_depth: 0.25
triage_notes: "Composite 7. Agent Merge — closed-loop PR follow-through. Overlaps FEAT-084 (Devin autofix) and FEAT-107. Impact: 3 in original. The GitHub Copilot App integration angle is more approachable than Devin's proprietary monitoring because GitHub owns the PR/check APIs and loop already uses gh CLI. autonomousSafe: false — requires architect design for the polling/event loop and safety gates."
github_issue: 179
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/179"
started_at: 2026-06-13
---
# FEAT-110: Agent Merge -- closed-loop PR follow-through that fixes failing checks and addresses review comments

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- GitHub Copilot Workspace / GitHub Copilot App

## Description

GitHub Copilot App (2026-05) ships "Agent Merge" -- after PR open, the agent iterates on review comments and failing checks until merge conditions are met. Maps directly to loop's deployer + reviewer phase; loop / crew have no post-PR-open monitor that closes the loop on lint, CI, and reviewer comments. (This overlaps with the Devin autofix gap, but Agent Merge is now in a mainstream GitHub product surface and the integration story is cleaner because GitHub owns the check / review APIs.)

## PM Scoring

```json
{
  "featureId": "FEAT-110",
  "scores": {
    "customer_impact": 0.55,
    "effort_estimate": 0.65,
    "strategic_alignment": 0.70,
    "technical_risk": 0.60,
    "dependency_depth": 0.25
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from GitHub Copilot App audit. gh CLI already used in loop; GitHub check/review APIs are accessible. This is the most implementable version of the PR-autofix gap because it uses standard GitHub APIs.",
  "scopeNotes": "Overlaps FEAT-084 and FEAT-107. Minimum: /loop:pr-watch [PR-URL] that polls gh pr checks, extracts failing check names, dispatches crew:builder with fix instructions, and loops until all checks pass or max_retry exceeded. Security gate: only act on failing CI checks, not on human review comments (prompt injection risk).",
  "risks": [
    "Overlaps FEAT-084 (Devin) and FEAT-107 (duplicate) — consolidate before slicing",
    "Runaway cost if CI keeps failing",
    "Acting on human review comments without a human-in-the-loop gate risks adversarial edits",
    "gh CLI polling adds latency; GitHub webhooks would be more efficient but require server infrastructure"
  ],
  "reasoning": "P2: real pain, highest-quality implementation path via gh CLI, but overlap with FEAT-084/107 needs consolidation first."
}
```

## Scoring

- Impact: 3
- Effort: 2
- Fit: 3
- Composite: 7 / 9

## References

- https://github.blog/changelog/2026-05-14-github-copilot-app-is-now-available-in-technical-preview/

## Consider rejecting because

Overlaps FEAT-084 and FEAT-107 — consolidation is needed before slicing. Security concern: acting on automated bot comments and human review comments without a review gate is a prompt-injection risk. The gh polling approach adds latency and ongoing infrastructure concerns.
