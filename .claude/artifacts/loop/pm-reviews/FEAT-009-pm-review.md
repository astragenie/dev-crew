---
id: PM-REVIEW-FEAT-009
feature: FEAT-009
reviewed_at: 2026-08-19
pm_customer_impact: 0.45
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.55
pm_technical_risk: 0.6
pm_dependency_depth: 0.3
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-009

## Demand Assessment

- **Evidence:** 5 of 7 slices of the parent FEAT (runner-plugin FEAT-284) already shipped and are load-bearing (src/scripts/lib/slice-linker/git-anchored-completion.mts, src/scripts/lib/proposed-slices.mts). The remaining two pieces (SLICE-191 frontmatter migration, SLICE-193 CLI escape hatch) are the original live-repro's actual remediation path, not speculative scope.

## Scope Challenge

- **Scope notes:** Two bounded pieces: (1) migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape so stale legacy stamps are re-derived under the new matching rules rather than blindly trusted, and (2) a CLI escape hatch to force-materialize one named proposed slice by id_suffix (bypassing direct BacklogStore calls, mirroring how the original live repro was repaired). Explicitly excludes AC-8b (live-HEAD squash-merge recognition, commit 859be561 class) -- that gap is tracked separately (runner-plugin FEAT-294, itself only triaged, not yet in-flight) and must not be treated as closed by this FEAT.

## Scores

- customer_impact: 0.45
- effort_estimate: 0.45
- strategic_alignment: 0.55
- technical_risk: 0.60
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Data-model correctness work on already-shipped, load-bearing code; technical_risk sits at the top of the 0.4-0.5 new-pattern band (0.6) because it is a frontmatter shape migration across ~200 pre-existing entries, which is why the pre-mortem above is included even though the composite lands at P2.

## Risks

- It is two weeks later and this slice failed review or validation -- most likely cause: the index-prefix-to-id_suffix frontmatter migration mis-maps one of the ~200 pre-existing legacy stamps, silently re-flagging an already-shipped slice as unshipped (or vice versa) on the next slice-from-feature run.
- This merged and broke the loop -- rollback requires more than git revert: any FEAT whose frontmatter was already rewritten to the new keyed shape before the revert would need a data-cleanup pass, since the revert restores old code but not old frontmatter.
- Which existing test would NOT catch a regression here: a test asserting only on freshly-created FEATs (id_suffix present from creation) would miss a regression specific to the ~200 pre-existing slices relying on the untouched title-match legacy fallback -- coverage must include at least one pre-existing-format fixture.
- FEAT-010 (same session's other carried item) touches the same file, src/scripts/lib/proposed-slices.mts, for a different defect (trim-before-validate, uniqueness checks) -- sequencing risk if both are built in parallel worktrees without coordination; recommend building FEAT-010 first since it is smaller and higher priority, then rebasing FEAT-009's slice on top.
