---
id: PM-REVIEW-FEAT-284
feature: FEAT-284
reviewed_at: 2026-08-04
pm_customer_impact: 0.9
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.8
pm_technical_risk: 0.7
pm_dependency_depth: 0.1
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-284

## Demand Assessment

- **Evidence:** Live-fired same-day (2026-08-04) in this repo against FEAT-259: commit 71604bb4 (docs-only, one new file under docs/research/ plus backlog frontmatter, zero implementation) contained the prose 'run before committing FEAT-259's SLICE-1 to a design', which matched git-anchored-completion.mts's text pattern and silently advanced reconcileProposedSlicesStartIndex past -SLICE-1. -SLICE-1 was the FEAT's report-gate hook, described in the FEAT body as 'the highest-ROI mechanism in the whole FEAT'. Independently verified absent: .claude-plugin/hooks/hooks.json's SubagentStop array holds only emit-astrarunner-event.mjs and capture-at-close.mjs, no report-gate entry. A second from-feature run then duplicated -SLICE-5 (idle-ping suppression) and published a redundant GitHub issue, while -SLICE-1 remained missing; repair required bypassing the CLI entirely via direct BacklogStore API calls.

## Scope Challenge

- **Scope notes:** No directly comparable past slice found (no cost analog) — effort_estimate is set from blast radius: two source files (git-anchored-completion.mts's evidence classification + feature-lifecycle.mts's materializeProposedSlices/reconcileProposedSlicesStartIndex), a frontmatter contract change to proposed_slices_shipped's shape, a new CLI subcommand, AND a mandatory test-fixture rebuild. Confirmed by reading src/tests/git-anchored-completion.test.mts:55-64 — the tmpGitRepo helper creates every fixture commit with `git commit --allow-empty`, so the entire existing suite is structurally blind to diff content; that is why the diff-blindness defect was never caught, and it means the new diff-corroboration code path ships with zero coverage unless the fixtures are rebuilt to include real file-touching commits alongside the existing empty-diff ones. That rebuild is treated as its own slice (real work, not incidental). Weak-dimension check against loop-snapshot.md's last-5 grade averages: all 7 dimensions are >=0.80 (lowest is architecture_quality 0.846), so no weak-dimension AC gate applies. Decomposition gate (policy a): five landmines identified below, each isolated into its own slice; the CLI escape hatch is left as the sixth, comparatively mechanical once the keyed model exists.

## Scores

- customer_impact: 0.90
- effort_estimate: 0.70
- strategic_alignment: 0.80
- technical_risk: 0.70
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: Verified live silent-data-loss defect in a core cross-repo contract (git-anchored slice completion) that already dropped a FEAT's highest-value slice and produced a duplicate materialization + redundant GitHub issue with no CLI repair path; technical_risk banded 0.6-0.8 per the rubric because the fix is a schema/data-shape change to proposed_slices_shipped frontmatter with cross-module reach, and effort bumped to 0.7 because the existing test suite's --allow-empty fixtures (confirmed at git-anchored-completion.test.mts:55-64) must be rebuilt from scratch to give the new diff-corroboration logic any real coverage.

## Risks

- Pre-mortem Q1 (failure cause): the diff-corroboration heuristic comparing a commit's changed paths against a proposed slice's declared touches_files has no fallback spec for slices that never declared touches_files — an under-specified fallback could downgrade genuinely-shipped evidence to a warning, regressing the false-negative direction symmetric to FEAT-284's original false-positive bug.
- Pre-mortem Q2 (rollback cost): a plain git revert of feature-lifecycle.mts/git-anchored-completion.mts is clean, but any FEAT frontmatter already stamped with the new per-id_suffix proposed_slices_shipped shape needs a state-cleanup pass — reverted code reading the new shape would silently see it as absent evidence.
- Pre-mortem Q3 (coverage gap): the entire git-anchored-completion.test.mts suite uses --allow-empty fixture commits (tmpGitRepo helper, lines 55-64) — this is the structural reason the live bug shipped uncaught, and any regression test for AC-1/AC-2 that reuses the existing helper unmodified will falsely pass regardless of whether diff-corroboration logic actually works.
- This module ships to every adopter repo installing runner-plugin — the same silent-skip failure mode reproduces in every downstream install with no local repro to alert the operator, which is why customer_impact is scored high despite only one team having hit it so far.
- The prefix-advance-to-per-ordinal-keyed migration touches durable on-disk state that already contains at least one live-observed bad stamp (FEAT-259) — the migration slice should explicitly handle reading/reconciling a pre-existing malformed stamp, not just greenfield writes.
