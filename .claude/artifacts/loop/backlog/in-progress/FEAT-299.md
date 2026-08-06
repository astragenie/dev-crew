---
id: FEAT-299
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-207]
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.55
pm_technical_risk: 0.35
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Two gaps in the same validation hole in proposed-slices.mts, both made load-bearing by SLICE-192's identity keying. Gap B (trim asymmetry between clampSliceTitle, which trims before storing, and proposed-slices.mts, which validates the raw untrimmed string) is the one driving priority: a whitespace-padded proposed title can never match on the ~200-slice legacy title-match fallback, so slice from-feature recreates that slice on every single rerun — an unbounded duplicate loop, not a one-time miss — and each iteration publishes a fresh tracker issue via loop.mts:1567-1574, the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Trigger is trivially reachable (a PM emitting a trailing space, or a hand-edited entry), so this is treated as live-risk rather than theoretical, justifying P1 despite neither gap having fired yet in the current backlog. Gap A (no uniqueness enforcement on title or id_suffix) is lower-severity but same file, same slice. Fix is contained to proposed-slices.mts plus aligning with slice-title.mts/feature-lifecycle.mts's fallback comparison — moderate effort, moderate risk (adds validation-time rejection, must scan existing backlog first to avoid failing CI on historical duplicates). Related: FEAT-284/SLICE-192 (the identity contract), FEAT-298 (adjacent uniqueness failure, different layer), FEAT-296. No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given clampSliceTitle trims whitespace before storing a slice's title while proposed-slices.mts validates the raw untrimmed string, When a proposed title carries leading or trailing whitespace, Then proposed-slices.mts trims before validating and storing (or the legacy fallback in feature-lifecycle.mts's matchProposedIdSuffix compares trimmed values), so the stored trimmed title can match its own proposed entry.", "AC-2: Given a whitespace-padded proposed title previously caused the legacy fallback to never match, creating a new slice on every rerun of slice from-feature and publishing a fresh tracker issue each time (loop.mts:1567-1574), When this fix ships, Then a regression test with a whitespace-padded proposed title asserts a legacy slice matches and is NOT recreated across repeated runs, not only a single run.", "AC-3: Given proposed-slices.mts currently validates title non-emptiness/length (<=100 chars) and id_suffix shape but never uniqueness within a FEAT, When this slice ships, Then it rejects at validation time, with a message naming the duplicate, any FEAT whose proposed_slices contains a duplicate title or duplicate id_suffix.", "AC-4: Given the uniqueness check is new, When it is enabled, Then the existing backlog is scanned first and any FEAT already carrying duplicate titles or id_suffixes is reported, so turning the check on does not fail CI on historical data without warning."]
    touches_files: [src/scripts/lib/proposed-slices.mts, src/scripts/lib/slice-title.mts, src/scripts/lib/slice-linker/feature-lifecycle.mts, src/tests/proposed-slices.test.mts]
started_at: 2026-08-06
github_issue: 631
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/631"
---
## Description

proposed_slices entries have no uniqueness validation on title or id_suffix, and the identity contract SLICE-192 just shipped now depends on both.

Both gaps found by the SLICE-192 reviewer, traced to concrete failure modes, and filed together because they are the same validation hole in proposed-slices.mts seen from two sides. Neither is a live incident — the current backlog has no duplicate proposed titles and no whitespace-padded ones — but SLICE-192 changed them from harmless to load-bearing.

Background. SLICE-192 replaced count-based materialization with identity keying. New slices carry a proposed_slice_id_suffix frontmatter stamp. The roughly 200 slices that predate the field fall back to an exact title match against proposed_slices[].title, so the fallback is what actually runs for all existing production data.

Gap A — no uniqueness enforcement. proposed-slices.mts validates that title is non-empty and at most 100 characters and that id_suffix matches the SLICE-N shape, but never that either is unique within a FEAT. Two failure modes, both silent. Duplicate titles: matchProposedIdSuffix uses .find(), so two legacy slices collapse onto the same id_suffix, leaving the other proposed entry looking unmaterialized, so it gets created again — a genuine duplicate slice, the same bug class FEAT-284 exists to eliminate, arriving through a different door. Duplicate id_suffix: one entry is silently swallowed and never created at all, which is the work-losing direction rather than the noisy one.

Gap B — trim asymmetry, and this is the worse of the two. clampSliceTitle trims whitespace before storing the title in slice frontmatter, while proposed-slices.mts validates the raw untrimmed string. A proposed title carrying leading or trailing whitespace is therefore stored trimmed and can never === match its own proposed entry on the legacy fallback path. Unlike an ordinary miss, which degrades to treating one entry as unmaterialized once, a legacy slice that can never match is recreated on EVERY rerun of slice from-feature. That is an unbounded duplicate loop, not a one-time miss, and each iteration also publishes a fresh tracker issue through loop.mts:1567-1574 — the mechanism that turned the original FEAT-284 duplicate into GitHub issue 598.

The trigger for B is trivially reachable: a PM emitting a title with a trailing space, or a hand-edited proposed_slices entry.

Acceptance direction. For B, make the two sides agree — trim in proposed-slices.mts before validating and storing, or compare trimmed on the fallback path; either closes it, and doing both is harmless. Add a regression test with a whitespace-padded proposed title asserting a legacy slice matches and is not recreated, and specifically assert the loop does not grow across repeated runs rather than only checking a single run.

For A, validate uniqueness of both title and id_suffix within a FEAT's proposed_slices and reject at validation time with a message naming the duplicate, since the alternative is discovering it as a duplicate slice or a missing one. Then scan the existing backlog and report any FEAT already carrying duplicates before the check is enforced, so turning it on does not fail CI on historical data without warning.

Consider whether the legacy title-match fallback should be retired once enough slices carry proposed_slice_id_suffix, since every one of these failure modes lives in the fallback rather than the stamp.

Related: FEAT-284 and its SLICE-192 (the identity contract), FEAT-298 (slice-id collisions, adjacent uniqueness failure at a different layer), FEAT-296.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given clampSliceTitle trims whitespace before storing a slice's title while proposed-slices.mts validates the raw untrimmed string, When a proposed title carries leading or trailing whitespace, Then proposed-slices.mts trims before validating and storing (or the legacy fallback in feature-lifecycle.mts's matchProposedIdSuffix compares trimmed values), so the stored trimmed title can match its own proposed entry.
- AC-2: Given a whitespace-padded proposed title previously caused the legacy fallback to never match, creating a new slice on every rerun of slice from-feature and publishing a fresh tracker issue each time (loop.mts:1567-1574), When this fix ships, Then a regression test with a whitespace-padded proposed title asserts a legacy slice matches and is NOT recreated across repeated runs, not only a single run.
- AC-3: Given proposed-slices.mts currently validates title non-emptiness/length (<=100 chars) and id_suffix shape but never uniqueness within a FEAT, When this slice ships, Then it rejects at validation time, with a message naming the duplicate, any FEAT whose proposed_slices contains a duplicate title or duplicate id_suffix.
- AC-4: Given the uniqueness check is new, When it is enabled, Then the existing backlog is scanned first and any FEAT already carrying duplicate titles or id_suffixes is reported, so turning the check on does not fail CI on historical data without warning.
