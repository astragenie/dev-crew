---
id: FEAT-196
status: done
autonomous_safe: true
slices_complete: [SLICE-112]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-112]
derived_from: null
autonomous_safe: true
tags: [pm, agent, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.05
pm_strategic_alignment: 0.85
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_score: 0.7
composite_priority: P1
triage_notes: "FEAT-195 granted Agent in pm.md frontmatter but PM doesn't ToolSearch for it. Agent is a deferred tool — frontmatter grant is necessary but not sufficient. Validated 2026-06-12 retriage run on FEAT-085: PM saw Read/Grep/Glob/Bash only, never tried ToolSearch, fell into needs-review escalation. Trivial fix: add a ToolSearch step to pm.md body before any Agent dispatch. Risk 0.2: prompt-level change."
github_issue: 237
started_at: 2026-06-12
---
# FEAT-196: PM agent must ToolSearch for Agent before spec-writer dispatch

## Problem

FEAT-195 (SLICE-111) added `Agent` to `agents/pm.md` frontmatter `tools`. Validated 2026-06-12 by dispatching `loop:pm` for FEAT-085 retriage. Result: PM reported visible tools = `[Read, Grep, Glob, Bash]`, no Agent. PM did NOT try ToolSearch. Fell into needs-review escalation. Self-heal path still broken.

Root cause: Agent is a **deferred tool** in the Claude Code plugin system. Frontmatter `tools: Agent` grants permission, but the Agent schema must be loaded via `ToolSearch(query: "select:Agent")` before PM can invoke it. PM's prompt today doesn't instruct it to ToolSearch.

## Proposal

Add a ToolSearch step to `agents/pm.md` body — pinned to the dispatch-discipline section added in SLICE-111. When PM is about to dispatch `loop:spec-writer`, it MUST first call `ToolSearch(query: "select:Agent")` to load Agent's schema.

## Acceptance criteria

**AC-1**: All tests + lint + tsc clean.

**AC-2**: `agents/pm.md` body contains an explicit ToolSearch step before any Agent dispatch instruction. Test grep anchors on `ToolSearch` + `select:Agent`.

**AC-3**: The dispatch-discipline section from SLICE-111 is updated to include the ToolSearch step as a precondition. Test verifies discipline section + ToolSearch line are adjacent.

**AC-4** (manual followup): re-run FEAT-085 retriage after v0.43.3 publish. PM should successfully ToolSearch Agent → dispatch spec-writer → wait → re-read → score with `acClarity: { rewrite: true, rewriteDispatchOk: true }`.

## Out of scope

- Auto-loading Agent at PM dispatch time (would require plugin-side wiring beyond pm.md).
- Adding ToolSearch to other PM-list sub-agents — only spec-writer is dispatched inline per FEAT-195 discipline.

## Refs

- `agents/pm.md` — dispatch-discipline section from SLICE-111.
- 2026-06-12 retriage validation run — Agent absent from PM tool surface.
- CLAUDE.md note on deferred tools (crew:lead Agent grant pattern).
