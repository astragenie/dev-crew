---
id: FEAT-290
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.5
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-05
autonomous_safe: true
triage_notes: "customer_impact is high (0.7) because this is an active, observed-today correctness defect degrading builder scoping across all 10 currently-pending slices for FEAT-230/259/284, with concrete evidence of sibling AC drift already causing a stale/corrected-AC mismatch. strategic_alignment (0.65) reflects that per-slice AC scoping is core to the loop's slice-based methodology and improves wave-packing quality downstream. effort_estimate (0.45) reflects genuine multi-part scope across two files plus a new gate. dependency_depth is elevated to 0.5 — a real, cited block on FEAT-289 for the PM-contract slice specifically — but stays under the 0.6 disqualifying threshold since the other three slices are unblocked and the block itself resolves by sequencing FEAT-289 first, not by a circular or open-ended dependency. Composite computes P1 under impact>=0.7 AND alignment>=0.6."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Add acceptance_criteria to PM proposedSlices contract; assign ACs per slice
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["GIVEN agents/pm.md's proposedSlices[] contract, WHEN FEAT-289's cap-relief lands and this slice edits pm.md, THEN acceptance_criteria is documented as a field the PM must populate, assigning each drafted AC to exactly the slice that delivers it.", "GIVEN a FEAT with multiple proposed slices, WHEN the PM decomposes it, THEN no AC is duplicated across two sibling proposedSlices entries and every drafted AC is assigned to exactly one slice.", "GIVEN a proposedSlices entry now carries acceptance_criteria, WHEN slice-store.mts materializes the slice, THEN the generated slice's AC section uses that per-slice list verbatim instead of the FEAT-level fallback and shared-AC warning banner."]
  - id_suffix: -SLICE-2
    title: Conditional Done When + real placeholders + per-slice objective in slice-store.mts
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["GIVEN a multi-slice feature's Done When block, WHEN a non-final sibling slice closes, THEN the block does not assert the whole feature moved to done — only the slice designated final does so.", "GIVEN a generated slice body, WHEN it is created, THEN its Objective section derives from that slice's own scope rather than restating the parent FEAT's first body line verbatim.", "GIVEN a generated slice body's In scope / Out of scope sections, WHEN it is created, THEN the placeholder text is not the literal '- bullet 1' / '- bullet 2' strings but a marker no builder could mistake for real content."]
  - id_suffix: -SLICE-3
    title: Dispatch gate refusing slices with unreplaced placeholders or AC banner
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["GIVEN a slice whose body still contains an unreplaced placeholder or the shared-AC warning banner, WHEN /runner:start or the wave dispatcher attempts to dispatch it, THEN a gate refuses dispatch and surfaces which placeholder or banner blocks it."]
---
## Description

Per-slice acceptance criteria (QW4) have zero producers: every slice ever generated falls back to copying the parent FEAT's entire AC list.

slice-store.mts:296-304 implements the per-slice AC path completely. When a proposed_slices entry carries acceptance_criteria, the generated slice claims only the ACs it actually delivers; otherwise it falls back to the FEAT-level list and prepends a warning banner reading 'ACs copied from FEAT-NNN and shared across N sibling slices - scope per-slice before close'.

The fallback is universal. agents/pm.md:39 documents the proposedSlices[] contract as id_suffix, title, points, touches_files - acceptance_criteria is not in the contract, is not mentioned anywhere in pm.md, and the PM is therefore never asked to emit it. Verified: grep for acceptance_criteria across all 221 files in .claude/artifacts/loop/backlog/ returns 0 matches. No FEAT in this repo's entire history has ever carried per-slice ACs, so all ~200 slices took the fallback.

Consequence: a builder handed any slice sees the whole feature's AC set, identical to every sibling. Its only real scope signal is the title. Observed live on 2026-08-05: SLICE-200 was generated and inspected within a minute of creation and carried all 6 of FEAT-283's ACs, four of which belong to SLICE-201 and SLICE-202. The same pattern holds across all 10 currently-pending slices for FEAT-230, FEAT-259 and FEAT-284. Sibling AC drift follows directly: FEAT-284's SLICE-194 carries a corrected AC-1..AC-8 set while its siblings SLICE-191/192/193 still carry the superseded AC-1..AC-5, because an AC correction applied to one slice file does not propagate to copies in the others.

This is the tested-but-never-wired class (FEAT-281) inverted: the consumer is fully implemented and unit-tested, but the producer was never taught the field exists. The warning banner is the system reporting the gap on every single slice creation, and it has been ignored ~200 times.

Two secondary defects in the same generator, both in slice-store.mts's body template. First, ## Objective is populated from featureDescriptionLine (line 286-288), the first non-heading line of the FEATURE body - so every sibling slice restates the same feature-level objective rather than its own. Second, the Done When block hardcodes 'feature FEAT-NNN moved from in-progress to done' on every slice (line 334), so closing any single slice of a multi-slice feature asserts the whole feature shipped. Third, In scope and Out of scope are emitted as the literal placeholder strings '- bullet 1', '- bullet 2' and '- bullet 1' (lines 319-324), which no gate ever checks were replaced before dispatch.

Acceptance direction: add acceptance_criteria to the PM's proposedSlices contract in agents/pm.md and have the PM assign each drafted AC to the slice that delivers it; make Done When conditional so only the final sibling moves the feature to done; replace the literal bullet placeholders with something a builder cannot mistake for content; and add a gate that refuses to dispatch a slice whose body still contains unreplaced placeholders or the shared-AC warning banner. Note agents/pm.md is at 335/335 lines against its cap (FEAT-289), so the pm.md edit is blocked until that is resolved.

Related: FEAT-281 (same defect class), FEAT-289 (blocks the pm.md edit), FEAT-284 (sibling AC drift is how the corrected AC-1 failed to propagate).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- GIVEN agents/pm.md's proposedSlices[] contract, WHEN FEAT-289's cap-relief lands and this slice edits pm.md, THEN acceptance_criteria is documented as a field the PM must populate, assigning each drafted AC to exactly the slice that delivers it.
- GIVEN a FEAT with multiple proposed slices, WHEN the PM decomposes it, THEN no AC is duplicated across two sibling proposedSlices entries and every drafted AC is assigned to exactly one slice.
- GIVEN a proposedSlices entry now carries acceptance_criteria, WHEN slice-store.mts materializes the slice, THEN the generated slice's AC section uses that per-slice list verbatim instead of the FEAT-level fallback and shared-AC warning banner.
- GIVEN a multi-slice feature's Done When block, WHEN a non-final sibling slice closes, THEN the block does not assert the whole feature moved to done — only the slice designated final does so.
- GIVEN a generated slice body, WHEN it is created, THEN its Objective section derives from that slice's own scope rather than restating the parent FEAT's first body line verbatim.
- GIVEN a generated slice body's In scope / Out of scope sections, WHEN it is created, THEN the placeholder text is not the literal '- bullet 1' / '- bullet 2' strings but a marker no builder could mistake for real content.
- GIVEN a slice whose body still contains an unreplaced placeholder or the shared-AC warning banner, WHEN /runner:start or the wave dispatcher attempts to dispatch it, THEN a gate refuses dispatch and surfaces which placeholder or banner blocks it.

## Proposed slices (PM decomposition)

- SLICE-1: Add acceptance_criteria to PM proposedSlices contract; assign ACs per slice (2 pts)
- SLICE-2: Conditional Done When + real placeholders + per-slice objective in slice-store.mts (2 pts)
- SLICE-3: Dispatch gate refusing slices with unreplaced placeholders or AC banner (1 pts)
