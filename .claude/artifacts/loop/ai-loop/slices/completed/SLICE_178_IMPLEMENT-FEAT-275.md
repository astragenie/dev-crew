---
id: SLICE-178
title: Implement FEAT-275
status: completed
feature: FEAT-275
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-03
updated: 2026-08-04
github_issue: 585
github_url: "https://github.com/astragenie/runner-plugin/issues/585"
completed_at: 2026-08-04
badges: [serial-reviewer-warning]
---
# SLICE-178: Implement FEAT-275

Implements FEAT-275. See [feature file](../../../backlog/in-progress/FEAT-275.md) for product context.

## Objective

Pause telemetry is a dead write-path: wire recordDispatchOutcome/recordPauseEvent into the live dispatch flow. Evidence (2026-08-03 sweep): both exported functions in src/scripts/lib/pause-telemetry.mts have ZERO callers anywhere outside their own definition file and their unit tests. .claude/artifacts/loop/pause-events.jsonl was last appended 2026-07-02T18:34 (last two records are dispatch_outcome for SLICE-134), while auto-dispatch.jsonl is current to 2026-08-02 -- so the dispatch flow is alive but never records outcomes. Meanwhile memory-snapshot.mts:376 reads summarizePauseRate and renders 'Pause rate (last N dispatches)' into .claude/artifacts/loop/loop-snapshot.md, which CLAUDE.md auto-loads via @ include into EVERY session. Net effect: every agent in every repo starts by reading a month-stale 66.7 percent pause rate as if it were live, and the 7 real idle-without-report pauses observed on 2026-08-02 were never recorded at all. Fix: call recordDispatchOutcome at dispatch completion and recordPauseEvent on pause/resume from the slash-flow dispatch paths (slice-linker + wave runner), and add a staleness guard so the snapshot renders 'no data' rather than a stale rate when the newest record is older than a configurable window.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a specialist dispatch completes (success or failure) via src/scripts/lib/slice-linker/dispatch.mts, When the dispatch resolves, Then recordDispatchOutcome is called with outcome 'completed' or 'paused' and the row is appended to pause-events.jsonl.
- [ ] AC-2: Given a wave-mode dispatch completes via src/scripts/lib/wave/runner.mts, When the dispatch resolves or a specialist pause is detected per docs/sop/specialist-pause-handling.md, Then recordDispatchOutcome AND (on pause) recordPauseEvent with the correct PauseDetection kind are both called, and a resume/resume_success event is recorded when the pause resolves.
- [ ] AC-3: Given memory-snapshot.mts renders the 'Pause rate (last N dispatches)' bullet, When the newest pause-telemetry record's timestamp is older than a configurable staleness window (default matches the existing cost-trajectory staleness convention), Then the snapshot renders 'no data (stale, last record: <ISO date>)' instead of a numeric rate.
- [ ] AC-4: Given pause-events.jsonl is missing, empty, or contains malformed lines, When summarizePauseRate or the new staleness check runs, Then it returns tail-safe 'no data' rather than throwing (preserves the existing contract documented in pause-telemetry.mts's file header).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-275 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
