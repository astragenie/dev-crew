---
id: FEAT-298
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.65
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.55
pm_technical_risk: 0.5
pm_dependency_depth: 0.25
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-06
autonomous_safe: false
triage_notes: "212 slice files occupy 203 distinct ids: 4 genuine id collisions (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2, 12 files total) plus SLICE-118's directory-drift case (tracked separately under FEAT-296). Not hypothetical for gating — SLICE-116's four review artifacts already span two different parent FEATs (feat-169-slice-116, feat-183-slice-116) pooled under one id token, meaning review-gate's id-tokenized artifact scan and any id-keyed lookup answer by whichever file is found first. This directly undermines the identity contract SLICE-192 just shipped (proposed_slice_id_suffix keying, with an exact-title-match fallback for ~200 legacy slices). Elevated to P1 over FEAT-296 because it's a correctness bug in gate matching today, not just a triage-input accuracy issue. Effort and risk are higher than the other items in this batch because remediation means renumbering 12 existing files while keeping their review/validation artifacts and github_issue references intact — a renumber that drops a reference converts a collision into an orphan, so I'm marking autonomous_safe false pending review of the existing renumber CLI's fitness for backfill (it was built for FEAT-257/DEC-079's allocation-side fix, not confirmed against existing collisions). Pre-mortem (required at P1): most likely two-weeks-later failure is a renumbered file's artifact or github_issue reference going stale because it wasn't included in the same-slice scan; rollback needs a targeted revert of the renumber commit plus artifact restoration, not a plain git revert. Related: FEAT-296 (SLICE-118, adjacent but distinct), FEAT-284/SLICE-192 (the identity contract this now threatens), FEAT-257/DEC-079 (allocation-side fix, did not backfill). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Add slice-id uniqueness validator (collision vs directory-drift)
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given 212 slice files occupy 203 distinct ids with five ids reused across genuinely different slices (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2, plus SLICE-118's directory-drift case), When the validator runs, Then it fails on any slice id that maps to more than one distinct slice, reporting collisions and directory-drift separately since the remedies differ (renumber vs reconcile-and-delete).", "AC-2: Given validate-slice-touches-files.mts already walks every slice file as an existing CI gate, When this check is added, Then it is added there rather than duplicating the walk in a new script.", "AC-3: Given the check is new, When CI runs, Then it is wired into CLAUDE.md's numbered CI gate list so the collision count cannot grow silently."]
    touches_files: [src/scripts/validate-slice-touches-files.mts, CLAUDE.md]
  - id_suffix: -SLICE-2
    title: Renumber the twelve colliding slice files via existing renumber CLI
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given the existing renumber CLI (slice-renumber.mts / slice-renumber-artifacts.mts) built for FEAT-257/DEC-079's allocation-side fix, When it is applied to the twelve colliding files (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2), Then each collision resolves to a unique id, and the CLI is confirmed fit for backfilling existing collisions, not only new allocation.", "AC-2: Given each renumbered slice may have review/validation artifacts or github_issue references pointing at the old id, When renumbering runs, Then those references travel with the renamed slice rather than becoming orphaned.", "AC-3: Given historical references to the original id should stay valid where possible, When choosing which claimant of a colliding id to renumber, Then the newer claimant is renumbered and the older claimant keeps the original id.", "AC-4: Given SLICE-116's four artifacts span two different parent FEATs (feat-169-slice-116, feat-183-slice-116), When SLICE-116 is renumbered, Then this collision is resolved as a prerequisite before FEAT-296's SLICE-116 re-review decision (review_skipped badge or re-review) can proceed."]
    touches_files: [src/scripts/lib/slice-renumber.mts, src/scripts/lib/slice-renumber-artifacts.mts, .claude/artifacts/loop/ai-loop/slices/completed, .claude/artifacts/loop/ai-loop/slices/pending]
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
## Proposed slices (PM decomposition)

- SLICE-1: Add slice-id uniqueness validator (collision vs directory-drift) (2 pts)
- SLICE-2: Renumber the twelve colliding slice files via existing renumber CLI (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given 212 slice files occupy 203 distinct ids with five ids reused across genuinely different slices (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2, plus SLICE-118's directory-drift case), When the validator runs, Then it fails on any slice id that maps to more than one distinct slice, reporting collisions and directory-drift separately since the remedies differ (renumber vs reconcile-and-delete).
- AC-2: Given validate-slice-touches-files.mts already walks every slice file as an existing CI gate, When this check is added, Then it is added there rather than duplicating the walk in a new script.
- AC-3: Given the check is new, When CI runs, Then it is wired into CLAUDE.md's numbered CI gate list so the collision count cannot grow silently.
- AC-4: Given the existing renumber CLI (slice-renumber.mts / slice-renumber-artifacts.mts) built for FEAT-257/DEC-079's allocation-side fix, When it is applied to the twelve colliding files (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2), Then each collision resolves to a unique id, and the CLI is confirmed fit for backfilling existing collisions, not only new allocation.
- AC-5: Given each renumbered slice may have review/validation artifacts or github_issue references pointing at the old id, When renumbering runs, Then those references travel with the renamed slice rather than becoming orphaned.
- AC-6: Given historical references to the original id should stay valid where possible, When choosing which claimant of a colliding id to renumber, Then the newer claimant is renumbered and the older claimant keeps the original id.
- AC-7: Given SLICE-116's four artifacts span two different parent FEATs (feat-169-slice-116, feat-183-slice-116), When SLICE-116 is renumbered, Then this collision is resolved as a prerequisite before FEAT-296's SLICE-116 re-review decision (review_skipped badge or re-review) can proceed.
