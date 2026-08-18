---
id: FEAT-009
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-284 (git-anchored slice completion silently drops planned work on prose-only commit matches) after P0 parent-estate settlement. 5 of 7 slices already shipped in runner-plugin (src/scripts/lib/slice-linker/git-anchored-completion.mts, src/scripts/lib/proposed-slices.mts): SLICE-188 (real file-touching test fixtures replacing --allow-empty), SLICE-189 (diff-level evidence requirement + AC-7 subject-only token-pair matching), SLICE-190 (downgrade text-only matches to operator-visible warnings), SLICE-192 (materializeProposedSlices rewritten to key off id_suffix identity instead of an existingSlices.length prefix index), and SLICE-194 (AC-8 squash-merge bullet-line matching). Remaining scope: SLICE-191 (migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape so stale legacy stamps are re-derived under the new rules rather than trusted) and SLICE-193 (CLI escape hatch to force-materialize one named proposed slice by id_suffix, so a gapped FEAT can be repaired without calling BacklogStore directly, as the original live repro required). Both are internal backlog-data-model logic, not crew-seam-dependent. Explicitly carry forward an open caveat from runner-plugin's FEAT-284.md 'AC-8b status' section: live-HEAD recognition of real squash-merge evidence (e.g. commit 859be561) is NOT yet satisfied -- commits.find() selects a newer narration commit and never continues to the qualifying one -- and that gap is tracked as a separate defect (runner-plugin's FEAT-294, itself triaged but not yet in-flight) rather than part of SLICE-191/193's scope. Do not treat AC-8b as closed when scoping this carried FEAT.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.