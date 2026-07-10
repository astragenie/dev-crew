---
id: PM-REVIEW-FEAT-255
feature: FEAT-255
reviewed_at: 2026-07-09
pm_customer_impact: 0.3
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.5
pm_technical_risk: 0.25
pm_dependency_depth: 0.3
composite_priority: P3
autonomous_safe: false
---
# PM Review — FEAT-255

## Demand Assessment

- **Evidence:** Review COND-E (finding 6, [MODERATE]): 'Bundled AC not verifiable from this repo's CI (dev-team prompt scan is cross-repo) -- split into in-repo CI AC + manual Phase 6 verification.' Plan Context section: 'dev-team prompt offender (only one across both repos): commands/architect-feature.md Step 3 (lines ~128-148) hand-writes FEAT frontmatter tags' -- a concretely identified, single offending file, not a broad audit.

## Scope Challenge

- **Scope notes:** Smallest in-repo deliverable: the backlog tag-merge --id FEAT-NNN --tags a,b CLI subcommand routed through BacklogStore (depends_on FEAT-250 for that routing to exist) plus docs updates (CLAUDE.md, halt-badges.md if new badges, CHANGELOG, loop-snapshot regen -- snapshot-freshness CI gate already exists per CLAUDE.md). The dev-team rewrite (item 2) and the cross-repo prompt-scan re-run (item 3) are explicitly 'NOT a CI AC of this repo' per COND-E and touch a sibling repo (dev-team) this loop doesn't own -- that portion cannot be autonomous_safe inside runner-plugin's own dispatch/CI loop and should be filed/executed as a separate dev-team-side FEAT or an explicit manual step, not folded silently into this FEAT's autonomous slices. No weak grade dimensions to target. No cost analog found for a CLI-subcommand+docs-only slice of this shape; scored from the effort table.

## Scores

- customer_impact: 0.30
- effort_estimate: 0.30
- strategic_alignment: 0.50
- technical_risk: 0.25
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P3
autonomous_safe: false
reasoning: Low-risk, low-effort program closeout (known CLI pattern + docs, technical_risk 0.25: known repo pattern, 1-2 modules, clean rollback); real but narrow demand evidence (one identified offending file); the in-repo portion is autonomous_safe but the cross-repo dev-team edit sits outside this FEAT's own CI/dispatch authority -- autonomousSafe false at the FEAT level pending a slice split that isolates the in-repo CLI+docs work from the cross-repo manual step, P3.

## Risks

- Cross-repo scope creep: if a builder treats items 1-4 as one undifferentiated slice, the dev-team edit (item 2) either gets skipped silently (COND-E's manual step never happens) or a builder attempts an out-of-repo edit outside its authorized worktree.
- Hard-blocked on FEAT-250 (BacklogStore) landing first since tag-merge is specified to route through it, not legacy backlog-writer.mts.
