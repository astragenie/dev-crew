---
findings: "🔴:0,🟡:1,❓:0"
status: completed
---
# Review Result: SLICE-130 Reviewer A review

- Created: 2026-06-13T15:58:10.357Z
- Reviewer: inspector
- Decision: rejected
- Status: completed
- Summary: REJECT: decay formula, utility-score floor, and query-boost are all correct; 20/20 tests pass; but --limit N pre-filters the candidate pool before ranking instead of capping the post-rank output, producing wrong results when the store has more entries than the limit.
- Evidence Checked:
  - AC-1: K=Math.LN2/10 verified; 10-week result is exactly 0.5 (within 0.001). AC-2: appendCitation creates and appends JSONL with ISO timestamp; updateUtilityScoreInStore applies +1/−2 delta with Math.max(0
  - ...) floor; missing utility_score defaults to 0 (line 88). AC-3+4: rankLearnings sorts descending by decayConfidence*utility_score
  - query boost +0.1 on word match
  - token budget loop breaks at first over-budget entry. Tests: 20/20 green (bun test). Lint: zero warnings. TSC: zero errors in learnings modules. DEFECT: loop.mts lines 1598-1600 apply --limit as allEntries.slice(0
  - limitRaw) before rankLearnings
  - meaning --limit 5 on a 100-entry store ranks only the first 5 JSONL-order entries rather than returning the top 5 ranked entries from all 100.
- Files Reviewed:
  - src/scripts/lib/learnings-decay.mts
  - src/scripts/lib/learnings-citations.mts
  - src/scripts/lib/learnings-ranker.mts
  - src/scripts/loop.mts (runLessonsRankSubcommand)
  - src/tests/learnings-decay.test.mts
  - src/tests/learnings-citations.test.mts
  - src/tests/learnings-ranker.test.mts
- Test Adequacy: 20/20 tests pass across 3 files; decay=6 cases, citations=7 cases, ranker=6 cases; no test covers --limit CLI flag behavior, leaving the ranking-order bug untested.
- Risks: Any caller using --limit N to retrieve the top-N ranked learnings will silently get the top-N by insertion order instead. This defeats the purpose of the ranking step and degrades builder-dispatch quality.
- Required Follow-up: Fix loop.mts runLessonsRankSubcommand: apply limit after rankLearnings (ranked.slice(0, limitRaw)) not before. Add a test for --limit semantics (e.g. 10 entries, limit=3, verify returned ids are the 3 highest-scored not the first 3).

