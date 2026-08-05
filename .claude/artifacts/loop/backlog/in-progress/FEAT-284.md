---
id: FEAT-284
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-05
depends_on: []
slices: [SLICE-188, SLICE-189, SLICE-190, SLICE-191, SLICE-192, SLICE-193, SLICE-194]
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
  - id_suffix: -SLICE-7
    title: Treat squash-body bullet lines as subject-equivalent match targets (AC-8)
    points: 2
    estimated_tokens: 60000
started_at: 2026-08-04
github_issue: 609
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/609"
slices_complete: [SLICE-188, SLICE-189, SLICE-190, SLICE-194, SLICE-192]
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

- AC-1: Given a candidate commit whose subject/body matches a proposed slice's FEAT-id/SLICE-ordinal token pair, When reconcileProposedSlicesAgainstGit evaluates it, Then the commit is only recorded as shipped evidence if it actually changed at least one file — an `--allow-empty` commit must never produce shipped evidence, verified by a NEW fixture that creates a real file-touching commit alongside the existing empty-commit case in the same test. (Corrected 2026-08-04: this clause originally also claimed to exclude docs-only commits, which the "changed ≥1 file" rule does not do — a docs-only commit changes a file. That case is AC-6.)
- AC-2: Given a proposed slice declares touches_files, When a diff-corroborated candidate commit's changed paths share zero overlap with that list, Then the match is downgraded to a text-only warning and reported to the operator rather than recorded as shipped evidence that advances the start index.
- AC-3: Given any proposed slice is skipped or downgraded during a reconcile pass, When runner:start / slice from-feature runs, Then an explicit operator-visible line is printed naming the ordinal, the slice title, and the matched commit sha, so the FEAT-284 repro (SLICE-1 dropped via commit 71604bb4) surfaces a visible warning instead of silence.
- AC-4: Given a FEAT whose proposed_slices had ordinal 1 skipped while ordinals 2-5 are already materialized (the live FEAT-259 state), When slice from-feature is re-run, Then it materializes the missing ordinal 1 and does not create a duplicate of any already-materialized ordinal — a regression test must reproduce the observed duplicate -SLICE-5 + redundant GitHub issue and assert it no longer occurs.
- AC-5: Given an operator needs to repair a gapped FEAT by hand, When they invoke the new CLI escape hatch targeting a specific id_suffix, Then that exact proposed slice is materialized regardless of index position, without requiring direct BacklogStore API calls (the actual repair path used in the FEAT-284 live repro).
- AC-6: Given a proposed slice that declares NO `touches_files` (the live FEAT-259 repro shape — none of its five proposed entries declared any), When a matching candidate commit changed only non-implementing paths such as `docs/**` and `.claude/artifacts/**`, Then the match is downgraded to a text-only warning rather than recorded as shipped evidence. Both real offending commits are filtered by this rule and neither is filtered by AC-1 or AC-2: `71604bb4` touched only `docs/research/**` plus backlog frontmatter, and `c2e77fe7` touched only backlog artifacts. Asserted against the existing docs-only fixture at `src/tests/git-anchored-completion.test.mts:263-282`, whose expectation inverts from shipped==[1] to shipped==[].

- AC-7: Given a candidate commit whose FEAT-id/SLICE-ordinal token pair appears ONLY in the commit body and not in its subject, When reconcileProposedSlicesAgainstGit evaluates it, Then it is not recorded as shipped evidence (at most a text-only warning). Given a commit carrying the pair in its SUBJECT in the established convention (`feat(connectors): FEAT-312 SLICE-1 — bridge`), Then it still qualifies as evidence as today.

- AC-8: Given a squash-merge commit whose body contains bullet lines composed from the original commit subjects, When reconcileProposedSlicesAgainstGit evaluates it, Then each bullet line is treated as a subject-equivalent match target, so a genuine multi-slice squash merge is recognized as evidence. Prose mentions elsewhere in the body remain non-qualifying.

### Why AC-8 is required — AC-7 broke the dominant shipping shape

Found by review of SLICE-189 and confirmed independently. AC-7 is not merely
defense-in-depth; it is a net-new miss for this repo's most common real
shape. Verified live: PR #549 / commit `859be561` genuinely shipped both
SLICE-1 and SLICE-2 of FEAT-267 (confirmed via `gh pr view 549`), matched
correctly before SLICE-189, and now returns `shipped=[]` with both demoted to
`textOnlyMatches`. Squash-merged multi-slice PRs put the SLICE token only in
the body GitHub composes from the original commit subjects — never in the
subject, which is the PR title. Left as-is, AC-7 surrenders this module's
main practical benefit (auto-advance) for most multi-slice FEATs here.

AC-8 was measured against real commits before being adopted, because the
previous refinement attempt reinstated the defect (see the section above):

| commit class | recovered by AC-8 |
|---|---|
| the 3 known false positives | **0 of 3** |
| genuine body-only commits sampled | 2 of 4 |

None of `71604bb4`, `c2e77fe7`, `3bd6ab95` carries the token pair inside a
bullet line — their bodies are hand-written prose, and two have no bullets at
all. Both true squash merges do: `859be561` (12 bullets) and `f60fe60d`
(15 bullets). So AC-8 recovers the shape that matters without reopening the
hole AC-7 closed.

The two still-missed samples (`0786d9ce`, `453200c1`) mention the pair in
free prose rather than a bullet. That residue is acceptable and is precisely
what SLICE-190's operator warning exists to surface.

### Why AC-7 exists — AC-6 does not catch the third offender

Measured on live repo data 2026-08-04. The FEAT-259 false positive migrated
across three separate commits in a single day, the citation walking forward
to whichever commit most recently *discussed* the incident:

| commit | what it actually was | pair in subject | pair in body |
|---|---|---|---|
| `71604bb4` | research spike (docs only) | 0 | 1 |
| `c2e77fe7` | the repair commit (backlog only) | 0 | 2 |
| `3bd6ab95` | SLICE-188 test fixtures (`src/tests/**`) | 0 | 1 |

`3bd6ab95` defeats AC-1 (it changed files), AC-2 (FEAT-259's proposed slices
declare no `touches_files`) and AC-6 (it changed `src/tests/**`, not
`docs/**` or `.claude/artifacts/**`). Diff corroboration alone therefore does
not close the live repro.

The subject/body split does: all three false positives carry the token pair
exclusively in the body, none in the subject, while the genuine-evidence
convention already in use — and already encoded in the existing fixtures —
puts it in the subject. This is a cheaper and sharper discriminator than path
heuristics, because it keys on how humans actually write slice commits rather
than guessing which paths count as implementation.

AC-6 is still worth keeping: it independently kills the docs-only class, and
the two rules together degrade gracefully if either is bypassed.

Do NOT instead widen AC-6's non-implementing path set to include
`src/tests/**`. That would make test-only slices — SLICE-188 itself is one —
permanently undetectable, for a reason unrelated to the real discriminator.

### Note on AC-6's false-negative direction (deliberate)

AC-6 makes a genuinely docs-only slice — FEAT-259's own `-SLICE-2` (receipt
schema + docs) and `-SLICE-3` (final-act line across `.md` templates) are
real examples — undetectable as shipped by this check. That is the correct
trade, and it follows the module's existing stated contract: "Absence of a
match is NOT proof a slice is unshipped; it only means this check found no
evidence, so callers must treat 'not shipped' as the default, fail-open
outcome."

The two error directions are not symmetric. A false negative re-materializes
a slice that already shipped — visible immediately, cheap to discard. A false
positive silently drops planned work and stamps durable frontmatter asserting
it was done — which is the entire incident this FEAT exists to prevent, and
which went unnoticed until someone happened to count the materialized slices.
Bias the check toward re-doing work over silently skipping it.

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

## Measured cost of AC-7, and a refinement that must NOT be adopted

Measured against this repo's last 600 commits on 2026-08-04, after SLICE-189
landed.

| token-pair location | commits | of which squash-merges |
|---|---|---|
| subject (still detected) | 118 | 12 |
| body only (now undetected) | 29 | 11 |
| neither | 453 | — |

So AC-7 makes roughly 20% of previously-matching commits invisible to the
check, and at least one is genuine shipped evidence: `859be561`
"FEAT-267: wave worktree-placement fix + crash-recovery CLI (#549)", whose
subject carries the FEAT id while the SLICE token sits in the squash body.
This repo squash-merges, and GitHub composes the squash subject from the PR
title, so this shape recurs.

**The obvious refinement is a trap.** Loosening the rule to "the FEAT id OR a
SLICE token appears in the subject" recovers 20 of the 29 — but among the
recovered are all three original false positives:

- `3bd6ab95` `test(SLICE-188): rebuild git-anchored-completion fixtures...`
- `c2e77fe7` `chore(backlog): slice FEAT-259; repair git-anchored false-positive...`
- `71604bb4` `docs(research): architect classification for FEAT-281/282/283...`

Each carries *a* FEAT or SLICE token in its subject — just not the pair that
its body prose mentions. Under the loose rule `test(SLICE-188): ...` becomes
evidence for FEAT-259's SLICE-1 again, reinstating the exact defect this FEAT
exists to remove. Strict subject-pair matching is load-bearing; do not relax
it to a single-token subject anchor.

**Consequence for SLICE-190.** The residual false-negative rate is high
enough that the operator-visible warning is not polish — it is the safety net
that makes AC-7's trade acceptable. Every `textOnlyMatches` entry is a case
where the check saw prose evidence and declined to act on it; a human needs
to see those lines to catch the `859be561` shape. SLICE-190 should be treated
as required to complete AC-7, not as an independent nicety.

## AC-8b status — NOT fully satisfied (2026-08-05)

Recording this explicitly rather than letting SLICE-194's close imply the AC is
met.

AC-8b asked that the real squash-merge commit `859be561` be recognized as
shipped evidence when reconcile runs against LIVE repo history, not a fixture
alone. Independently verified by reviewer-194 with a standalone script:

- pinned to `f0ec093d` → recognized, `shipped=[1,2]` citing `859be561`
- at live HEAD → NOT recognized, both ordinals demoted at `3860269f`

**Verdict: met only up to the point before `3860269f` exists. Live-HEAD
recognition remains open.**

SLICE-194's own change is sound — the bullet-line matching works correctly once
the right commit is reached. What blocks AC-8b is `commits.find()` selecting a
newer narration commit and never continuing to the qualifying one. That is
`FEAT-294`, which predates SLICE-194 (it arrived with AC-7 in SLICE-189) and is
not AC-8 specific.

Failure direction is safe: a false "not shipped" causes a wasted re-check, not a
silent drop, so it does not reopen the FEAT-284 incident class. But FEAT-284
must not be moved to `done/` on the basis that AC-8b passed, because at live
HEAD it does not. Close FEAT-284 only after FEAT-294 lands, or close it with
AC-8b explicitly recorded as deferred to FEAT-294 — not ticked.
