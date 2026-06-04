---
id: GRADE-SLICE-38
slice: SLICE-38
feature: FEAT-012
spec: null
phase: 2
target_release: null
graded_at: 2026-06-04
duration_hours: null
scores: null
decisions: [DEC-008]
---
# SLICE-38: checkpoint-commit primitive — Grade

**Phase:** 2 · **Feature:** FEAT-012 · **Slice:** SLICE-38

## Scores

- architecture_quality: 0.88
- reliability: 0.90
- observability: 0.80
- production_readiness: 0.87
- security: 0.92
- test_confidence: 0.88
- product_completeness: 0.90

(Scores prefilled from crew artifacts where signals were available. Override any value if your honest assessment differs.)

### Inference sources

- test_confidence: reviews/20260604T215915Z-review-result-slice-38-checkpointcommit-primitive.md, reviews/20260604T220117Z-review-result-slice-38-checkpoint-commit-primitive.md
- observability: reviews/20260604T215915Z-review-result-slice-38-checkpointcommit-primitive.md

## Lessons

- `git add -u` only stages tracked files; new untracked files in a fresh-init repo are invisible to it. Test helpers must create an initial commit before testing the "dirty working tree" path.
- Dead-code introduced when a function's two return-paths collapse to the same value under one branch. Easy to miss until reviewer traces both paths. Pattern: when a boolean arg only affects the call-site guard (not the function body), remove it from the function signature.
- Prettier formatting caught on first run; format:check should be run before test to catch it early rather than after.
- marketplace.json version pinning drifted from plugin.json; manifest validator catches this but it should be kept in sync during release bumps.

## Decisions

### DEC-008: isWorkingTreeClean takes no stagedOnly parameter

**Rationale**: The `stagedOnly` branch of `isWorkingTreeClean` was dead code — both success and catch paths returned `true` unconditionally, making the `git diff --cached --quiet` call a no-op. The real staged-only clean-check is the `git diff --cached --stat` re-check that follows unconditionally. Removing `stagedOnly` from the function signature makes the two-stage flow readable: full-tree mode does porcelain check + git add -u; both modes then do the staged re-check.

**Consequences**:
- Function signature is simpler, intent is clear at a glance
- Reviewer finding resolved before landing rather than deferred to tech debt
- No behavior change — all 7 tests pass identically before and after the fix

## Surprises

- The `git add -u` + new-file test setup interaction was a non-obvious failure mode. `git add -u` is well-documented but "only staged tracked files" is easy to forget in a test context where files are always freshly created.
- The reviewer independently identified the dead-code note even though it was a subtle abstraction issue rather than a functional bug, demonstrating good value from independent review even on small slices.

## Followups

- SLICE-39 (future): CLI command `loop checkpoint` to invoke checkpointCommit from the command line.
- SLICE-40 (future): auto-trigger checkpoint during session (timers / hooks).
- SLICE-41 (future): ship-squash filter — WIP commit removal before PR.
- Consider adding a `git add -A` flag variant (for new untracked files) as an opt-in beyond `git add -u`.

## What went well

Implementation was tight and scope-clean. The `promisify(execFileCallback)` + `cwd` pattern is already established in the repo; no new dependencies. The reviewer found one real issue (dead-code) which was fixed before landing. All 6 ACs passed with evidence. Build was clean on first attempt after the test scaffold fix.

## What went wrong

Test scaffold initially used untracked files in a fresh repo, causing `checkpointCommit` to silently no-op (porcelain showed untracked files so the early-return skipped, but `git add -u` staged nothing). This was caught at test runtime rather than at design time. A more careful reading of `git add -u` behavior before writing tests would have caught it.

## What I would do differently next time

Pre-check `git add -u` semantics when writing WIP commit tests — always establish a base commit before modifying files. Add a note to the test helper docstring so the next maintainer doesn't hit the same trap.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_38_CONTINUOUS-CHECKPOINT-COMMITS-WITH-WIP-SQUASH-ON-SHIP.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-012.md`
- review artifact: `.claude/artifacts/crew/reviews/20260604T220117Z-review-result-slice-38-checkpoint-commit-primitive.md`
- validation: workflow-state badge `validation_passed` (behavior exercised via npm test, 7 new tests all pass)
