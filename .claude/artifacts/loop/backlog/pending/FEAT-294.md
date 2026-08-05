---
id: FEAT-294
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
---
## Description

Documentation commits shadow real shipped evidence: commits.find() is first-match-wins over the newest matching commit, so a commit that merely narrates a slice outranks the commit that shipped it.

git-anchored-completion.mts:296 uses commits.find(...) over a git log listing in newest-first order. It stops at the first commit whose subject or body matches the FEAT-id / SLICE-ordinal token pair. Because a later commit that discusses a slice matches the same pattern as the commit that implemented it, and is newer, the discussion commit wins and the implementing commit is never examined.

Found 2026-08-05 by builder-194 during SLICE-194 and worth its own item because it is architectural, not a defect in any one slice. Evidence: pinning loop.mainRef to f0ec093d (immediately after 859be561 merged) makes reconcile return shipped: [ordinal 1, ordinal 2] citing 859be561 — the correct answer. Running the same reconcile at current HEAD returns both ordinals demoted to token-pair-in-body-only, matched instead against 3860269f, the SLICE-189 close commit, whose body narrates this exact historical example in prose (commit 859be561 genuinely shipped both SLICE-1 and SLICE-2 of FEAT-267).

This is the fourth appearance of the same self-referential dynamic in FEAT-284's history. The original incident had the citation walk forward to whichever commit most recently discussed the drop, including the repair and documentation commits. AC-7 (subject-scoped matching) and AC-8 (squash-bullet targets) fixed which TEXT qualifies as evidence. Neither addresses which COMMIT gets examined, so as soon as a slice is written about, the writing shadows the work.

Current severity is low and the direction is safe. Post-AC-7 the shadowing commit is demoted rather than falsely promoted, so the failure mode is a false negative — reconcile reports no evidence and the caller fails open, which is the documented contract and never blocks a legitimate slice start. FEAT-267 is already in done/ so there is no live consequence today. The risk is that it is invisible: a FEAT whose slices genuinely shipped can read as unshipped purely because someone later wrote about it, and nothing distinguishes that from a slice that truly never shipped.

Acceptance direction. Evaluate all matching commits rather than stopping at the first: collect every commit whose text matches the pair, run subject/bullet qualification and diff corroboration across the set, and take the best-corroborated match instead of the newest text match. Prefer a commit whose diff corroborates over one whose diff does not, regardless of recency. If several corroborate, the oldest is the likelier implementer since later ones tend to be follow-ups and documentation. Report in textOnlyMatches when a match was displaced by a better one, so the operator can see the shadowing occurred rather than inferring it from an absence.

Consider also whether the log query should exclude commits that only touch NON_IMPLEMENTING_PATH_PREFIXES before the find, which would cut most narration commits at the source, though that overlaps with AC-6 and should not duplicate it.

Related: FEAT-284 and its SLICE-189 (AC-7) and SLICE-194 (AC-8), both of which fixed adjacent halves of this; SLICE-192 (materialization keying, the other half of the FEAT-284 incident).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.