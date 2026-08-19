---
decision: approved
reviewer: crew:reviewer
slice: SLICE-31
reviewed_commits: [b1799c11, 33856092]
---

# Review — SLICE-31 (FEAT-011): preserve inter-span content in migrate-adopter marker collapse

## Summary

Commit `b1799c11` fixes a real data-loss bug: `replaceMarkerBlocks` used to
collapse everything between the first marker span's start and the last
span's end into one block, silently deleting any hand-authored content
sandwiched between two non-adjacent spans. Caught pre-apply on `kb`'s
dry-run (would have deleted its ~130-line document body). The fix cuts each
span out independently and reassembles all surviving segments around the
single rendered block. I independently reproduced the stash round-trip,
adversarially probed edge cases beyond the builder's own two tests (found
one real but low-severity, non-blocking defect), zero-diff-verified the
SLICE-26 estate, and read both `kb` and `standards`' full end-state
CLAUDE.md files line by line rather than spot-grepping. **Decision:
approved**, with one LOW finding recorded for a cheap follow-up fix.

## 1. Adversarial edge-case hunt (beyond the builder's 2 tests)

Wrote a standalone probe script exercising the new `replaceMarkerBlocks`
directly against 7 shapes: span at file start, span at EOF, two adjacent
spans (no gap), an unrecognized `engineering-os:` span sandwiched between
two legacy spans, an unclosed start with no matching end, an unclosed start
absorbing a subsequent valid pair, and an idempotence check on the
file-start case.

- **Span at EOF**: clean — `"Before text.\n\n" + devcrewBlock + "\n"`, no
  trailing artifacts.
- **Two adjacent spans (no gap)**: idempotent, `once === twice` — confirmed
  programmatically (`===` on the two output strings), matching the SLICE-26
  estate's shape exactly.
- **Unrecognized `engineering-os:` span between two legacy spans**:
  **preserved intact, not swallowed** — the output keeps the full
  `<!-- engineering-os:start -->...<!-- engineering-os:end -->` span
  verbatim between the new devcrew block and the tail. This is the case
  I was most worried about given `citylive`/`devops` carry exactly this
  marker, and it holds.
- **Unclosed start (no matching end)**: the orphan content gets absorbed
  into the span (extends to EOF) and is discarded — but this is
  `findMarkerSpans`' pre-existing "tolerant of an orphan trailing start"
  behavior, **unchanged by this fix** (SLICE-31 only touched
  `replaceMarkerBlocks`, which just cuts whatever spans it's handed). Not a
  new regression; noting it for completeness since it was explicitly asked
  about.
- **Unclosed start followed by a separate valid pair**: same story — the
  orphan start absorbs the subsequent pair's own start token too (existing
  `findMarkerSpans` pairing logic, sequential-nearest-end matching), so
  everything from the orphan start through the absorbed pair's end is cut
  as one span. Pre-existing behavior, not introduced here.

### [LOW, non-blocking] Span at file start produces two leading blank lines

When a marker span begins at content position 0 (no preceding text at all),
`before = segments[0]!.trimEnd()` is `""`, and `parts.join("\n\n")` puts an
empty string first — so the output starts with `"\n\n" + devcrewBlock...`
instead of just `devcrewBlock...`. Confirmed via direct probe: input
`` `${CREW_BLOCK}\n\nAfter text.\n}` `` (marker at position 0) produces
`"\n\n<!-- devcrew:start -->\n...` — two leading blank lines before the
block. **It is idempotent** (verified `once === twice === thrice` via
direct `===` comparison across 3 repeated calls — the bug doesn't compound
or grow), so it's a one-time cosmetic blemish, not an AC-2-class unbounded
regression. **Not reachable in any real adopter observed**: every
CLAUDE.md in the SLICE-26 estate and both `kb`/`standards` opens with a
`#`-heading before any marker block, so `before` is never empty in
practice. Cheap fix if the team wants it: filter empty segments out of
`before` the same way `rest` already does, rather than special-casing it —
e.g. build `parts` by filtering ALL segments (before + rest) for
non-emptiness before joining. Recommend a follow-up chore, not a blocker
for this slice.

## 2. Stash round-trip — independently reproduced

Reverted `migrate-adopter-markers.mts` to its pre-SLICE-31 state
(`git show 3c61b183:<path>`, the immediately-prior commit) and ran the full
test file: **25 pass, 2 fail** — the 2 failures are exactly the 2 new
SLICE-31 tests (`two far-apart spans...` and `three interleaved spans...`).
Restored the file (`git diff --stat` on it came back empty — clean,
byte-identical to HEAD) and reran: **27 pass, 0 fail**. Genuine regression
tests, not asserted-but-unverified.

## 3. Zero-diff proof on the SLICE-26 estate

Ran `--dry-run` myself against `authentic`, `dating`, `memory`, and
`citylive` (the `engineering-os:` carrier, not in the builder's own
re-verification list but the one I most wanted to check given finding #1
above): all four report `CLAUDE.md: no change` /
`config: {"action":"already-migrated"}`. The SLICE-26 estate is
unaffected, including the one adopter with a fourth marker namespace
in play.

## 4. kb + standards end state — read in full, not spot-grepped

- **`kb`**: read the entire 149-line `CLAUDE.md`. Exactly one
  `<!-- devcrew:start -->` (line 5) / `<!-- devcrew:end -->` (line 23) pair,
  zero leftover `crew:`/`runner:`/`loop:` markers. The full hand-authored
  body survives immediately after, byte-for-byte: `## Mission` (line 27),
  `## Core Mental Model` (line 51), `## Important Principle` (line 73),
  `## Navigation` (line 89, all 26 `@`-reference lines intact), `## Update
  triggers` (line 138) — all present, nothing truncated or reworded.
  `.claude/devcrew.json` has `"schemaVersion": 2`. `--dry-run` reruns clean
  (`CLAUDE.md: no change`). `git status --short` clean.
- **`standards`**: read the entire 84-line `CLAUDE.md`. Same shape — one
  devcrew block (lines 5-23), zero legacy markers, hand-authored body
  intact below it: `## Mission` (line 25), `## Repository Structure` (line
  31, code fence intact), `## Standards Philosophy` (line 44), `## Product
  Repo Expectations` (line 50), `## Safety Rules` (line 54), `## Convention:
  forbidden-patterns` (line 58), `## Commit Style` (line 73). `schemaVersion:
  2` confirmed. `--dry-run` reruns clean. Confirmed the repo is genuinely on
  its pre-existing `feat/adr-012-multi-tenant-schema` checkout (`git branch
  --show-current`), not switched by this slice, and the migration commit
  (`5fd6e553`) sits on top of it cleanly — matches the stated "pre-existing
  checkout, noted not moved" scope note.

## 5. Targeted suites

- `bun test src/tests/migrate-adopter.test.mts`: **27 pass, 0 fail**.
- `bunx tsc --project tsconfig.json --noEmit`: clean, exit 0.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean, exit 0.

## Ledger addendum accuracy

Read the full SLICE-31 addendum appended to
`migration-ledger-SLICE-26.md`. Every specific, checkable claim in it
matches what I independently verified: the preset choice rationale, the
defect narrative (including the detail that work stopped short of
`--apply` on the first pass and both repos were confirmed reverted to
pristine before the fix), the stash-round-trip assertion messages, the
zero-diff re-verification against the 3 named adopters, the commit SHAs,
and the "hand-authored body content spot-checked present" claims for both
repos (I read the full files rather than spot-checking the same handful of
strings the ledger names, and found nothing missing beyond what it lists).

## Decision rationale

`approved`. This is a real, correctly-diagnosed, correctly-fixed data-loss
bug, caught before it could delete real content (the dry-run-first
discipline did its job). The fix is minimal and the new tests genuinely
distinguish old from new behavior, confirmed by my own stash round-trip.
Adversarial probing beyond the builder's coverage found one real but
low-severity, idempotent, cosmetic-only edge case (leading blank lines
when a span opens at file position 0) that isn't reachable in any real
adopter observed — worth a cheap follow-up, not worth blocking this slice
on. Both `kb` and `standards` are verified end-to-end: single devcrew
block, zero legacy markers, hand-authored bodies fully intact (read in
full, not sampled), config migrated, idempotent reruns, and `standards`'
pre-existing branch correctly left untouched.
