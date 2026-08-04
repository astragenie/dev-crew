---
findings: "🔴:0,🟡:0,❓:0"
status: completed
decision: approved
author_id: builder-180
judge_id: crew:reviewer
self_approval: false
---
# Review Result: SLICE-180 (FEAT-276) — mixed-confidence wave-packing order-independence fixtures

- Created: 2026-08-04T13:42:15Z
- Reviewer: crew:reviewer
- Decision: approved (PASS)
- Status: completed
- Commit reviewed: `d07ce66a` on branch `worktree-agent-af4375ae29bcb0b1c`
  (`SLICE-180: regression fixtures — mixed-confidence wave packing is
  order-independent (FEAT-276)`)
- Files reviewed:
  - `src/tests/wave/mixed-confidence-order-independence.test.mts` (new, 202 lines)
  - `src/scripts/lib/wave/planner.mts` (confirmed untouched — tests-only slice)
- Evidence checked: full diff via `git diff --stat main...HEAD` (single file,
  202 insertions); read the entire test file; read `planner.mts` in full to
  re-derive `packWave` control flow; **mutation check** — temporarily reverted
  `packWave` in-worktree to the exact pre-SLICE-179 buggy logic (`git show
  3407bd8a`'s parent hunk, hand-applied, never committed), ran the new test
  file, restored via `git checkout --`, reran to confirm green; independently
  verified the permutation generator produces 24/24 unique orderings for n=4
  and 6/6 for n=3 via a standalone script; ran `bun test src/tests/wave/`
  (105 pass/0 fail, matches builder's claim); ran `bunx tsc --project
  tsconfig.test.json --noEmit` (clean); ran `bunx biome lint` and `bunx
  biome format` on the new file (both clean); cross-checked FEAT-278 exists
  in `.claude/artifacts/loop/backlog/pending/FEAT-278.md` and its description
  matches the scoping comment; cross-checked FEAT-276's AC-5 and
  `proposed_slices` mapping (`-SLICE-4` = wave telemetry = SLICE-182) against
  the builder's PARTIAL claim.

## Findings (severity order)

None. No HIGH/MEDIUM/LOW issues found.

## Verification against the five review questions

1. **Do the assertions genuinely bind?** Yes, confirmed by direct mutation
   testing, not just code-reading. All 5 tests were run against the
   restored pre-SLICE-179 `packWave` (push+break on the first missing-
   confidence candidate encountered while `picked` is still empty) and **all
   5 went red**:
   - Test 1 (declared-set stability): expected `{D1,D2}`, got `{M1}` for
     permutations where a missing candidate is processed before any declared
     one — the old code's break discards D1/D2 entirely.
   - Test 2 (inferred-candidate stability): same failure mode, `{D1,I1}` →
     `{M1}`.
   - Test 3 (all-missing solo-only): `p.size===1` and `items[0]` still
     matched under the old code (solo dispatch was already correct there),
     but the loser-rejection assertions threw — old code's `break` exits the
     loop before ever appending to `rejected`, so `rejected` was empty and
     `p.rejected.find(...)?.reason` was `undefined`, failing `.toContain()`.
     This is the "silently disappearing" defect SLICE-179's own commit
     message specifically calls out as fixed, and this fixture catches it.
   - Test 4 (missing candidate never decides conflict winner): failed
     outright — for permutations where the missing candidate precedes both
     conflicting declared candidates, old code solo-dispatches the missing
     candidate itself (`items[0]==="M1"`, expected `"C1"`), which is exactly
     the poison-pill bug SLICE-179 fixed.
   - Test 5 (rejection-completeness): `accountedFor.length` was 1 instead of
     3 for scenarios where a missing candidate leads, confirming the
     dropped-candidate defect.
   After restoring the real `planner.mts` (`git checkout --`), all 5 tests
   passed again (172 assertions). This is about as strong a "these fixtures
   bind" signal as a tests-only review can produce — not decorative.

2. **Is "exhaustive permutation" real?** Yes. The recursive generator
   (`permutations<T>`) is a standard full-permutation algorithm with no
   sampling or early exit. Verified independently outside the test file:
   ran the exact same generator logic against `[1,2,3,4]` and `[1,2,3]` —
   produced 24 and 6 results respectively, all unique (checked via a
   dedup Set on the joined string). Matches the claimed counts exactly, and
   matches `4!`/`3!`. No off-by-one or truncation.

3. **Property 2's stated exception (solo winner = first-ranked).** Confirmed
   legitimate, not a bug pinned as intended. `packWave` iterates `ranked` in
   order and pushes onto `missingQueue` in that same order, so
   `missingQueue[0]` is always the first-ranked candidate reaching the loop.
   The solo-grant path (`planner.mts:68-77`) picks `missingQueue[0]`
   specifically, which is documented in the SLICE-179 commit as "dispatch
   the top-ranked missing-confidence candidate solo rather than starving the
   wave forever" — the test's assertion (`items[0] === perm[0]`, since in
   this fixture every candidate is missing-confidence and `perm` is passed
   directly as `ranked`) matches that documented intent precisely.

4. **FEAT-278 scoping.** Honest, not hiding a real failure. The comment
   block (lines 152-161) names the exact gap (`if (picked.length >=
   opts.waveSize) break;` silently drops the remainder), cites FEAT-278 by
   id, and explains why all four completeness scenarios use `waveSize: 100`
   (`>= candidate count` in every case) to keep the capacity path from
   firing. Confirmed FEAT-278 exists in `backlog/pending/` with a
   description matching word-for-word the described gap (including the
   `waveSize <= 0` degenerate case). Confirmed via `git diff --stat
   main...HEAD` that `planner.mts` has zero changes in this commit — the
   builder did not touch production code to make anything pass.

5. **AC-5 PARTIAL.** Honest status, boundary respected. FEAT-276's AC-5
   ("wave telemetry reports achieved packing width and per-candidate
   rejection reason") maps to `proposed_slices[-SLICE-4]` = "Wave
   telemetry: packing width + per-rejection reason", which is SLICE-182 per
   FEAT-276's `slices:` frontmatter list. This slice's diff touches only the
   test file — no `memory-snapshot.mts` or telemetry-surface changes — so
   the concurrent-builder boundary is respected. What SLICE-180 does deliver
   toward AC-5 is proof that the *underlying rejection reasons* (`missing`,
   `conflict_with_*`) are already correct and stable per-candidate across
   ordering, which is the precondition SLICE-182's telemetry surfacing will
   consume; it does not itself surface anything to an operator, matching
   PARTIAL rather than DONE.

6. **Test hygiene.** Filename (`mixed-confidence-order-independence.test.mts`)
   is behavior-descriptive, no release-version prefix, matches repo
   convention. No shared mutable state between tests — each test builds its
   own candidates via the local `cand()` helper and calls `permutations()`
   fresh; no ordering dependence observed (ran the file standalone and as
   part of the full `wave/` subdirectory with identical results). Runtime is
   trivial (~56ms for 5 tests / 172 assertions when run standalone, part of
   a 1.35s / 105-test wave-directory run).

## Scope discipline

Confirmed no scope creep: `planner.mts` untouched, no edits outside the one
new test file. AC-4 (touches_files coverage, SLICE-181, already merged) and
AC-5's telemetry surfacing (SLICE-182, concurrent/out of scope) correctly
not touched here.

## Verdict

**PASS.** The four claimed properties are real and the fixtures that prove
them are load-bearing, not decorative — verified directly by reverting
`packWave` to its pre-SLICE-179 buggy form and observing all 5 new tests go
red, then restoring and confirming green. Permutation exhaustiveness is
independently verified (24/24, 6/6). The solo-winner-by-rank exception,
FEAT-278 capacity-path scoping, and AC-5 PARTIAL status are all accurately
represented and match documented intent / real backlog state. No findings.
