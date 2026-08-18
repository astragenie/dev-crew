---
id: FEAT-005
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: [FEAT-004]
slices: []
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.75
pm_technical_risk: 0.7
pm_dependency_depth: 0.85
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: false
triage_notes: "8-point epic, mandatory decomposition; technical_risk banded 0.7 (large deletions plus a self-admitted disposition landmine, but no cross-plugin/public contract change, so kept below 0.9); autonomousSafe=false given the deepest dependency chain of any phase (4 unresolved predecessors) and the GEPA landmine's demonstrated history of mis-scoping in this very plan."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Validator dedupe + dead-path purge (ai-loop/backlog/pending-dispatch)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "GEPA 27-file disposition table (import-closure trace, no deletions)"
    points: 1
    estimated_tokens: 90000
  - id_suffix: -SLICE-2
    title: GEPA delete per approved table + archive trials imported-from-stamped
    points: 1
    estimated_tokens: 140000
  - id_suffix: -SLICE-3
    title: "Delete auto-dispatch, claims/approvals, preset-retrofit"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Merged CI workflow (~30 gates) + clause-registry port
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: Docs merge + CLAUDE.md <=12KB budget triage
    points: 1
    estimated_tokens: 60000
tags: ["stack:typescript", "area:ci-tooling", "concern:content-cleanup"]
needs_contract: false
needs_ux: false
arch_attempt: 0
arch_status: approved
arch_review: approved
---
## Description

P4 Content + CI: dedupe validators (org-refs/agent-refs/manifests keep runner's, widen scope); merged CI workflow ~30 gates incl wiggin-term sweep; GEPA 27-file disposition table via import-closure of gepa-eval/history/invalidate + evals harness, delete rest incl champion-provenance-writer, archive trials imported-from-stamped; delete auto-dispatch.mts + ~275 LOC readers, claims/approvals (775 LOC), preset-retrofit; purge dead paths (docs/ai-loop 9 files, docs/backlog 10, pending-dispatch 11); docs merge; merged CLAUDE.md <=12KB pre-include; greenfield candidates: unified .claude/artifacts/devcrew taxonomy, backlog frontmatter-status-not-directory-move redesign. Exit gates: CI green end-to-end, wiggin sweep green tree-wide, clause citations resolve, GEPA table covers all 27 files, improve-cleanup.md inventory fully dispositioned. Full spec: unification-plan.md sections 5/7 + P4 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the merged CI workflow is authored, When the full gate list runs on main, Then all ~30 gates exit 0 (CI green end-to-end).
- AC-2: Given the wiggin-term sweep gate is added, When it runs against the full merged tree (not just the P1 import diff), Then zero matches remain outside any explicitly archived parent-repo directory.
- AC-3: Given scripts/lib/gepa/ contains 27 files, When the import-closure trace (starting from gepa-eval/gepa-history/gepa-invalidate + the evals/ harness) runs, Then the disposition table names all 27 files individually as KEEP or DELETE -- a table covering fewer than 27 files fails this AC, and any file marked DELETE that is still imported by a kept command also fails it.
- AC-4: Given the merged CLAUDE.md must stay <=12KB pre-include, When `wc -c CLAUDE.md` (excluding @include expansions) runs after the docs-merge slice, Then the byte count is <=12288.
- AC-5: Given improve-cleanup.md's deletion inventory lists ~38 files, When the P4 slices close, Then every listed item has a recorded disposition (DELETE executed / ARCHIVE executed / MERGE executed / explicitly DEFERRED with a written reason) -- an item with no disposition record fails this AC.

## Proposed slices (PM decomposition)

- SLICE-1: Validator dedupe + dead-path purge (ai-loop/backlog/pending-dispatch) (2 pts)
- SLICE-2: GEPA 27-file disposition table (import-closure trace, no deletions) (1 pts)
- SLICE-2: GEPA delete per approved table + archive trials imported-from-stamped (1 pts)
- SLICE-3: Delete auto-dispatch, claims/approvals, preset-retrofit (2 pts)
- SLICE-4: Merged CI workflow (~30 gates) + clause-registry port (2 pts)
- SLICE-5: Docs merge + CLAUDE.md <=12KB budget triage (1 pts)
