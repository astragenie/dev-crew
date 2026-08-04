---
id: FEAT-284
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: [SLICE-188, SLICE-189, SLICE-190, SLICE-191, SLICE-192, SLICE-193]
derived_from: null
pm_customer_impact: 0.9
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.8
pm_technical_risk: 0.7
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "Verified live silent-data-loss defect in a core cross-repo contract (git-anchored slice completion) that already dropped a FEAT's highest-value slice and produced a duplicate materialization + redundant GitHub issue with no CLI repair path; technical_risk banded 0.6-0.8 per the rubric because the fix is a schema/data-shape change to proposed_slices_shipped frontmatter with cross-module reach, and effort bumped to 0.7 because the existing test suite's --allow-empty fixtures (confirmed at git-anchored-completion.test.mts:55-64) must be rebuilt from scratch to give the new diff-corroboration logic any real coverage."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Rebuild git-anchored-completion test fixtures with real file-touching commits, not --allow-empty"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Require diff-level file-change evidence before recording a slice as git-shipped
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: "Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-6
    title: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-04
github_issue: 609
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/609"
---
## Description

git-anchored slice completion treats a prose mention of a slice in a commit message as proof that the slice shipped, silently dropping planned work. Reproduced live on 2026-08-04 against FEAT-259.

Mechanism. reconcileProposedSlicesAgainstGit in src/scripts/lib/slice-linker/git-anchored-completion.mts pre-filters commits with git log --grep <featureId>, then for each proposed slice builds the regex /FEAT-NNN[^\n]{0,80}?SLICE-<ordinal>\b|SLICE-<ordinal>\b[^\n]{0,80}?FEAT-NNN/i and tests it against the commit SUBJECT and BODY. Any match is recorded as shipped evidence. There is no examination of the commit's diff, no check that any file changed, and no check that the changed files bear any relationship to the slice. Commit text is the entire evidence base.

Live repro. Commit 71604bb4 is a docs-only commit: one new file under docs/research/ plus backlog frontmatter updates. It contains zero implementation. Its body includes the sentence 'run before committing FEAT-259's SLICE-1 to a design'. That single prose fragment matched the pattern, so reconcileProposedSlicesStartIndex advanced the materialization start index past -SLICE-1 and stamped proposed_slices_shipped: [-SLICE-1] with proposed_slices_shipped_commits: [71604bb4...] onto the FEAT. The subsequent slice from-feature run materialized only proposed slices 2 through 5 as SLICE-183 through SLICE-186. The SubagentStop report-gate hook -- the highest-ROI mechanism in the whole FEAT -- was never created, and nothing surfaced that it had been skipped. Independently verified that it had not shipped: no report-gate entry exists in .claude-plugin/hooks/hooks.json, whose SubagentStop array contains only emit-astrarunner-event.mjs and capture-at-close.mjs.

Why this is worse than an ordinary false positive. (a) It is silent -- the skip produces no warning, and a FEAT whose proposed slices were partly dropped looks fully sliced. (b) It is durable -- the stamp is deliberately written to FEAT frontmatter so the finding survives a fresh checkout, which means a wrong verdict also survives. (c) It is self-reinforcing -- discussing a slice in commit prose is exactly what planning, research and handoff commits do, so the more carefully a slice is designed before implementation, the more likely its design commits mark it shipped. (d) The prefix-advance model compounds it: a false positive on a low ordinal shifts the start index, so later legitimate slices materialize against the wrong proposed entries.

Secondary defect found in the same repro. materializeProposedSlices computes startAt = Math.max(existingSlices.length, opts.startIndex ?? 0), which assumes the Nth existing slice always corresponds to the Nth proposed entry. Once a middle entry is skipped that assumption breaks, and re-running slice from-feature re-materializes the LAST proposed slice as a duplicate rather than the missing one. Observed: a second from-feature invocation created a duplicate of -SLICE-5 (idle-ping suppression) and published a redundant GitHub issue for it, while -SLICE-1 remained missing. There is also no CLI flag to target a specific proposed slice, so this state cannot be repaired through the CLI at all -- the repair required calling createSlice through the BacklogStore API directly.

Proposed direction. Require diff-level corroboration before recording shipped evidence: a commit should only count if it actually modified files, and preferably files plausibly related to the slice (its touches_files when declared). Treat a text-only match as at most a warning that names the commit and asks for confirmation, never as a silent skip. Emit an explicit operator-visible line whenever any proposed slice is skipped, listing the ordinal, the title and the matched commit. Replace the contiguous-prefix start-index model with per-ordinal materialization keyed on id_suffix so a gap in the middle is repairable and re-runs are genuinely idempotent. Add a CLI escape hatch to materialize a named proposed slice.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.

## Additional evidence — the test suite structurally cannot catch this

Every fixture commit in `src/tests/git-anchored-completion.test.mts` is
created with `git commit --allow-empty` (the `tmpGitRepo` helper, lines
55-64). The entire existing suite therefore exercises the matcher against
commits that change **zero files**.

That is the structural reason diff-blindness was never caught: with no
fixture commit ever touching a file, the tests cannot distinguish a commit
that *implements* a slice from one that merely *mentions* it. The behavior
under test and the defect are indistinguishable by construction, so the
suite passes green while the matcher is wrong.

Consequence for scoping: any fix must rebuild these fixtures to produce real
file changes before the corroboration logic can be asserted at all. That is
genuine work, not incidental cleanup, and it belongs in the slice estimate.

This is a close relative of FEAT-281's tested-but-never-wired class — in both
cases the test is shaped so that writing it manufactures the evidence that
hides the gap.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a candidate commit whose subject/body matches a proposed slice's FEAT-id/SLICE-ordinal token pair, When reconcileProposedSlicesAgainstGit evaluates it, Then the commit is only recorded as shipped evidence if it actually changed at least one file — a docs-only or --allow-empty commit (reproducing 71604bb4) must never produce shipped evidence, verified by a NEW fixture that creates a real file-touching commit alongside the existing empty-commit case in the same test.
- AC-2: Given a proposed slice declares touches_files, When a diff-corroborated candidate commit's changed paths share zero overlap with that list, Then the match is downgraded to a text-only warning and reported to the operator rather than recorded as shipped evidence that advances the start index.
- AC-3: Given any proposed slice is skipped or downgraded during a reconcile pass, When runner:start / slice from-feature runs, Then an explicit operator-visible line is printed naming the ordinal, the slice title, and the matched commit sha, so the FEAT-284 repro (SLICE-1 dropped via commit 71604bb4) surfaces a visible warning instead of silence.
- AC-4: Given a FEAT whose proposed_slices had ordinal 1 skipped while ordinals 2-5 are already materialized (the live FEAT-259 state), When slice from-feature is re-run, Then it materializes the missing ordinal 1 and does not create a duplicate of any already-materialized ordinal — a regression test must reproduce the observed duplicate -SLICE-5 + redundant GitHub issue and assert it no longer occurs.
- AC-5: Given an operator needs to repair a gapped FEAT by hand, When they invoke the new CLI escape hatch targeting a specific id_suffix, Then that exact proposed slice is materialized regardless of index position, without requiring direct BacklogStore API calls (the actual repair path used in the FEAT-284 live repro).

## Proposed slices (PM decomposition)

- SLICE-1: Rebuild git-anchored-completion test fixtures with real file-touching commits, not --allow-empty (2 pts)
- SLICE-2: Require diff-level file-change evidence before recording a slice as git-shipped (2 pts)
- SLICE-3: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines (2 pts)
- SLICE-4: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape (2 pts)
- SLICE-5: Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index (2 pts)
- SLICE-6: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix (2 pts)

## The false positive is self-perpetuating (measured 2026-08-04, after repair)

Re-running `reconcileProposedSlicesAgainstGit` against FEAT-259 *after* the
repair still reports `-SLICE-1` as shipped — now citing `c2e77fe7`, the
commit that repaired and documented the original false positive. That commit
message necessarily contains both `FEAT-259` and `SLICE-1` in prose, which is
all the matcher requires.

So the defect regenerates its own evidence: the first false positive came
from a research commit that *designed* the slice, the second from a repair
commit that *documented* the first. Any commit that discusses the problem
re-creates it. Fixing the state without fixing the matcher is therefore not
durable — the stamp will simply be rewritten on the next reconcile pass.

FEAT-259 is currently unharmed only by accident: it is fully materialized
(5 of 5 slices), so `reconcileProposedSlicesStartIndex` short-circuits at
`if (existingCount >= proposed.length) return undefined` before reconcile is
consulted at all. Had it been 4 of 5, the false positive would have fired a
second time on the repair commit.

Two consequences for the fix:

- Diff-corroboration (AC-1) is load-bearing, not defense in depth. Both
  offending commits would be filtered by a "did this commit change files
  related to the slice" test: the first touched only `docs/research/**` plus
  backlog frontmatter, the second only backlog artifacts.
- The migration slice must re-derive stale stamps rather than trust them.
  A stamp written by the old text-only matcher carries no evidence that its
  cited commit did anything, so migration should re-evaluate each stamped
  entry under the new rules instead of carrying it forward.
