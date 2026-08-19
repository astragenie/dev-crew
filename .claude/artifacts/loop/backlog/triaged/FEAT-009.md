---
id: FEAT-009
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.55
pm_technical_risk: 0.6
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Data-model correctness work on already-shipped, load-bearing code; technical_risk sits at the top of the 0.4-0.5 new-pattern band (0.6) because it is a frontmatter shape migration across ~200 pre-existing entries, which is why the pre-mortem above is included even though the composite lands at P2."
tags: ["stack:typescript", "area:backlog-data-model", "concern:data-migration"]
needs_contract: false
needs_ux: false
---
## Description

Carried from runner-plugin FEAT-284 (git-anchored slice completion silently drops planned work on prose-only commit matches) after P0 parent-estate settlement. 5 of 7 slices already shipped in runner-plugin (src/scripts/lib/slice-linker/git-anchored-completion.mts, src/scripts/lib/proposed-slices.mts): SLICE-188 (real file-touching test fixtures replacing --allow-empty), SLICE-189 (diff-level evidence requirement + AC-7 subject-only token-pair matching), SLICE-190 (downgrade text-only matches to operator-visible warnings), SLICE-192 (materializeProposedSlices rewritten to key off id_suffix identity instead of an existingSlices.length prefix index), and SLICE-194 (AC-8 squash-merge bullet-line matching). Remaining scope: SLICE-191 (migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape so stale legacy stamps are re-derived under the new rules rather than trusted) and SLICE-193 (CLI escape hatch to force-materialize one named proposed slice by id_suffix, so a gapped FEAT can be repaired without calling BacklogStore directly, as the original live repro required). Both are internal backlog-data-model logic, not crew-seam-dependent. Explicitly carry forward an open caveat from runner-plugin's FEAT-284.md 'AC-8b status' section: live-HEAD recognition of real squash-merge evidence (e.g. commit 859be561) is NOT yet satisfied -- commits.find() selects a newer narration commit and never continues to the qualifying one -- and that gap is tracked as a separate defect (runner-plugin's FEAT-294, itself triaged but not yet in-flight) rather than part of SLICE-191/193's scope. Do not treat AC-8b as closed when scoping this carried FEAT.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a FEAT whose proposed_slices_shipped frontmatter uses the old index-prefix shape, When the migration runs, Then it is rewritten to a per-id_suffix keyed shape and the FEAT's shipped/unshipped status for every existing entry is preserved exactly (no false-positive or false-negative re-flags).
- AC-2: Given a FEAT with a gap in its materialized proposed_slices (one named entry never created), When an operator runs the new CLI escape hatch with that FEAT id and the target id_suffix, Then exactly that one slice is force-materialized without requiring direct BacklogStore access.
- AC-3: Given the AC-8b squash-merge live-HEAD recognition gap (commits.find() selecting a newer narration commit over the qualifying one), When this FEAT's slices are graded/closed, Then the grade/close artifact explicitly notes AC-8b remains open and tracked under runner-plugin FEAT-294, not silently marked satisfied.
- AC-4: Given repeated reruns of slice-from-feature against the same FEAT after the migration lands, When the regression test suite runs, Then it asserts zero growth in duplicate or orphaned proposed-slice entries across at least 3 simulated reruns.
