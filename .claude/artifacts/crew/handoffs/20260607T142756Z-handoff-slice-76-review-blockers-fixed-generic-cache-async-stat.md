# Task Handoff: SLICE-76 review blockers fixed — generic cache + async stat

- Created: 2026-06-07T14:27:56.294Z
- From: builder
- To: lead
- Objective: Fixed two type-safety blockers: made readFrontmatterCached generic to eliminate double cast in backlog-parser, and replaced synchronous statSync with async fs.stat inside the async readEntry function.
- Allowed Scope:
  - src/scripts/lib/frontmatter-cache.mts and src/scripts/lib/backlog-parser.mts only
- Forbidden Scope: -
- Deliverable: Generic readFrontmatterCached<T>, clean typed call in backlog-parser, statSync removed; compiled mjs outputs rebuilt; all 912 tests pass
- Changed Files:
  - src/scripts/lib/frontmatter-cache.mts
  - src/scripts/lib/backlog-parser.mts
  - scripts/lib/frontmatter-cache.mjs
  - scripts/lib/backlog-parser.mjs
- Confidence: high
- Risks: none
- Suggested Next Handoff: Re-run crew:reviewer against the updated diff to close SLICE-76 review

