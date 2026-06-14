---
findings: "🔴:2,🟡:3,❓:0"
status: completed
---
# Review Result: SLICE-130 review (Reviewer B — production-readiness)

- Created: 2026-06-13T16:01:36.230Z
- Reviewer: inspector
- Decision: rejected
- Status: completed
- Summary: REJECT: complexity lint violation (CI gate fail), Prettier format failures (CI gate fail), limit-before-rank logic bug, three missing AC integration wires, and two test-adequacy gaps — all block merge.
- Evidence Checked:
  - 1) ESLint: runLessonsRankSubcommand complexity=16 > cap of 15 (loop.mts:1555); 2) Prettier: 4 files fail format:check (learnings-ranker.mts
  - loop.mts
  - learnings-decay.test.mts
  - learnings-ranker.test.mts); 3) limit-before-rank: loop.mts:1598-1600 applies allEntries.slice(0
  - limitRaw) BEFORE rankLearnings() — high-score entries late in the file are silently excluded; 4) AC scope gap: rankLearnings not called from start-slice/learnings.mts (dispatchInstruction still uses naive last-N)
  - appendCitation not called at slice-start
  - updateUtilityScoreInStore not called from grade-write; 5) Test gap: no test exercises updateUtilityScoreInStore with absent store file
  - no test for corrupt-JSON-line preservation; 6) appendCitation write errors propagate unwrapped (advisory); 7) Rewrite correctness is fine (split/join preserves trailing newline). TypeScript: clean. No process.exit in library files. Imports use .mjs. All 20 tests pass.
- Files Reviewed:
  - src/scripts/lib/learnings-citations.mts
  - src/scripts/lib/learnings-ranker.mts
  - src/scripts/lib/learnings-decay.mts
  - src/scripts/loop.mts (runLessonsRankSubcommand)
  - src/tests/learnings-citations.test.mts
  - src/tests/learnings-decay.test.mts
  - src/tests/learnings-ranker.test.mts
- Test Adequacy: 20 tests pass across 3 new test files; happy-path and edge cases well covered; missing: updateUtilityScoreInStore-with-absent-file path and corrupt-JSON-line-preservation path
- Risks: Merge as-is: slice-start still injects naive last-N learnings (AC not met); grade-write never updates utility scores; --limit N silently excludes high-ranked entries stored late in the file
- Required Follow-up: 1. Fix complexity: extract a helper (parse loop, scored entries, or limit logic) from runLessonsRankSubcommand to bring cyclomatic complexity to <=15. 2. Run bun run format:write then commit. 3. Move allEntries.slice(0,limitRaw) to AFTER rankLearnings() call. 4. Wire rankLearnings into recentLearnings (or slice-start) to replace naive last-N. 5. Wire appendCitation call at slice-start. 6. Wire updateUtilityScoreInStore call in grade-writer::writeGrade. 7. Add tests: updateUtilityScoreInStore with absent file, corrupt-JSON line preservation.

