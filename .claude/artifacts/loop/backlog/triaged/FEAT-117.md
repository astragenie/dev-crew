---
id: FEAT-117
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
source_competitors: ["\"Windsurf (Codeium", "now Cognition)\""]
autonomous_safe: false
tags: [workflow, slash-commands, documentation]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.4
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.65
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
triage_notes: "Composite 7. Markdown Workflow recipes with frontmatter + slash invocation. loop already has slash commands via commands/*.md files. The Windsurf-specific innovations are: ordered numbered steps, nested /workflow composition, and auto_execute_steps flag. The 4-tier scope precedence requires multi-environment install setup. Medium strategic alignment. autonomousSafe: false — needs AC definition for how auto_execute_steps interacts with autoMode."
github_issue: 182
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/182"
---
# FEAT-117: Markdown Workflow recipes with frontmatter + slash invocation

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Windsurf (Codeium, now Cognition)

## Description

`.windsurf/workflows/*.md` files with YAML frontmatter (`name`, `description`, `auto_execute_steps`), ordered numbered steps, nested workflow composition (`/workflow-a` calls `/workflow-b`), and a 4-tier scope precedence (system > workspace > global > built-in). Invoked via `/<workflow-name>` slash command. Workspace workflows are git-committed and travel with the codebase.

## PM Scoring

```json
{
  "featureId": "FEAT-117",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.40,
    "strategic_alignment": 0.65,
    "technical_risk": 0.30,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Windsurf audit. Loop commands/*.md files already provide a similar pattern without the frontmatter schema or nested composition.",
  "scopeNotes": "Minimum: add optional frontmatter to existing commands/*.md files (name, description, auto_execute_steps). Nested workflow composition (one command calling another via /command-name) is a separate higher-risk slice. 4-tier scope precedence is out of scope for single-developer plugin.",
  "risks": [
    "4-tier scope precedence implies multi-user/multi-environment setup not applicable here",
    "Nested workflow composition could create infinite loops",
    "auto_execute_steps interaction with autoMode: true needs careful design",
    "Commands/*.md schema change affects all existing commands"
  ],
  "reasoning": "P2: existing commands/*.md pattern partially covers this; frontmatter enrichment is low-risk; nested composition is higher-risk separate slice."
}
```

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://docs.devin.ai/desktop/cascade/workflows

## Consider rejecting because

loop already ships slash commands (commands/*.md) that travel with the codebase. The Windsurf-specific innovations (4-tier scope precedence, nested composition) require multi-environment setup that doesn't apply to a single-developer plugin. The auto_execute_steps flag in auto mode raises safety questions. Existing slash commands cover the most valuable subset already.
