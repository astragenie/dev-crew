---
decision: approved
reviewer: crew:reviewer (independent)
commit: 7dc2d32fdd32f1a762b97caf3c65dacebb8f69f9
branch: fix/w1-5
base: origin/main
date: 2026-07-10
---

# Review: JSONL ledger union merge driver + collision-safe learnings ids

## Scope reviewed

`.gitattributes`, `src/scripts/lib/learnings.mts`, `src/scripts/loop.mts`,
`src/tests/learnings.test.mts`, `docs/sop/jsonl-ledger-merge-driver.md`
(270 insertions / 24 deletions across 5 files).

## Verdict: PASS

## Findings

No blocking or major findings. Two minor/informational notes below.

### [INFO] src/scripts/lib/learnings.mts:108 — mintLearningId entropy
3 random bytes (24 bits, ~16.7M values) keyed per-millisecond via the ISO
timestamp prefix. At this repo's actual learning-write rate (single digits
to low tens per day per DEC log volume), birthday-bound collision risk
within the same millisecond across two concurrent writers is negligible.
Sound choice, no action needed.

### [INFO] docs/sop/jsonl-ledger-merge-driver.md:75 — grades.jsonl reader claim
Verified independently: `grep -rln "grades\.jsonl"` across `src/scripts` and
`src/tests` returns only `grade-jsonl-writer.mts`, `grade-writer.mts`, and
their tests — all writers/mirrors, never a reader. The functions that *do*
read grade data back (`readGrade`/`readGradeTrend` in `grade-parser.mts`,
`grade-trend.mts`, `perf-report.mts`) all operate on the `grades/*.md`
directory tree via `fs.readdir`, a wholly separate mechanism from the
`grades.jsonl` ledger. The SOP's claim holds.

## Verification detail

**1. Test assertion diff — exactly 3 modified, rest additive.**
Confirmed via `git diff` on `src/tests/learnings.test.mts`: the 3 assertions
that pinned the old sequential-integer contract are the only ones changed:
- `"logLearning appends a valid JSON line..."` — `typeof record.id === "number"` → `"string"` + regex-shape assertion (`/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z-[0-9a-f]{6}$/`).
- `"logLearning assigns monotonically increasing IDs"` → renamed to `"...assigns a unique id per call (no cross-branch collision)"`; `r1.id===1/r2.id===2/r3.id===3` replaced with pairwise `notEqual` + `Set` cardinality check.
- `"logLearning skips malformed existing lines..."` — `record.id === 2` → `typeof record.id === "string"` + `notEqual(String(record.id), "1")`.

All three replacements assert a real property (uniqueness, shape) rather than
a vacuous one — none of them were weakened to `assert.ok(true)` or removed
outright. New tests added (not modifications): a same-tick `Promise.all`
concurrent-mint uniqueness test, and 4 mixed-legacy/new-id-shape tests
covering `recentLearnings`, `searchLearnings`, and `deleteLearning` in both
directions.

**2. Other learnings-touching test files untouched.**
`grep -rl "learnings" src/tests/*.mts` lists 21 files total; `git diff
origin/main...HEAD --name-only -- src/tests/` shows only
`learnings.test.mts` changed. The other 20 (including
`learnings-ranker.test.mts`, `learnings-citations.test.mts`,
`learnings-decay.test.mts`, `learnings-worktree-canonical.test.mts`,
`grade-writer-learnings.test.mts`, `close-slice-learnings.test.mts`, etc.)
are untouched.

**3. Reader-audit / mixed-id-compat sweep.**
Grepped `.id` usage across `learnings-citations.mts`, `learnings-ranker.mts`
(and its test fixtures), `learnings-decay.mts`. All three already compare
via `String(entry.id) !== String(learningId)` (`learnings-citations.mts:91`,
pre-existing, not part of this diff) or treat `id` as an opaque
already-string field (ranker test fixtures use string ids like `"high"`,
`"mid"` — never touched learnings.jsonl's on-disk integer ids). No
`Math.max`-on-id or numeric-sort-on-id pattern found anywhere in the
consumer graph — the only place that ever computed `max(ids)+1` was the
deleted `nextId()` in `learnings.mts` itself. Mixed-shape compatibility is
real, not just asserted.

**4. `.gitattributes` pattern verification.**
Ran `git check-attr merge -- .claude/artifacts/loop/grades.jsonl
.claude/artifacts/loop/learnings.jsonl .claude/artifacts/loop/other.jsonl`
inside the worktree:
```
.claude/artifacts/loop/grades.jsonl: merge: union
.claude/artifacts/loop/learnings.jsonl: merge: union
.claude/artifacts/loop/other.jsonl: merge: unspecified
```
Exact-path patterns resolve correctly; no unintended over-broad match.

**5. mintLearningId format / lexical sortability.**
`new Date().toISOString()` always zero-pads to fixed-width groups
(`YYYY-MM-DDTHH:MM:SS.mmmZ`), so after the `:`/`.` → `-` swap, string
comparison order equals chronological order for same-era years (4-digit
year, no rollover concern at this horizon). Confirmed with a live sample:
`2026-07-10T16-42-48-006Z` matches the regex used both in
`mintLearningId`'s doc comment and `loop.mts`'s
`LEARNING_ID_STRING_RE`/test's shape-assertion regex. `Date.now()`-in-a-
Workflow-script is not a concern here — this is a runtime library function
(`learnings.mts`), not a Workflow-phase script under the repo's HARD RULE
restriction.

**6. Full evidence rerun.**
- `bun test src/tests/learnings.test.mts` → 30 pass, 0 fail.
- `bun test src/tests/ --parallel --timeout 60000` → 2703 pass, 1 skip, 0
  fail, 1108 expect() calls across 280 files (matches the builder's claimed
  2704/1-skip).
- `bunx tsc --project tsconfig.json --noEmit` → clean.
- `bunx tsc --project tsconfig.test.json --noEmit` → clean.
- `bunx biome format` on the 3 touched source/test files → clean, no diffs.
- `bunx biome lint` on the 3 touched files surfaces 3 pre-existing warnings
  in `loop.mts` (`noExcessiveCognitiveComplexity` at line 1887 in
  `runLessonsRankSubcommand`; `useOptionalChain` at lines 1273 and 1875).
  All three are outside this change's single diff hunk
  (`@@ -1813,18 +1813,36 @@`, i.e. lines 1813–1848) and `git blame` traces
  them to a 2026-06-14 commit predating this branch — not introduced or
  worsened here.

## Summary

The merge-driver fix is minimal and directly addresses the observed
hand-union incidents; `merge=union` is verified to actually apply via
`git check-attr`. The id-collision fix correctly diagnoses that a
sequential `max+1` counter is fundamentally unsound across concurrent
writers with no shared state, and replaces it with a per-call mint that
needs no cross-writer coordination. Backward compatibility for legacy
integer ids is real (verified in the actual consumer code, not just
asserted in new tests) — every touch point already used or was migrated to
opaque `String()` comparison. Test changes are narrowly scoped to the 3
assertions that encoded the retired contract, with meaningful replacement
assertions; no other test file needed to change. Documentation is accurate
against the code and my independent verification of its two central claims
(grades.jsonl has no in-repo reader; the merge driver behaves as described).
