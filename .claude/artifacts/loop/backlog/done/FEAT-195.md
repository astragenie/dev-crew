---
id: FEAT-195
status: done
autonomous_safe: true
slices_complete: [SLICE-111]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-111]
derived_from: null
autonomous_safe: true
tags: [pm, agent, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.1
pm_strategic_alignment: 0.8
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
composite_score: 0.7
composite_priority: P1
triage_notes: "Retriage gate currently broken-by-design — verified by sample run on 3 FEATs 2026-06-12. PM frontmatter tools omits Agent, so gate step 4 (dispatch spec-writer) escalates to needs-review every time. Fix: add Agent to PM tools allowlist. Risk 0.3: PM gains general subagent dispatch power, weakens read-only principle. Effort 0.1: 4-line frontmatter edit + agent prompt note + tests."
github_issue: 235
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/235"
started_at: 2026-06-12
---
# FEAT-195: Grant PM Agent tool to enable retriage spec-writer dispatch

## Problem

The `/loop:retriage` flow (FEAT-193) requires PM to dispatch `loop:spec-writer` mid-flight when AC are vague. Sample retriage run on 2026-06-12 (3 FEATs: 176, 085, 100) confirmed PM cannot do this — `agents/pm.md` frontmatter omits the `Agent` tool. Gate step 4 fails immediately; PM falls through to step 6 (needs-review escalation) on every AC-vague FEAT.

Effect: retriage degrades to "flag for human" instead of "self-heal AC then re-score". Loses most of its value.

## Proposal

Add `Agent` to PM's frontmatter `tools` list. PM gains the ability to dispatch `loop:spec-writer` (and only spec-writer in normal flow — the agent prompt restricts what PM may dispatch).

Trade-off: PM is no longer strictly read-only. Mitigation: agent prompt + description string explicitly limit PM's dispatch scope to `loop:spec-writer` for AC rewrites only. Any other dispatch would be a prompt-discipline violation, caught at review.

## Acceptance criteria

**AC-1**: All tests pass + lint clean + tsc clean.

**AC-2** (frontmatter): `agents/pm.md` frontmatter `tools` includes `Agent`. Grep test pins the addition.

**AC-3** (description string): `agents/pm.md` frontmatter `description:` updated to drop "Read-only" claim and replace with "Read-mostly — dispatches loop:spec-writer when AC need normalization". Test anchors on the new wording.

**AC-4** (agent prompt restriction): `agents/pm.md` body adds an explicit rule: "You MAY dispatch `loop:spec-writer` ONLY for AC rewrites under the retriage gate. Any other subagent dispatch is a prompt-discipline violation." Test anchors on this rule.

**AC-5** (sample retriage re-run): manual verification after slice ships — re-run the sample on FEAT-085 or FEAT-100; PM should now successfully dispatch spec-writer, wait, re-read, and emit a non-needs-review verdict. Documented in slice grade.

## Out of scope

- Restructuring to a two-phase PM↔spec-writer flow (option B from the retriage validation discussion).
- Granting PM Write/Edit tools (still read-only on the filesystem).
- Auditing PM's existing prompt for other subagent-dispatch language (already covered in `agents/pm.md` § "Sub-agents you may dispatch" — currently mentions loop:spec-writer + loop:researcher).

## Refs

- `agents/pm.md` — current frontmatter + sub-agents section.
- `commands/retriage.md` — gate step 4 contract.
- Sample retriage run 2026-06-12 — surfaced the wiring bug across FEAT-176/085/100.
