# Task Handoff: SLICE-119: Runtime stuck-detector halt-badge

- Created: 2026-06-13T13:18:18.129Z
- From: fullstack-dev
- To: lead
- Objective: Adds stuckDetected halt-badge (9th in registry) with stuck-tick/stuck-reset CLI subcommands, fail-open detector, 7 unit tests, and docs — all gates PASS
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/stuck-detector.mts
  - src/scripts/lib/halt-badges.mts
  - src/scripts/lib/stop-conditions.mts
  - src/scripts/loop.mts
  - src/tests/stuck-detector.test.mts
  - src/tests/explain-halts.test.mts
  - docs/halt-badges.md
  - .gitignore
- Confidence: high
- Risks: -
- Suggested Next Handoff: Inspector review (correctness + AC coverage), then verifier run on full test suite

