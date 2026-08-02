---
id: FEAT-273
status: in-progress
priority: P2
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-174, SLICE-175]
derived_from: null
tags: [be, test]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.45
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-02
autonomous_safe: false
triage_notes: "P2: real but narrow-impact (one consumer repo demonstrated, not proven fleet-wide beyond citylive), correctly bounded as read-only-investigation-first which caps downside risk; technical_risk at 0.6-0.8 given the likely cross-plugin fix location and unconfirmed root cause (an actual spike, not routine work)."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Read-only investigation: reproduce + root-cause the citylive path mismatch"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Minimal fix + citylive-shaped fixture test (or upstream-request if crew-side)
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-02
github_issue: 581
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/581"
---
## Description

Investigate citylive zero-cost telemetry: all 11 clean cost reports in citylive show usd $0.00, cache_hit 0%, no Model Mix section — the cost scan finds no transcripts for that repo (likely source_project path mismatch: repo dir name vs project key, or transcripts under a different Claude projects dir). Read-only investigation first (researcher): reproduce, identify root cause in the cost scan path, then minimal fix so consumer repos with non-standard paths get real cost telemetry. Acceptance: a citylive-shaped fixture produces a non-zero report in tests.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the citylive repo's transcript/project directory layout, When the researcher reproduces the bug, Then the investigation identifies the exact mismatch (repo dir name vs Claude-projects-dir key, or an equivalent concrete cause) with file:line evidence.
- AC-2: Given a citylive-shaped test fixture (non-standard project-dir-to-repo mapping), When the cost scan runs against it, Then it produces a non-zero-usd report (the FEAT's own stated acceptance test).
- AC-3: Given the root cause is confirmed crew-side, When this FEAT closes, Then a docs/upstream-requests/ entry describes the reproduction and expected fix, rather than attempting an unverifiable loop-side patch.
- AC-4: Given the fix (if loop-side) lands, When applied to a repo with a STANDARD path convention, Then existing non-zero cost reports for that repo are unaffected (no regression for the common case).

## Proposed slices (PM decomposition)

- SLICE-1: Read-only investigation: reproduce + root-cause the citylive path mismatch (2 pts)
- SLICE-2: Minimal fix + citylive-shaped fixture test (or upstream-request if crew-side) (2 pts)
