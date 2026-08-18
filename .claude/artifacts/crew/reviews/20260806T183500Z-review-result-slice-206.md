---
slice: SLICE-206
feature: FEAT-297
commit: 5d1090d49a25c349c6b5d880996d744a951dfa6a
reviewer: independent-review-agent
decision: approved_with_notes
---

# Review — SLICE-206: fix AC extractor line-truncation and backfill SLICE-197/198/199

## Scope confirmed

Commit `5d1090d4` touches exactly five files: `slice-store.mts`, the new
`extract-acceptance-criteria.test.mts` cases, and the three backfilled slice
files (SLICE-197/198/199). Diffed each directly. `SLICE_196_*.md` has zero
diff in this commit — confirmed untouched, matching the claim that it was
already hand-corrected earlier.

## 1. Termination correctness — adversarial testing

I did not trust the added tests; I ran the actual `extractAcceptanceCriteria`
against hand-built adversarial fixtures not present in the test suite
(constructed body strings run through the real function in this worktree).
Results:

- **Blank line + non-indented prose, fenced code block, EOF-with-no-terminator**
  — all correct. The blank-line-then-non-indented-line boundary correctly
  stops accumulation before an unrelated paragraph or a fenced code block;
  a trailing wrapped AC with nothing after it to EOF is still captured in
  full.
- **Nested/indented sub-bullet inside an AC** — gets flattened into the
  parent bullet's prose (list structure lost, no text lost). Not a
  truncation bug, but worth knowing: `- AC-1: ... sub-list:\n  - detail one\n  - detail two`
  produces one run-on string, not a structured list. Acceptable given AC
  text is stored as a flat string anyway.
- **CRLF line endings — real defect, not covered by any test.** Reproduced
  directly: a wrapped checkbox bullet over CRLF source produces a literal
  embedded `\r` control character mid-sentence (e.g.
  `"...When\r the extractor runs..."`), and an unwrapped single-line
  checkbox bullet retains a trailing `\r`. Root cause: `body.split("\n")`
  leaves a `\r` on every line under CRLF input, and `classifyAcceptanceCriteriaLine`'s
  checkbox path (`line.replace(/^- \[x\]/i, "- [ ]")`) returns the raw line
  untrimmed — pre-existing weakness, but `accumulateContinuationLines`
  concatenates that untrimmed first line with `.trim()`-ed continuation
  lines, so under CRLF the `\r` now lands *inside* a reconstructed
  multi-line sentence instead of harmlessly at a truncation point. The
  GIVEN-prose path is accidentally immune (its capture regex excludes
  trailing whitespace before `$`). Practical exposure is narrower than it
  first looks: this repo's `.gitattributes` forces `eol=lf` for tracked
  markdown, and the real corpus I checked (`FEAT-230.md`, the three
  backfilled slices) is confirmed LF-only on disk — so the committed
  backfill in this same commit is unaffected. But extraction also runs
  against freshly-authored, not-yet-committed FEAT bodies (PM authoring,
  `assertAcceptanceCriteria` at scaffold time) where the git-boundary
  normalization hasn't applied yet, so this is live, not purely
  theoretical. Fix is small: `.trim()` (or strip trailing `\r`) the
  classified line before the first `results.push`, matching what
  continuation lines already get.
- **Continuation line legitimately starting with `-`** — confirmed this
  silently drops text past the collision point, same shape as the bug this
  slice fixes, just triggered differently: `"- AC-1: Given a wait of\n- 5 minutes, THEN the timeout fires."`
  extracts to only `"Given a wait of"` — the second line doesn't reclassify
  as its own AC (fails the delimiter check) and isn't accumulated either
  (bullet-boundary check fires first), so it vanishes with no trace. This
  is a documented tradeoff, not a hidden one — the docstring explicitly
  says continuation stops at "the next bullet ... a line starting `- `,
  classified or not." No test exercises it in either direction (pass or
  fail), and no FEAT-230 AC text actually hits this pattern, so it doesn't
  affect the backfill in this commit. Worth a follow-up test to pin the
  known limitation, or reconsidering the boundary rule (e.g. only treat a
  line as a bullet-boundary if it reclassifies).

Neither gap regresses below the pre-fix baseline (which dropped *all*
continuation on *every* wrap, unconditionally) — both are edge cases on top
of a fix that is correct for the common, and by far most frequent, wrapped-AC
shape.

## 2. Presence gate

Confirmed via the AC-3 regression test and independently by reading
`assertAcceptanceCriteria` (`slice-store.mts:207`): it delegates entirely to
`extractAcceptanceCriteriaDetailed`, so the fix's effect flows straight
through — a FEAT whose ACs all wrap now extracts full-length criteria,
correctly passing presence with real content instead of passing with
fragments. Ran the full test file directly (not the whole suite, per the
"don't re-run to establish pass/fail" instruction, but this file is
load-bearing for my own findings): 30/30 pass, including every pre-existing
test unchanged — no previously-accepted FEAT shape was newly rejected.

## 3. Backfill fidelity

Compared each of AC-1 through AC-8 in all three backfilled slices against
`FEAT-230.md`'s source text word-for-word (accounting for the wrap-join to
single spaces): exact match in all three files, including punctuation and
backtick-quoted identifiers, with only the one deliberate substitution (see
below). Per-slice scoping note in each file is self-consistent and matches
each slice's own title/scope:

- SLICE-197 (CLI `--slice`/`--tags` + fallback) claims AC-3/AC-4 + shared
  AC-6/AC-8 as its core — AC-3 (preset skill list not read as source) and
  AC-4 (dispatch-payload compatibility) both plausibly land in the CLI/wiring
  layer.
- SLICE-198 (cross-plugin docs + upstream-request amendment) claims AC-4 +
  shared AC-6/AC-8 — AC-4 is the cross-plugin-compatibility criterion, fits.
- SLICE-199 (CI fixture-snapshot gate + DEC-071) claims AC-5/AC-7 + shared
  AC-6/AC-8 — AC-5 (CI validation gate) and AC-7 (DEC write-up) both match
  the slice's own title directly.

No criterion is assigned to the wrong sibling. `SLICE_196_*.md` diff against
HEAD~1 is empty — confirmed untouched, as claimed.

## 4. `react-engineering` → `vue-engineering` substitution

Verified against `FEAT-230.md`'s own "Corrected drift measurement"
section (lines 197-225): `react-engineering` is confirmed live (nested at
`ui/react-engineering`), `vue-engineering` is confirmed genuinely dead — the
substitution is factually correct, and is exactly the flat-lookup bug
FEAT-230 exists to fix, reproduced in FEAT-230's own AC-1 text. Grepped the
full commit diff for both strings: the substitution landed in AC-1 of all
three backfilled slices and nowhere else claims `react-engineering` as a
dead-ID example — the only remaining `react-engineering` occurrences in the
diff are in the explanatory backfill-note prose correctly describing the
correction's history, not restating the wrong example as fact.

## Gates

Not re-run for pass/fail per instruction (already independently confirmed:
3299/0/325). I ran only `src/tests/extract-acceptance-criteria.test.mts` in
isolation to verify my own adversarial-input findings against the shipped
behavior: 30 pass, 0 fail.

## Decision rationale

The core fix is correct and well-targeted for the shape of bug it names —
ordinary multi-line markdown wrap — and the backfill is verified faithful,
correctly scoped, and the one deliberate content change is well-reasoned and
consistently applied. `approved_with_notes` rather than a clean `approved`
because adversarial testing (not just the shipped tests) surfaced a real,
reproducible CRLF-embedding defect in `accumulateContinuationLines` /
`classifyAcceptanceCriteriaLine`'s checkbox path (untrimmed first line
concatenated with trimmed continuation lines can bake a literal `\r` into
extracted AC text) and an untested, documented-but-unverified edge case
where a continuation line starting with `-` silently drops content past that
point — same failure family as the bug this slice fixes. Neither affects the
concrete deliverable in this commit (the LF-normalized backfill), so nothing
here should block merge, but both should get a follow-up fix/test before the
extractor is trusted on FEAT bodies that don't go through this repo's
git-boundary LF normalization.
