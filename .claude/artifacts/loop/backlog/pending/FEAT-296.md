---
id: FEAT-296
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

Slice-state filing drift: one slice exists in two state directories at once, and three more sit in pending/ while their own frontmatter says they are finished.

Found 2026-08-05 while verifying which open slices are affected by SLICE-202's grandfather-clause deletion. The slice directory tree and slice frontmatter are two independent records of the same state, nothing reconciles them, and they have diverged.

Duplicate across directories. SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md exists in BOTH ai-loop/slices/pending/ and ai-loop/slices/completed/. The two files differ in content, not just location, and each is internally consistent with the directory it sits in: the pending copy says status pending, the completed copy says status completed. So SLICE-118 is simultaneously open and closed depending on which file a reader happens to find. A directory sweep finds it twice; a status query answers differently by path. Verified this is the only slice duplicated across those two directories.

Status-versus-directory drift. Three files sit in pending/ while their own frontmatter contradicts it: SLICE-128 (status done), SLICE-130 (status done), SLICE-55 (status superseded). These are not duplicates, just misfiled — but the effect is the same, any consumer that enumerates pending/ as the set of open work overcounts.

Consequences observed today. Every count of open slices this session was wrong. The figure 28 pending slices was quoted repeatedly, including into a PM triage brief that fed FEAT-288's priority scoring; the real number of genuinely open slices is at least four lower. builder-202, sweeping for open slices whose only review evidence lacks a decision key, reported SLICE-118 as open and needing re-review — it read the pending copy. The completed copy says otherwise. Only SLICE-119 is genuinely open and genuinely affected.

Defect class. Two representations of one fact with no gate asserting they agree. Same shape as FEAT-291 (verdict vocabulary duplicated between review-gate.mts and the reviewer skill prose) and FEAT-288 (touches_files written in one shape, read in another). Each half is individually well-formed and the disagreement is invisible until something depends on it.

Acceptance direction. Reconcile the four known cases first, deciding SLICE-118 on evidence rather than by picking a copy: check git history and any review or validation artifacts for it before deleting either file. Then add a validator, in the style of the existing validate-slice-touches-files.mts, that fails when a slice id appears in more than one state directory, and when a slice's frontmatter status disagrees with the directory it is filed under. Wire it into CI so the two records cannot drift again unnoticed.

Consider whether the directory should stop being a state record at all, with frontmatter as the single source and the directory purely an index — parallel records that must be manually kept in step are what produced this.

Related: FEAT-284 (slice state drifting from reality, same family), FEAT-291, FEAT-288, SLICE-202 (whose open-slice sweep surfaced it).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Live instance with data loss — FEAT-288, 2026-08-05

A second instance, caught the same day, this time at FEATURE level and involving
actual content loss. Worth recording in full because the mechanism is one an
agent or a human will hit again.

**What happened.** `slice from-feature --id FEAT-288` moved the file
`triaged/FEAT-288.md` → `in-progress/FEAT-288.md`. Later in the same session I
appended a correction with `cat >> .claude/artifacts/loop/backlog/triaged/FEAT-288.md`
— the stale path. `cat >>` does not fail on a missing file; it CREATES one. So a
phantom `triaged/FEAT-288.md` appeared containing only the appended text: no
`id`, no `priority`, no `slices`, no `proposed_slices`, no PM scores, no
`## Description`. 43 lines against the real file's 71.

`slice complete` then moved that phantom `triaged/` → `done/`, and the backlog
held two FEAT-288 files with divergent content in two state directories.

**The damage was not the duplicate — it was where the writes went.** The
correction I believed I had made to FEAT-288's scoring premise was never in the
real FEAT; it lived only in the phantom. Closing SLICE-204 then wrote
`slices_complete: [SLICE-204]` into the real file, which had no record of
SLICE-203, so the close gate refused with "SLICE-203 still pending" even though
SLICE-203 was genuinely completed. The completion record and the correction had
gone to different files.

Had the phantom been treated as authoritative and the other deleted, FEAT-288
would have lost its PM scores, slice list, and the per-slice `acceptance_criteria`
that were the point of FEAT-290's work that day.

**Two contributing failures, both mine.** Appending to a path without checking
the file still lived there, and staging with `git add -A` without inspecting the
file list — commit `bd5293d2` captured the phantom, and commit `41f232aa`
created it, neither noticed.

**Repair performed:** merged the phantom's correction text into the real file,
deleted the phantom, repaired `slices_complete` to `[SLICE-203, SLICE-204]`,
re-ran the close. FEAT-288 is now a single 110-line file in `done/` with all
frontmatter and both sections intact.

**Bearing on this FEAT's acceptance direction.** The proposed validator must
catch this shape too, not only slice-level drift: a FEAT id appearing in more
than one backlog state directory, and a file whose frontmatter is missing
required keys (`id`, `status`, `priority`) which is what a phantom looks like.
The second check is the stronger one — it catches the phantom at creation rather
than after a state move has propagated it.

## Separate finding — FEAT-240 is an ID COLLISION, not filing drift

Found in the same sweep and NOT the same defect. `done/FEAT-240.md` (P1,
`category: bug`) and `triaged/FEAT-240.md` (P3, `category: maintenance`) are two
genuinely different features that were allocated the same id. Pre-existing,
introduced in commit `b6b3562b` on 2026-07-18, unrelated to this session.

This belongs with the id-allocation work (DEC-079 / FEAT-257, collision-proof
allocation via fetch-scan max+1) rather than with directory/frontmatter
reconciliation. Recorded here only because the duplicate-id sweep surfaces both
and a validator written for one will report the other — it should distinguish
them, since the remedies differ: reconcile-and-delete for drift, renumber for a
collision.

## Open slices blocked by the SLICE-202 gate change — 2026-08-05

Three `status: pending` slices whose only review evidence lacks a `decision`
key, so they will not close under the deleted-grandfather rule until re-reviewed
or given an explicit `review_skipped` badge:

- **SLICE-119** — both matching artifacts frontmatter-less
- **SLICE-116** — four matching artifacts, all with a frontmatter block but no
  `decision:` key. **Missed by the builder's sweep; found by the reviewer's
  independent one.** Worth noting the builder's sweep looked for artifacts with
  no frontmatter block at all and did not catch block-present-but-key-absent,
  which is 75 of the 160 affected artifacts — the larger half.
- **SLICE-118** — reported as blocked, but see above: it is the directory-drift
  case, `completed/` copy says completed. Reconcile it rather than re-reviewing.

SLICE-128 and SLICE-130 were correctly excluded — `status: done` despite sitting
in `pending/`.

SLICE-116's four artifacts span TWO different parent FEATs (`feat-169-slice-116`
×2, `feat-183-slice-116` ×2), which is not a filing quirk — it is the signature
of the id collision recorded in FEAT-298. Artifacts for two unrelated slices are
pooled under one id token, so "SLICE-116's review evidence" is not a well-defined
set. Re-reviewing it requires resolving the collision first; a `review_skipped`
badge would apply to whichever slice wins the id lookup, which is not necessarily
the one anybody intended.
