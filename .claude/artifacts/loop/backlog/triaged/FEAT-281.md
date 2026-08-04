---
id: FEAT-281
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.85
pm_technical_risk: 0.6
pm_dependency_depth: 0.2
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "Highest strategic value of the three because it's the only one that prevents recurrence of a whole defect class rather than patching one instance, and the class has already manifested three times with a proven fleet-wide side effect. Effort and risk are both elevated relative to FEAT-282/283 because it's new static-analysis infrastructure, not a bugfix in existing logic, which is why it lands at P1 rather than P0 despite the strong demand evidence — the warn-tier-first design is a technical-risk mitigation, not a scope reduction, and should stay in the AC set."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Reference-graph scanner: flag exported lib symbols referenced only by their own tests"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Allowlist config + dynamic-import call-site resolution to suppress false positives
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: "Warn-tier CLI wiring and report output (no CI hard-fail, no gate-list renumber yet)"
    points: 2
    estimated_tokens: 100000
---
## Description

CI gate: detect exported functions whose only callers are their own tests (the tested-but-never-wired defect class). Three confirmed instances of this exact defect were found in a single session on 2026-08-03/04, each one a fully-implemented, fully-unit-tested function that no production code ever called -- so the feature did not exist at runtime while every gate reported green. (1) FEAT-275: recordDispatchOutcome and recordPauseEvent in src/scripts/lib/pause-telemetry.mts had zero callers outside their own module and tests; pause-events.jsonl sat frozen from 2026-07-02 while memory-snapshot.mts rendered its stale rate into loop-snapshot.md, which CLAUDE.md auto-loads into every session fleet-wide. (2) SLICE-182: renderWaveTelemetry in src/scripts/lib/memory-snapshot.mts existed with its own passing test file (src/tests/wave/snapshot-wave-telemetry.test.mts) but was never called from buildSnapshotLines, so the generated loop-snapshot.md contained no Wave telemetry section whatsoever -- verified by grep returning only the definition plus test hits. (3) FEAT-272: the {{dispatchLimits.maxSubagentsPerSlice}} template token never substituted because renderTemplate's regex excludes dots. Unit tests are structurally incapable of catching this class: the test is itself the only caller, so writing a test creates the very evidence that makes the gap invisible. Proposed gate: a validator that, for each exported symbol in src/scripts/lib/**, resolves its referencing files and flags any symbol whose references come exclusively from its own defining module and files under src/tests/. Needs a deliberate allowlist mechanism for legitimately test-only or public-API-surface exports (and for entry points reached via dynamic import, which this repo uses heavily -- see the await import patterns in close-slice.mts and loop.mts, so a naive static grep will produce false positives that must be handled rather than ignored). Consider emitting a warning tier before a hard-fail tier so the existing backlog of such exports can be triaged rather than blocking CI on day one.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- Given an exported symbol in src/scripts/lib/** referenced only from its own defining file and files under src/tests/, when the new validator runs, then it flags the symbol as a candidate unwired export in its warn-tier report.
- Given a symbol explicitly listed in the allowlist config as test-only or public-API surface, when the validator runs, then no warning is emitted for that symbol.
- Given a symbol reached only via a dynamic `await import(...)` call from production code, when the validator resolves references, then the dynamic-import call site counts as a real caller and the symbol is not flagged.
- Given the validator runs in warn tier, when it finds candidate unwired exports, then it exits 0 and prints a report rather than failing the build.
- Given a symbol has zero references anywhere outside its own defining file (not even from tests), when the validator runs, then it is still flagged as a warn-tier candidate regardless of allowlist status, since an allowlist entry implies deliberate test-only or public-API intent, not total non-use.

## Proposed slices (PM decomposition)

- SLICE-1: Reference-graph scanner: flag exported lib symbols referenced only by their own tests (2 pts)
- SLICE-2: Allowlist config + dynamic-import call-site resolution to suppress false positives (2 pts)
- SLICE-3: Warn-tier CLI wiring and report output (no CI hard-fail, no gate-list renumber yet) (2 pts)
