---
id: FEAT-111
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
source_competitors: [GitHub Copilot Workspace / GitHub Copilot App]
autonomous_safe: true
tags: [workflow, backlog, github-integration]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
triage_notes: "Composite 7. One-click task ingress from GitHub Issue/PR via /loop:backlog-add --from-issue <url>. High strategic alignment — gh CLI is already used; loop.json github.enabled: true. This is a well-scoped addition to an existing command. autonomousSafe: true — extends /loop:backlog-add with an optional flag; bounded to FEAT file creation using gh issue view output."
github_issue: 180
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/180"
---
# FEAT-111: One-click platform-native task ingress from Issue / PR

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- GitHub Copilot Workspace / GitHub Copilot App

## Description

Original Workspace shipped "Open in Workspace" buttons on every GitHub Issue and PR -- the system pulled issue title, body, and comment thread as task context. loop's `/loop:backlog-add` requires the user to translate the issue into FEAT frontmatter manually. A `/loop:backlog-add --from-issue <url>` flag (using `gh` CLI) that pre-fills frontmatter from issue metadata and links the FEAT to the issue would close most of this gap.

## PM Scoring

```json
{
  "featureId": "FEAT-111",
  "scores": {
    "customer_impact": 0.45,
    "effort_estimate": 0.30,
    "strategic_alignment": 0.75,
    "technical_risk": 0.25,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": true,
  "demandEvidence": "none — inferred from Copilot Workspace audit. loop.json github.enabled: true indicates GitHub integration is a planned direction. gh CLI already used in slice-complete ceremony.",
  "scopeNotes": "Minimum: add --from-issue <url> flag to the /loop:backlog-add slash command; use gh issue view --json title,body,url to pre-fill FEAT title, description, and a github_issue_url field. Error gracefully if gh is not configured or issue is private. Acceptance criteria are clear and testable.",
  "risks": [
    "Requires gh CLI to be authenticated and configured — graceful error needed",
    "Issue body may contain non-FEAT content — parser needs to handle noise",
    "github.repo in loop.json is currently null — may need to be set for org issues"
  ],
  "reasoning": "autonomousSafe: true — bounded FEAT file creation using gh CLI; well-scoped single command extension with clear AC."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://github.com/githubnext/copilot-workspace-user-manual/blob/main/overview.md (task entry points: Issues, PRs, Templates)
- loop.json github section

## Consider rejecting because

No strong objection. The --from-issue flag is a clean extension of an existing command using already-installed infrastructure (gh CLI). The main caveat is that github.repo in loop.json is currently null and may need to be populated for private org repos.
