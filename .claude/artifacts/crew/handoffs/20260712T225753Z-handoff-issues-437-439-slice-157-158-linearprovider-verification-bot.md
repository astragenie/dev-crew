# Task Handoff: Issues #437/#439 (SLICE-157/158 LinearProvider) verification — both SHIPPED

- Created: 2026-07-12T22:57:53.711Z
- From: researcher
- To: dispatcher
- Objective: Both #437 and #439 are fully shipped on main (PRs #443 + #447, closed via ceremony PR #448); the tracker just failed to close the GitHub issues — same pattern as #392/#164/#435.
- Allowed Scope:
  - Read-only verification of runner-plugin issues #437 (SLICE-157) and #439 (SLICE-158) against origin/main: AC-by-AC mapping to code + tests
  - test execution
  - and git/PR provenance.
- Forbidden Scope: -
- Deliverable: SHIPPED verdict for both issues with AC->file:line->test tables, 32/32 tests passing, and live-smoke validation evidence (real bug found+fixed in workflow-state transition, teamId type mismatch).
- Changed Files:
  - src/scripts/lib/task-store/providers/linear-provider.mts
  - src/scripts/lib/task-store/linear-config.mts
  - src/scripts/lib/task-store/linear-graphql.mts
  - src/tests/linear-provider.test.mts
  - src/tests/linear-provider-config.test.mts
  - src/tests/linear-provider-stubs.test.mts
  - .claude/artifacts/crew/validations/20260710T131500Z-validation-result-slice-157-158-linear-live-smoke.md
- Confidence: high
- Risks: GitHub issue #439's body text is byte-identical to #437's (same 5 ACs, seemingly a tracker copy bug) — its title promises config seeding + IssueBroker-reusable ops + manual smoke, which are NOT literally covered by AC text. I verified those title-implied items separately: config seeding is covered by linear-config.mts + linear-provider-config.test.mts; manual smoke is documented in the validation artifact (2 live runs). 'IssueBroker-reusable ops' has NO IssueBroker consumer yet — linear-graphql.mts is structured to be reusable (per its own doc comment, for future FEAT-245) but no IssueBroker file exists in the repo; this is future work, not something #439's AC text requires today. Recommend closing both issues referencing PR #443/#447/#448 rather than dispatching a builder.
- Suggested Next Handoff: Dispatcher: close #437 and #439 as already-shipped (reference PRs #443, #447, #448), do not dispatch builders. Consider a tracker-hygiene follow-up so ceremony-close (SLICE-157/158, and prior #392/#164/#435) auto-closes the linked GitHub issue instead of relying on manual issue-close.

