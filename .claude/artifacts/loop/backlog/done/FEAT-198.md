---
id: FEAT-198
status: done
autonomous_safe: true
slices_complete: [SLICE-113]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-113]
derived_from: null
autonomous_safe: true
tags: [pm, agent, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.03
pm_strategic_alignment: 0.85
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
composite_score: 0.7
composite_priority: P1
triage_notes: "FEAT-196 added ToolSearch instruction to pm.md body. v0.43.3 validated 2026-06-12 — PM still saw [Read,Grep,Glob,Bash] only. Root cause: ToolSearch itself is not in PM tools list. Chicken-and-egg — to load deferred Agent, PM needs ToolSearch as base tool. Risk 0.15: trivial frontmatter addition."
github_issue: 240
started_at: 2026-06-12
---
# FEAT-198: PM tools list needs ToolSearch to load deferred Agent

## Problem

v0.43.3 (FEAT-196 / SLICE-112) added a ToolSearch instruction to `agents/pm.md` body. Validated 2026-06-12 by dispatching loop:pm for FEAT-085 retriage. PM reported visible tools = `[Read, Grep, Glob, Bash]` AGAIN. ToolSearch absent. Spec-writer dispatch failed silently a second time.

Root cause: `ToolSearch` itself is a tool, not preloaded. PM cannot invoke ToolSearch without ToolSearch being in its frontmatter `tools` list. Chicken-and-egg.

## Proposal

Add `ToolSearch` to `agents/pm.md` frontmatter `tools` list. Now PM can:
1. Invoke `ToolSearch(query: "select:Agent")` to load Agent's schema.
2. Invoke `Agent(subagent_type: "loop:spec-writer", ...)` to dispatch the rewrite.

## Acceptance criteria

**AC-1**: All tests + lint + tsc clean.

**AC-2**: `agents/pm.md` frontmatter `tools` list includes BOTH `Agent` AND `ToolSearch`. Test asserts both entries are present.

**AC-3** (manual followup): re-run FEAT-085 retriage after v0.43.4 publish. PM should now successfully ToolSearch → load Agent → dispatch spec-writer end-to-end.

## Out of scope

- Reworking Claude Code's deferred-tool model.
- Adding the same pattern to other loop agents (loop:architect, loop:researcher, etc.) — separate audit pass.

## Refs

- `agents/pm.md` — current tools list (missing ToolSearch).
- FEAT-196 / SLICE-112 — added body instruction but not the tool grant.
- 2026-06-12 sample run on FEAT-085 — second validation failure.
