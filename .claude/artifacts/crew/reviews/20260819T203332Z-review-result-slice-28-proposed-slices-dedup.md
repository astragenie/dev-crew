---
decision: approved
reviewer: crew:reviewer
slice: SLICE-28
reviewed_commits: [32dd3577]
---

# Review — SLICE-28 (FEAT-010, P0): proposed-slices duplicate-recreation + uniqueness gaps

## Summary

Commit `32dd3577` fixes two real bugs in `src/scripts/lib/proposed-slices.mts`
/ `feature-lifecycle.mts`: Gap B (untrimmed title comparison defeats the
legacy title-match fallback, causing unbounded duplicate slice + tracker
issue recreation on every rerun — the GitHub issue 598 class of bug) and Gap
A (no uniqueness check on `proposed_slices` title/id_suffix, letting a
duplicate collapse two legacy slices onto one id, or silently swallow a
second entry). I independently reproduced the stash round-trip (all 7 new
tests genuinely fail on pre-fix code, pass after), attacked the fix with the
specific adversarial cases requested, and traced every real caller of
`parseProposedSlices` to verify the FEAT-005 unreachability claim rather
than trusting it. **Decision: approved.**

## 1. Stash round-trip — independently reproduced

Reverted both source files to their pre-fix state
(`git show d4e026a1:<path>`, the parent commit) and ran the target test
files against the new tests:

- `src/tests/proposed-slices.test.mts`: **37 pass, 6 fail** — the 6 failures
  are exactly the 6 new FEAT-010 tests (title-trim ×3, Gap A duplicate-title
  ×2, Gap A duplicate-id_suffix ×1).
- `src/tests/slice-from-feature-proposed-slices.test.mts`: **16 pass, 1
  fail** — the failure is exactly `sliceFromFeature: a whitespace-padded
  proposed title matches its own legacy (unstamped) slice by trimmed title
  across repeated reruns` (the 3-rerun regression test).

Restored both files (`git diff --stat` on them came back empty — clean,
byte-identical to HEAD) and reran: **60 pass, 0 fail** across both files.
The builder's stash-proven claim is genuine, not asserted.

*Operational note, not a defect*: this repo has a concurrent autonomous-loop
process actively running slices (SLICE-29/30/31, unrelated FEATs) in the
same working tree while I did this. `git status` before/after confirms the
only files I touched were the two source files, restored clean; the other
~20 modified/untracked files are from that concurrent process, not from my
revert. Flagging for awareness, not as a review finding.

## 2. Attacking the fix

- **Whitespace-only title hard-rejects**: yes —
  `test("FEAT-010: a title that is only whitespace fails as empty, not as
  whitespace-only")` passes post-fix (was one of the 6 pre-fix failures).
  `validateOne` trims first, so `"   "` becomes `""`, which then fails the
  existing `length === 0` check with the *original* untrimmed value echoed
  in the error (`JSON.stringify(titleRaw)`) — a nice touch, the error shows
  what was actually typed, not the post-trim empty string.
- **A duplicate differing only by whitespace is caught**: yes — confirmed
  both by reading `assertUniqueProposedSlices` (it runs after `validateOne`
  has already trimmed every title, so `"  Same title"` and `"Same title  "`
  both key to `"Same title"` in the `Map`) and by the stash round-trip
  (`FEAT-010 Gap A: duplicate title after trimming (whitespace-only
  difference) rejects` was one of the 6 pre-fix failures, passes now).
- **The uniqueness error names the value + indices**: yes, both dimensions —
  `duplicate title "Same title" in proposed_slices (slice 0 and slice 1) —
  titles must be unique...` and `duplicate id_suffix "-SLICE-1" in
  proposed_slices (slice 0 and slice 1) — id_suffix must be unique...`,
  confirmed via the passing test assertions
  (`/duplicate title "Same title"/`, `/slice 0 and slice 1/`,
  `/duplicate id_suffix "-SLICE-1"/`).

## 3. Attacking the FEAT-005 unreachability claim

Grepped every real (non-test) caller of `parseProposedSlices` directly:
only `src/scripts/lib/pm-apply.mts` and
`src/scripts/lib/slice-linker/feature-lifecycle.mts`. No validator under
`src/scripts/validate-*.mts` references `backlog/done` or does a
backlog-wide sweep of `proposed_slices`. Traced `sliceFromFeature`'s only
caller in `loop.mts` (the `slice from-feature` CLI command) — it requires
an explicit `--id FEAT-NNN` (`requireId(...)`) and is never invoked in a
loop over the whole backlog; same for `pm-apply` (PM decomposition targets
one FEAT at a time, driven from `pending`/`triaged`, not `done`). Confirmed:
no CI gate or automated backlog sweep re-parses `done/FEAT-005.md` through
this function, matching the disposition's claim.

**One nuance worth surfacing** (not a blocker, and not what "CI going red
unannounced" was asking about): `findFeatureById` searches across all state
directories including `done/`, and `sliceFromFeature` has no
`status === "done"` guard before calling `parseProposedSlices`. So a
*manual* `bun src/scripts/loop.mts slice from-feature --id FEAT-005` (or an
agent mistakenly targeting a done FEAT id) would now hard-fail with the new
uniqueness error, where previously it would have silently no-op'd through
to the idempotent-materialization branch. This is arguably the *better*
behavior (surfacing a real, pre-existing data-quality issue in FEAT-005
instead of masking it) rather than a regression, and it's a deliberate,
attributable action (not an unannounced CI failure) — but it means "the new
check does not fire on it" is precise only for automated/CI paths, not for
every conceivable invocation. Worth a one-line ledger caveat, not worth
blocking on.

Independently verified the underlying data claim too: `grep -n "id_suffix"
.claude/artifacts/loop/backlog/done/FEAT-005.md` shows `-SLICE-2` at both
line 27 and line 31 — the duplicate is real. And the "7 files carry
`proposed_slices`" backlog-scan count is exactly right (`grep -rl
"proposed_slices:" .claude/artifacts/loop/backlog/` → 7 files); I manually
read all `id_suffix`/`title` pairs in the other 6 (FEAT-001 through
FEAT-004, FEAT-006, FEAT-014) and found no other duplicates the ledger
might have missed — "found exactly one pre-existing duplicate" holds.

## 4. BacklogStore compliance + collision check

- `bun src/scripts/validate-backlog-writes.mts` → `OK — no raw backlog-state
  writers outside BacklogStore/allowlist.` `assertUniqueProposedSlices` is
  pure validation (throws only, no writes), so this is expected and
  confirms no boundary violation was introduced.
- **Collision check** (the specific scenario asked about — two distinct
  legacy slices whose titles differ only by whitespace): this is exactly
  what Gap A's "duplicate title after trimming" test covers on the
  *proposed* side, and I confirmed via the stash round-trip that it
  genuinely fires pre-fix-vs-post-fix. Since `assertUniqueProposedSlices`
  runs immediately after `validateOne` (which already trimmed every title)
  and *before* any materialization/matching happens, two proposed entries
  that only differ by whitespace can never coexist to ambiguously satisfy
  `matchProposedIdSuffix`'s `.find()` — the array is rejected outright at
  parse time, so the fallback never even runs against an ambiguous set.
  **Separately, and out of this slice's scope**: this doesn't protect
  against two already-*materialized* slice *files* coincidentally sharing
  an identical stored title (a different, narrower, pre-existing risk on
  the materialized-slice side rather than the proposed-slices side) — Gap A
  only validates the `proposed_slices` frontmatter array, not existing
  slice files. I don't think this is in scope for FEAT-010 (which is
  specifically about the `proposed_slices` parse/validate boundary), but
  worth a mental note for whoever eventually audits materialized-slice
  title uniqueness directly.

## 5. Targeted suites

Per the lead's instruction, ran only the targeted files (not the full
suite):
- `src/tests/proposed-slices.test.mts` + `src/tests/slice-from-feature-proposed-slices.test.mts`: **60 pass, 0 fail** (combined run, post-restore).
- `bun src/scripts/validate-backlog-writes.mts`: green.

## Decision rationale

`approved`. Both gaps are real, correctly diagnosed, and correctly fixed —
independently confirmed via my own stash round-trip rather than trusting
the builder's report. The fix is narrowly scoped (trim at the one parse
boundary, add a straightforward uniqueness pass keyed on the now-normalized
values) and the new tests genuinely distinguish old from new behavior. The
FEAT-005 unreachability claim holds for every automated/CI path I could
find by tracing actual callers, with one precision caveat (manual
single-FEAT invocation) that's worth a ledger footnote but doesn't change
the verdict — it's a deliberate, attributable action surfacing a real
pre-existing data issue, not a silent CI regression. BacklogStore
compliance is green, and the specific whitespace-collision scenario the
review was asked to attack is confirmed closed by Gap A.
