# Task Handoff: SLICE-75 review: rejected — Win 1 cache unwired

- Created: 2026-06-07T13:26:21.351Z
- From: reviewer
- To: lead
- Objective: SLICE-75 rejected: frontmatter-cache module is dead code — readFrontmatterCached is never called from any production source; bench harness and parallel backlog walk are sound.
- Allowed Scope:
  - Review of bench harness (bench.mts
  - bench-runner.mts)
  - frontmatter-cache.mts + tests
  - backlog-parser.mts parallelization
  - baseline.json
  - and package.json bench script for SLICE-75 (FEAT-071 C1+C2).
- Forbidden Scope: -
- Deliverable: Review-result artifact at .claude/artifacts/crew/reviews/20260607T132610Z-review-result-slice-75-bench-harness-perf-wins-1-5.md — decision: rejected.
- Changed Files:
  - .claude/artifacts/crew/reviews/20260607T132610Z-review-result-slice-75-bench-harness-perf-wins-1-5.md
- Confidence: high
- Risks: Win 1 is entirely dead — no real p50 improvement has landed. Bench silently accepts failed-command wall-clock (spawnSync result.status unchecked).
- Suggested Next Handoff: Return to builder: wire readFrontmatterCached into backlog-parser.mts readEntry(), add fs.stat mtime threading, add clearFrontmatterCache() call at each loop.mts top-level handler, re-bench to confirm measurable drop.

