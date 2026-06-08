# Task Handoff: SLICE-81: short-slice dispatch-order swap (FEAT-054)

- Created: 2026-06-07T23:04:21.736Z
- From: builder
- To: lead
- Objective: Documented the conditional reviewer/validator swap for short slices in hero-crew's orchestrate-slice command, with isShortSlice helper and 12 new tests covering the heuristic and doc assertions.
- Allowed Scope:
  - hero-crew commands/orchestrate-slice.md
  - scripts/orchestrate-slice-classify.ts
  - tests/orchestrate-slice.test.ts — loop repo ceremony only
  - no loop source changes
- Forbidden Scope: -
- Deliverable: Step 4.5 section added to orchestrate-slice.md defining SHORT_SLICE flag and DISPATCH_ORDER table; isShortSlice() exported from classify script; 12 new tests added covering boundary conditions and doc assertions; all 451 hero-crew tests pass
- Changed Files:
  - C:/work/mega/hero-crew/commands/orchestrate-slice.md
  - C:/work/mega/hero-crew/scripts/orchestrate-slice-classify.ts
  - C:/work/mega/hero-crew/tests/orchestrate-slice.test.ts
- Confidence: high
- Risks: none
- Suggested Next Handoff: crew:reviewer — verify spec completeness, short-gate definition correctness, and reviewer-prompt change; then loop:researcher — confirm GRADE-SLICE-51 recommendation aligns

