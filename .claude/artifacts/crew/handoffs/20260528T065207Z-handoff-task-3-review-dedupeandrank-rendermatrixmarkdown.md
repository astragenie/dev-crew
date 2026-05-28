# Task Handoff: Task 3 review: dedupeAndRank + renderMatrixMarkdown

- Created: 2026-05-28T06:52:07.687Z
- From: reviewer
- To: lead
- Objective: REJECTED — two correctness defects require fixes before Task 3 can be closed.
- Allowed Scope:
  - Code quality review of aggregate.mjs dedupeAndRank and renderMatrixMarkdown additions (d362bba); read-only.
- Forbidden Scope: -
- Deliverable: Review result artifact at .claude/artifacts/crew/reviews/20260528T065158Z-review-result-task-3-dedupeandrank-rendermatrixmarkdown-review.md
- Changed Files:
  - scripts/competitor-audit/aggregate.mjs
  - tests/competitor-audit-aggregate.test.mjs
- Confidence: high
- Risks: Stale composite corrupts ranking sort order; MIN(effort) semantic untested and could regress silently.
- Suggested Next Handoff: Return to builder for two required fixes: (1) recompute composite in mergeGapInto from merged components; (2) add a test that proves min-effort selection with divergent effort values. Two lower-priority items noted: warn on empty-normalised title; trim base cell in renderMatrixMarkdown row template.

