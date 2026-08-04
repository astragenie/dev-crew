---
id: FEAT-279
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-03
depends_on: []
slices: []
derived_from: null
---
## Description

Skip-badge pause detection relies on prose keyword inference; replace with an explicit flag. Raised as a non-blocking follow-up by the SLICE-178 re-review (FEAT-275, review artifact 20260803T200500Z). close-dispatch-telemetry.mts::noteIndicatesPause decides whether a gate skip-badge represents a real specialist pause (and therefore counts as dispatch telemetry) by keyword-matching the badge's free-text note against a fixed list: paus, no artifact, no handoff, stalled, idle, mid-sentence, did not return, no response. That list matches the current SOP Option-B note template in docs/sop/specialist-pause-handling.md, and correctly rejects policy-based skips such as a doc-only-slice waiver. The brittleness is structural, not a coding defect: real-world note phrasing drifts from the template, so a false negative silently UNDER-counts pauses (the exact failure class FEAT-275 exists to eliminate) and a false positive over-counts. There are currently no live skip-badge notes in this repo to validate the heuristic against, so its true error rate is unmeasured. Proposed fix: carry pause-detection as structured data rather than inferring it from prose -- e.g. an explicit --pause-detected flag (and optionally a --detection <no_artifact|scaffold_in_progress|mid_sentence> value) on the mark-badge / workflow-state gate write path, with the keyword heuristic retained only as a deprecated fallback for legacy badges written before the flag existed. Should also emit a counter when the fallback path fires, so the heuristic's real usage rate becomes observable instead of assumed. Depends on nothing; low risk; touches the crew-side badge writer contract, so check whether the flag needs an upstream request against dev-team before implementing.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.