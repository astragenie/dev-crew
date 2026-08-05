---
slice: SLICE-201
feature: FEAT-283
reviewer: crew:reviewer (independent, dispatched by team lead)
commit: 76fabfd5
decision: approved_with_notes
---

# Review: SLICE-201 — sort review/validation artifacts by filename ISO timestamp, not mtime

## Verdict

**approved_with_notes.** The core defect (mtime is not durable across
clone/checkout/cherry-pick/worktree materialization) is genuinely fixed, the
fix matches the real corpus's filename shapes, and the test suite
deliberately sets mtime opposite to filename order so it cannot pass by
coincidence. One real precision gap exists in the date-only fallback shapes
(see finding 1) — narrow, pre-existing in spirit, and out of the slice's
stated AC scope, so it's a note rather than a blocker.

## Task-scoped finding 1 — date-only shapes lose their time component (real gap, untested)

Confirmed: `HYPHENATED_DATE_RE`/`COMPACT_DATE_RE` both parse to
`Date.UTC(y, mo-1, d)` — midnight, no time-of-day. Two consequences:

- **Same-day tie, non-deterministic.** Two date-only artifacts sharing a
  calendar day produce an identical `sortKey`. `Array.prototype.sort` is
  stable, so the tie resolves by the order of the input `files` array, which
  in `review-gate.mts:84` (`findReviewArtifacts`) comes straight from
  `fs.readdir()` — not alphabetized, not guaranteed by any documented
  contract. This isn't a *new* hazard introduced by this slice (the old
  mtime-tie case had the same property), but the fix doesn't close it either,
  and no test exercises it (`AC-2`'s "identical mtimes" test uses two
  *different* filename timestamps, so their sort keys still differ — it is
  not actually a tie case).
- **Cross-shape same-day inversion.** A date-only artifact written at, say,
  23:00 UTC sorts as midnight (00:00) and would rank *older* than an
  ISO-timestamped artifact from 01:00 UTC the same day, even though the
  date-only one was written 22 hours later. No test covers a mixed-shape,
  same-day pair — only same-shape comparisons are tested (ISO-vs-ISO,
  hyphenated-vs-hyphenated, compact-date-vs-compact-date).

This is real but low-risk in practice: the live corpus has only 9 hyphenated
+ 2 compact-date-only files out of 208 (per the builder's enumeration), all
apparently legacy naming from before the ISO-datetime convention was
adopted, so new writes colliding with them on the same calendar day is
unlikely. It's also arguably outside this slice's stated scope (AC-1..4 ask
for "sort by filename timestamp, mixed-corpus rule defined" — not "sub-day
precision for date-only shapes"). Recommend filing a follow-up defect rather
than blocking on it, and note it explicitly in the module's doc comment so a
future reader doesn't rediscover it as a mystery. Not requiring rework for
this slice.

## Task-scoped finding 2 — mixed-corpus rule: units genuinely match

Verified `parseFilenameTimestamp` returns `Date.UTC(...)` (real epoch ms) for
all three shapes, and the fallback is `s.mtimeMs` (also real epoch ms) — one
coherent numeric sort, not two different scales pretending to compare. The
claimed test (`AC-4`, second variant, `artifact-verdict-filename-sort.test.mts:149-172`)
does exactly what the builder describes: an untimestamped file with a fresh
mtime (`new Date()`) outranks a timestamped file whose parsed epoch (2020) is
older — confirmed by running it. The first `AC-4` variant
(`:126-147`) confirms the reverse: a timestamped file's 2026 epoch beats an
untimestamped file's stale 2020 fallback mtime. Both directions are covered;
"fallback, not categorical override" is accurate, not marketing.

## Task-scoped finding 3 — regex tightness: anchored correctly

All three regexes (`^(\d{4})(\d{2})(\d{2})T...Z-`, `^(\d{4})-(\d{2})-(\d{2})-`,
`^(\d{4})(\d{2})(\d{2})-`) are anchored with `^` and each match is followed
immediately by the delimiter, so `match()` only ever captures the leading
digit run. Manually traced `20260613-reviewer-a-slice125-feat175.md` against
`COMPACT_DATE_RE`: matches `20260613-` at position 0 and stops; `slice125`
and `feat175`'s digit runs are never reached because the regex isn't global
and the match already succeeded (and even if it were re-applied, `^` blocks
a match starting anywhere but position 0). No false-positive risk from
trailing digit runs.

## Task-scoped finding 4 — timezone: internally consistent, same root cause as finding 1

Hyphenated and compact date-only forms carry no explicit zone in the
filename and are parsed via `Date.UTC` — i.e. always treated as UTC
midnight, same convention as the `Z`-suffixed compact-ISO shape. There's no
inconsistency *between* the two date-only shapes (both normalize to UTC
midnight identically), so this isn't an independent reordering bug — it's
the same precision-loss root cause as finding 1 (no time-of-day in the
filename), not a second defect.

## Task-scoped finding 5 — pre-fix failure reproduced

Checked out the parent commit (`1b3eab6e`, pre-SLICE-201) into a scratch
worktree, copied in the new test file unmodified, and ran it standalone:

```
3 pass
4 fail
Ran 7 tests across 1 file.
```

Failures: `AC-2` (fresh-checkout tie), `AC-1` hyphenated, `AC-1` compact-date,
and one more (truncated in my capture but consistent with the 4-fail count).
Matches the builder's claim exactly — this is a real regression test, not a
tautology.

## Task-scoped finding 6 — forbidden areas untouched

`git show --stat 76fabfd5` touches exactly two files:
`src/scripts/lib/artifact-verdict.mts` and the new test file.
`review-gate.mts` (verdict-vocabulary branches, the `decision === null`
grandfather branch at the `readNewestArtifactVerdict` call site) is
untouched — confirmed by diff absence, not just by reading the current
state. The filename convention itself was not changed (no renames, no new
writer changes).

## Gates

- `bun test src/tests/ --parallel --timeout 60000` → **3283 pass, 7 skip, 0
  fail** (`capture-at-close-hook.test.mts` / `guard-feat-dispatch-hook.test.mts`
  did not fail here — known-flaky-under-load per the task brief, not
  triggered this run).
- `bun run typecheck` (`tsconfig.json` + `tsconfig.test.json`) → clean.
- `bunx biome lint src/` → pre-existing complexity warnings elsewhere in the
  repo (`ceremonies.mts`, `cli-args.mts`, etc., unrelated to this slice);
  `artifact-verdict.mts` and the new test file individually lint clean.
- `bunx biome format src/` → clean, no diffs.

## Recommendation

Approve. File a small follow-up (or fold into FEAT-283's remaining defect-3
slice if scope allows) for the date-only same-day precision gap in finding 1
— add a same-day mixed-shape test and either document the accepted
imprecision explicitly or extend the fallback to break same-day ties by
mtime instead of readdir order.
