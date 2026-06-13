---
id: FEAT-128
status: done
slices: [SLICE-118]
slices_complete: [SLICE-118]
completed_at: 2026-06-13
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
derived_from: null
composite_score: 6
source_competitors: [OpenHands]
autonomous_safe: false
tags: [workflow, pause-resume, halt-badge]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.4
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.65
pm_technical_risk: 0.5
pm_dependency_depth: 0.15
triage_notes: "Composite 6. Pause/resume conversation lifecycle for async waits (CI/review delay). Real pain in marathonMode — CI waits currently require session-end-and-restart. The halt-badge pattern (snapshot.mergeFailed already exists) provides the persistence hook. A snapshot.pausedForExternalEvent badge + /loop:resume entry point would close this. Medium effort, medium-high strategic alignment. autonomousSafe: false — requires architect review for state persistence design."
github_issue: 183
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/183"
---
# FEAT-128: Pause / resume conversation lifecycle for async waits

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- OpenHands

## Description

OpenHands has first-class pause/resume so a conversation can suspend on CI/review delay and resume exactly. loop currently treats CI wait as either polling (`/loop:pr-fix`) or session-end-and-restart. A first-class "pause until external event" primitive -- emitting a halt-badge, persisting the slice state, and a `loop:resume <slice>` entry point -- would close this.

## PM Scoring

```json
{
  "featureId": "FEAT-128",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.55,
    "strategic_alignment": 0.65,
    "technical_risk": 0.50,
    "dependency_depth": 0.15
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from OpenHands audit. snapshot.mergeFailed halt-badge already handles one pause scenario. The broader 'pause until external event' is not directly requested but is a natural extension.",
  "scopeNotes": "Minimum: add snapshot.pausedForExternalEvent halt-badge (shape: {triggered, reason, resumeHint, pausedAt}) + /loop:resume <slice> command that clears the badge and re-enters the walker. Existing halt-badges.md pattern must be followed. No new external deps.",
  "risks": [
    "State persistence across sessions requires workflow-state.json to track pause reason",
    "Resume semantics (re-run from what checkpoint?) need precise definition",
    "Interaction with marathonMode auto-continue must be designed",
    "Must not conflict with existing mergeFailed pause semantics"
  ],
  "reasoning": "P2: extends proven halt-badge infrastructure; real CI-wait pain in marathonMode; needs architect review for resume semantics."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://docs.openhands.dev/llms.txt (Pause/Resume + Persistence sections); v1.5.0 task-list tab
- docs/halt-badges.md — existing halt-badge pattern to follow
- src/scripts/lib/stop-conditions.mts — wire point

## Consider rejecting because

The current session-end-and-restart pattern, combined with slice artifacts and workflow-state.json, already provides a tolerable workaround for CI waits. Adding a first-class pause/resume primitive requires defining resume semantics precisely — what does "resume exactly" mean in a stateless Claude Code session? The gap between artifact-based state and true session resume may be unbridgeable at the plugin level.

## Delivery

Delivered in SLICE-118 (2026-06-13). All gates PASS: Reviewer A, Reviewer B, Validator.
Implementation: `src/scripts/lib/paused-for-external-event.mts` (new), stop-conditions wiring, halt-badges 8th entry, `pause`/`resume` CLI subcommands, docs/halt-badges.md registry section, .gitignore exclusion, 8 unit tests.
