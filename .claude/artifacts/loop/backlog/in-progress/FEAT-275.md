---
id: FEAT-275
status: in-progress
priority: P2
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-03
depends_on: []
slices: [SLICE-178]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-03
autonomous_safe: true
triage_notes: "P2: high strategic alignment (this is the loop's own self-observability, dogfooded into every session's CLAUDE.md context) and real customer_impact (fleet-wide silent-wrong telemetry, not just missing data) offset by low technical_risk (wiring into existing, already-tested primitives, no schema change) and low effort (3-point band, no decomposition needed)."
started_at: 2026-08-03
github_issue: 584
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/584"
---
## Description

Pause telemetry is a dead write-path: wire recordDispatchOutcome/recordPauseEvent into the live dispatch flow. Evidence (2026-08-03 sweep): both exported functions in src/scripts/lib/pause-telemetry.mts have ZERO callers anywhere outside their own definition file and their unit tests. .claude/artifacts/loop/pause-events.jsonl was last appended 2026-07-02T18:34 (last two records are dispatch_outcome for SLICE-134), while auto-dispatch.jsonl is current to 2026-08-02 -- so the dispatch flow is alive but never records outcomes. Meanwhile memory-snapshot.mts:376 reads summarizePauseRate and renders 'Pause rate (last N dispatches)' into .claude/artifacts/loop/loop-snapshot.md, which CLAUDE.md auto-loads via @ include into EVERY session. Net effect: every agent in every repo starts by reading a month-stale 66.7 percent pause rate as if it were live, and the 7 real idle-without-report pauses observed on 2026-08-02 were never recorded at all. Fix: call recordDispatchOutcome at dispatch completion and recordPauseEvent on pause/resume from the slash-flow dispatch paths (slice-linker + wave runner), and add a staleness guard so the snapshot renders 'no data' rather than a stale rate when the newest record is older than a configurable window.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a specialist dispatch completes (success or failure) via src/scripts/lib/slice-linker/dispatch.mts, When the dispatch resolves, Then recordDispatchOutcome is called with outcome 'completed' or 'paused' and the row is appended to pause-events.jsonl.
- AC-2: Given a wave-mode dispatch completes via src/scripts/lib/wave/runner.mts, When the dispatch resolves or a specialist pause is detected per docs/sop/specialist-pause-handling.md, Then recordDispatchOutcome AND (on pause) recordPauseEvent with the correct PauseDetection kind are both called, and a resume/resume_success event is recorded when the pause resolves.
- AC-3: Given memory-snapshot.mts renders the 'Pause rate (last N dispatches)' bullet, When the newest pause-telemetry record's timestamp is older than a configurable staleness window (default matches the existing cost-trajectory staleness convention), Then the snapshot renders 'no data (stale, last record: <ISO date>)' instead of a numeric rate.
- AC-4: Given pause-events.jsonl is missing, empty, or contains malformed lines, When summarizePauseRate or the new staleness check runs, Then it returns tail-safe 'no data' rather than throwing (preserves the existing contract documented in pause-telemetry.mts's file header).

## Scope note (post-review, SLICE-178, 2026-08-03)

**AC-1 narrowed to reviewer/validator-tier only — signed off by the FEAT
owner (team lead), not a builder unilateral scope cut.** Verified by reading
the full file: `src/scripts/lib/slice-linker/dispatch.mts` only assembles a
prompt string (`buildDispatchInstruction`) — it has no execution/await
machinery and never observes a dispatch's resolution, so it structurally
cannot be AC-1's signal source. The implemented substitute derives
`crew:reviewer`/`crew:verifier` dispatch outcomes from the same review-gate/
validation-gate state `close-slice.mts` already computes at close time
(`src/scripts/lib/slice-linker/close-dispatch-telemetry.mts`).

**Builder-tier dispatches (the default, non-wave orchestrator mode's
dominant real-world pause case per the SOP's own reproduction table) are
NOT covered by this FEAT.** Builders write no artifact by design
(`docs/sop/specialist-pause-handling.md` lines 128-131), and there is no
retroactive gate signal to derive their outcome from — the only real signal
would be a live SubagentStop report-gate hook, which is **FEAT-259 slice 1**
and has not been built yet. Extending coverage to builder-tier dispatches is
blocked on that FEAT, not on this slice's effort; do not re-open this FEAT to
attempt it without FEAT-259 landing first.

Wave-mode coverage (AC-2, `src/scripts/lib/wave/runner.mts`) is NOT subject
to this narrowing — `WorktreeResult.status` is a real signal for the whole
per-worktree ceremony (including builder-tier failures, since the worktree
fails if the builder fails), independent of the gate-derivation approach
above.

The "Pause rate" snapshot bullet's label (`memory-snapshot.mts`) was reworded
to `Pause rate (reviewer/validator + wave dispatches, last N)` so it never
implies fleet-wide (all-dispatch, all-orchestrator-mode) coverage.
