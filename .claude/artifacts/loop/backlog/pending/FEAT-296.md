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