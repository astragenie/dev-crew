---
id: FEAT-046
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=5+ (inline prefix), derived_from=null → true"
---
# FEAT-046: Confidence signal mid-execution update after builder returns (SLICE-B of FEAT-010)

computeConfidence fires only at slice-start. After builder completes and before reviewer dispatches, loop has new evidence (builder pass/fail, files changed, test output) that could update the confidence signal. This was SLICE-B of FEAT-010 which was closed after SLICE-A shipped the static signal. Value is debatable — builder failure is surfaced separately. Low priority unless loop observer tooling consumes confidence changes. Acceptance criteria: AC-1: slice complete output includes updated confidence field reflecting post-builder evidence. AC-2: confidence can downgrade from green to yellow/red if builder reported failures. AC-3: static slice-start confidence unaffected when no builder report present. AC-4: existing confidence-signal tests pass.