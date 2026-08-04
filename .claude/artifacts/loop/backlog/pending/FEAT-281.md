---
id: FEAT-281
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

CI gate: detect exported functions whose only callers are their own tests (the tested-but-never-wired defect class). Three confirmed instances of this exact defect were found in a single session on 2026-08-03/04, each one a fully-implemented, fully-unit-tested function that no production code ever called -- so the feature did not exist at runtime while every gate reported green. (1) FEAT-275: recordDispatchOutcome and recordPauseEvent in src/scripts/lib/pause-telemetry.mts had zero callers outside their own module and tests; pause-events.jsonl sat frozen from 2026-07-02 while memory-snapshot.mts rendered its stale rate into loop-snapshot.md, which CLAUDE.md auto-loads into every session fleet-wide. (2) SLICE-182: renderWaveTelemetry in src/scripts/lib/memory-snapshot.mts existed with its own passing test file (src/tests/wave/snapshot-wave-telemetry.test.mts) but was never called from buildSnapshotLines, so the generated loop-snapshot.md contained no Wave telemetry section whatsoever -- verified by grep returning only the definition plus test hits. (3) FEAT-272: the {{dispatchLimits.maxSubagentsPerSlice}} template token never substituted because renderTemplate's regex excludes dots. Unit tests are structurally incapable of catching this class: the test is itself the only caller, so writing a test creates the very evidence that makes the gap invisible. Proposed gate: a validator that, for each exported symbol in src/scripts/lib/**, resolves its referencing files and flags any symbol whose references come exclusively from its own defining module and files under src/tests/. Needs a deliberate allowlist mechanism for legitimately test-only or public-API-surface exports (and for entry points reached via dynamic import, which this repo uses heavily -- see the await import patterns in close-slice.mts and loop.mts, so a naive static grep will produce false positives that must be handled rather than ignored). Consider emitting a warning tier before a hard-fail tier so the existing backlog of such exports can be triaged rather than blocking CI on day one.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.