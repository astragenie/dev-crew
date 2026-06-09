# Task Handoff: SLICE-82: multidim reviewer preset

- Created: 2026-06-08T23:07:58.782Z
- From: builder
- To: lead
- Objective: Extended reviewer-ladder.mts with multidim preset resolving to [correctness, test-coverage, conventions] with scope-fence and hard-budget prompts; 5 new passing tests; doc updated.
- Allowed Scope:
  - src/scripts/lib/reviewer-ladder.mts
  - src/tests/reviewer-ladder.test.mts
  - commands/slice-review-ladder.md
- Forbidden Scope: -
- Deliverable: multidim preset support: resolvePreset() + isMultidimId() helpers, DEFAULT_FOCUS entries for 3 dimensions, MULTIDIM_BUDGET_INSTRUCTION injected per prompt, 5 new unit tests (13 total in reviewer-ladder suite), slice-review-ladder.md doc with when-to-pick table
- Changed Files:
  - src/scripts/lib/reviewer-ladder.mts
  - scripts/lib/reviewer-ladder.mjs
  - src/tests/reviewer-ladder.test.mts
  - tests/reviewer-ladder.test.mjs
  - commands/slice-review-ladder.md
- Confidence: high
- Risks: CLAUDE.md update deferred per slice scope (doc-writer follow-up); synthesizer step deferred to separate slice per out-of-scope declaration
- Suggested Next Handoff: crew:reviewer dispatch for SLICE-82 (correctness + production-readiness per slice reviewer ladder)

