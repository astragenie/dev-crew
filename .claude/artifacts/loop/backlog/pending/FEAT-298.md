---
id: FEAT-298
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

Slice IDs are not unique: 212 slice files occupy 203 distinct ids, with five ids reused across genuinely different slices.

Measured 2026-08-05 by sweeping ai-loop/slices/{pending,completed}. Surfaced by the SLICE-202 reviewer as an aside while sweeping for open slices, then swept fully.

- SLICE-115: FOUR different slices, all in completed/ (named-sub-agents brainstorm, one-click platform task ingress, per-skill cost attribution, review-verdict schema)
- SLICE-117: FOUR different slices, all in pending/ (confidence reporting, cross-session learnings, markdown workflow recipes, SessionStart bootstrap hook)
- SLICE-116: TWO different slices in pending/ (code-quality pivot leftovers, derive-only discipline)
- SLICE-134: TWO different slices in completed/ (dry-run inventory phase, implement FEAT-176)
- SLICE-118: two files, but this one is the SAME slice in two directories — filing drift, tracked in FEAT-296, not a collision

So four genuine collisions covering twelve slice files, plus one drift case. These are distinct defects with distinct remedies: a collision needs renumbering, drift needs reconcile-and-delete. A validator should report them separately or it will prescribe the wrong fix.

Why it matters now. SLICE-192 (landed 2026-08-05) introduced identity-keyed materialization: a slice is bound to its proposed_slices entry by a new proposed_slice_id_suffix frontmatter field, with an exact-title match fallback for the ~200 legacy slices that predate the field. That contract assumes a slice id identifies one slice. Where four files share SLICE-117, locateSliceFile and any id-keyed lookup answer by whichever file is found first. Every id-based consumer inherits this: the review-gate artifact scan tokenizes on slice id and will match artifacts belonging to a different slice with the same id, and close-time gates read status from whichever file wins.

Not hypothetical for gating. SLICE-116's four review artifacts (feat-169-slice-116 twice, feat-183-slice-116 twice) span TWO different parent FEATs, which is the signature of exactly this: artifacts for two unrelated slices pooled under one id token.

Prior art in this repo: DEC-079 and FEAT-257 covered collision-proof slice-id allocation via a fetch-scan max+1 plus a renumber CLI for the residual race. That work addressed allocation going forward. It did not renumber the existing collisions, and the sweep above is the current state.

Acceptance direction. Add a validator that fails when a slice id maps to more than one distinct slice, reporting collisions and directory-drift separately since the remedies differ. Wire it into CI so the count cannot grow. Then renumber the twelve colliding files using the existing renumber CLI if it is fit for this, checking each slice's review and validation artifacts and github_issue references travel with it — a renumber that leaves artifacts pointing at the old id converts a collision into an orphan. Prefer renumbering the newer claimant of each id so historical references to the original stay valid.

Consider whether validate-slice-touches-files.mts is the right home, since it already walks every slice file and is already a CI gate, rather than adding a new script.

Related: FEAT-296 (SLICE-118 and FEAT-288 directory-versus-frontmatter drift, adjacent but distinct), FEAT-284 and its SLICE-192 (the identity contract that now depends on id uniqueness), FEAT-257 and DEC-079 (allocation-side fix that did not backfill).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.