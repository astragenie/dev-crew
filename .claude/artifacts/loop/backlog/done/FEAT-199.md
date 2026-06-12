---
id: FEAT-199
status: done
autonomous_safe: true
slices_complete: [SLICE-114]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-114]
derived_from: null
autonomous_safe: true
tags: [pm, agent, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.03
pm_strategic_alignment: 0.85
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_score: 0.7
composite_priority: P1
triage_notes: "Three releases (v0.43.2/3/4) failed to surface Agent in PM dispatch. Compared frontmatter to working examples: crew:architect has model: opus + effort: high + maxTurns: 30. loop:hierarchical-dispatcher has maxTurns: 30. PM has neither. Hypothesis: Agent tool only surfaces for opus-tier + sufficient maxTurns. Risk 0.2: frontmatter add."
github_issue: 242
started_at: 2026-06-12
---
# FEAT-199: PM frontmatter needs model+maxTurns to surface deferred Agent

## Problem

Three iterations (FEAT-195 grant Agent, FEAT-196 add ToolSearch instruction, FEAT-198 grant ToolSearch) all failed to surface Agent + ToolSearch in PM's dispatch tool surface. Comparison with working examples:

- `crew:architect` — `model: opus`, `effort: high`, `maxTurns: 30`, has Agent ✓
- `loop:hierarchical-dispatcher` — `maxTurns: 30`, has Agent ✓
- `loop:document-writer` — block-list tools with Agent (untested at dispatch time)
- `loop:pm` — no model, no maxTurns, has Agent + ToolSearch → fails

Hypothesis: deferred tools (Agent, ToolSearch) only surface when the agent declares `model:` (probably `opus`) and `maxTurns:` (high enough for orchestration). Sonnet-tier subagents may be platform-restricted to base tools.

## Proposal

Add to `agents/pm.md` frontmatter:
```yaml
model: opus
maxTurns: 30
```

## Acceptance criteria

**AC-1**: All tests + lint + tsc clean.

**AC-2**: `agents/pm.md` frontmatter declares `model:` (opus) and `maxTurns:` (>= 30). Test grep.

**AC-3** (manual followup): re-run FEAT-085 retriage after v0.43.5 publish. PM should now see Agent + ToolSearch in tool surface and complete the gate end-to-end.

## Out of scope

- Migrating other loop agents to declare model/maxTurns — separate audit.
- Reframing retriage as flag-for-human if AC-3 still fails.

## Refs

- `agents/pm.md` — missing model/maxTurns.
- `crew:architect`, `loop:hierarchical-dispatcher` — working examples with model+maxTurns.
- FEAT-195/196/198 — prior failed iterations.
