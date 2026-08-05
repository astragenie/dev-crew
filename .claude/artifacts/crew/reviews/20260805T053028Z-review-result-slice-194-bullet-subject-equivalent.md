---
slice: SLICE-194
feature: FEAT-284
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-05
---

## Summary

SLICE-194 (commit `4163f59d`) adds AC-8: a commit body line shaped like a
markdown bullet (`-`/`*`/`+`) that opens a list block is now treated as a
subject-equivalent match target alongside the commit subject, so a genuine
GitHub squash-merge (which folds each original commit subject into the merge
commit's body as one bullet per commit) is no longer defeated by AC-7's
subject-only rule. The bullet/block-context predicate is sound, well tested
against reconstructed real commit bodies, doesn't loosen the paired-token
requirement anywhere, and diff corroboration still runs unconditionally after
it. Full suite, typecheck, lint, and format are all clean.

One real, load-bearing gap, independently reproduced, not just accepted from
the builder's report: **AC-8b's own headline claim — that `859be561` is
recognized against live history — does not hold at current HEAD.** It only
recognizes it when `loop.mainRef` is pinned to the historical `f0ec093d`. At
live `main`, both ordinals still demote, matched instead against `3860269f`
(the SLICE-189 close commit, whose prose narrates the FEAT-267/SLICE-1/2
example this very AC is built around). Root cause is a pre-existing bug in
`commits.find()` — first-match over a newest-first `git log` list — that
SLICE-194 did not introduce and did not fix. Direction is still safe
(fail-open toward re-checking already-shipped work, not toward silently
dropping unshipped work), so this doesn't reinstate the FEAT-284 incident
class, but it does mean AC-8b should be recorded as **unmet at live HEAD**,
not closed as satisfied.

## 1. Rejected alternative did not creep in

Read the full diff and the `hasSubjectEquivalentMatch` implementation
(`git-anchored-completion.mts:181-189`). The pair requirement is unchanged:
`pattern.test(hit.subject) || bulletShapedBodyLines(hit.body).some((line) =>
pattern.test(line))` — every candidate text (subject, or one qualifying
bullet line) is still tested against the *same* paired `FEAT-id ... SLICE-n`
regex that requires both tokens within 80 non-newline characters on one
physical line. Nothing widens this to "either token independently in the
subject." Confirmed via the `AC-8a` test (below) that all three original false
positives still demote.

## 2. The three known false positives — reconstructed against the real bodies

Pulled `git show -s <sha>` for all three directly (not from the test file)
and diffed against the fixtures in `git-anchored-completion.test.mts`:

- **`71604bb4`**: real subject is `docs(research): architect classification
  for FEAT-281/282/283 + SubagentStop contract spike`. Real body has a
  non-bulleted prose sentence — `"...before committing FEAT-259's SLICE-1 to
  a design..."` — followed *later* by a genuine bulleted list (`Three
  findings that change SLICE-1's shape:` + three `  - ` items), none of which
  mention `FEAT-259`. This is exactly the interesting case the task called
  out: a real bullet list present in the same body, but not the one carrying
  the token pair. The test fixture (lines 406-420) reproduces this shape
  faithfully — trimmed prose, same non-bulleted trap sentence, same
  bulleted-but-non-matching list — and is not a paraphrase that drops the
  trap.
- **`c2e77fe7`**: subject matches the fixture verbatim; body's first
  sentence (`"It skipped -SLICE-1 (the SubagentStop report-gate hook..."`) is
  reproduced near-verbatim, no bullets in either the real commit or the
  fixture.
- **`3bd6ab95`**: subject and body both reproduced verbatim in the fixture.

Ran the `AC-8a` test directly (`bun test src/tests/git-anchored-completion.test.mts`)
— all three still produce `shipped: []` / `textOnlyMatches[0].reason ===
"token-pair-in-body-only"`. Confirmed, not just read.

## 3. Bullet vs. prose discrimination — probed beyond the shipped tests

Wrote standalone probes (via `reconcileProposedSlicesAgainstGit` against
throwaway repos, not the test file) for the four shapes requested:

| input shape | result |
|---|---|
| numbered list (`1. ... FEAT-900 SLICE-1`) | correctly does **not** qualify — `BULLET_LINE_PATTERN` only matches `-`/`*`/`+`, numbered lists are out of scope by design (GitHub's squash format never produces them) |
| indented sub-bullet (`* top\n  - nested (FEAT-900 SLICE-1)`) | qualifies as shipped — a nested bullet is still a legitimate continuation of a bullet run, working as designed |
| bullet-shaped line immediately following a genuine bullet, with no blank line (`* item one\n* item two\n- trailing dash line mentioning the tokens`) | **qualifies as shipped** — this is the one real residual gap. `bulletShapedBodyLines` cannot distinguish "a new list item" from "a hard-wrapped continuation of the previous bullet's text that happens to start with `-`" once the immediately preceding line is itself a bullet; the code's own doc comment only reasons about the case where the preceding line is *prose*. In practice this is low-risk: GitHub's squash format emits one bullet per original commit subject on a single line, it does not hard-wrap a bullet's text onto a following line, so this shape shouldn't occur in the commit convention AC-8 targets — but it's an unstated edge in the documented rationale and worth a one-line callout in the comment. Not a live false positive in this repo's history. |
| code fence containing a bullet-shaped line (` ```\n- FEAT-900 SLICE-1\n``` `) | correctly does **not** qualify — the fence-open line ("```") is itself non-blank/non-bullet, so it breaks the block-boundary chain before the fenced line is reached. Confirmed this holds structurally (any real fence-open line breaks the chain), not just for this one input. |
| genuine bullet at body start / bullet after a blank line | both qualify, as intended (the two documented boundary cases). |

## 4. Corroboration is not bypassed

`reconcileProposedSlicesAgainstGit` (git-anchored-completion.mts:401-412)
still calls `fetchChangedFiles` + `evaluateDiffCorroboration` unconditionally
after `hasSubjectEquivalentMatch` returns true — a bullet-line match is not a
shortcut to `shipped`. Ran the `AC-8c` test (`--allow-empty` commit whose body
has a qualifying bullet line) directly: result is `textOnlyMatches[0].reason
=== "no-diff-evidence"`, confirming the bullet path is demoted exactly like
the pre-existing AC-1 no-diff case, not promoted around it.

## 5. Complexity

`bunx biome lint` on both changed files is clean, no `biome-ignore` /
complexity-suppression comment anywhere in the diff (grepped). The extraction
of `hasSubjectEquivalentMatch` genuinely resolves the complexity budget
without a suppression escape hatch.

## 6. HEAD-vs-pinned-ref finding — reproduced independently, this is the material finding

Wrote a standalone script calling `reconcileProposedSlicesAgainstGit`
directly (not via the test file) against **this actual repo**, `FEAT-267`,
proposed slices `[-SLICE-1, -SLICE-2]`:

```
=== mainRef=f0ec093d ===
shipped: [ordinal 1 @ 859be56, ordinal 2 @ 859be56]
textOnlyMatches: []

=== mainRef=main (live HEAD) ===
shipped: []
textOnlyMatches: [
  ordinal 1 @ 3860269 reason=token-pair-in-body-only,
  ordinal 2 @ 3860269 reason=token-pair-in-body-only
]
```

This matches the builder's report exactly. Traced the mechanism: `git log
<ref>` lists commits newest-first; `commits.find((c) => pattern.test(...))`
(git-anchored-completion.mts:376) returns the *first* (i.e. newest) commit in
that list whose subject+body concatenation contains the token pair anywhere
— it does not search for a commit that also passes the bullet/subject gate.
`3860269f` ("chore(SLICE-189): close diff-corroboration slice; add AC-8 +
SLICE-194") is newer than `859be561` and its retrospective prose contains a
hard-wrapped line — `"genuinely shipped both SLICE-1 and SLICE-2 of
FEAT-267, matched correctly"` — that satisfies the pair regex but is not
bullet-shaped (it's plain prose, not preceded by a blank line or a bullet
run). Because `commits.find` stops at this first hit, it never reaches
`859be561` at all for either ordinal, so `859be561`'s genuine bullet lines
are never evaluated — not "correctly evaluated and rejected," simply never
looked at.

**Assessment: AC-8b is not met at live HEAD.** The AC's own text asks that
`859be561` be recognized against live history; it currently is recognized
only when the ref is artificially pinned to a point in history that predates
the shadowing commit. Since `resolveMainRef`'s real default (no
`loop.mainRef` override) resolves to live `main`, this is the actual runtime
path for this repo today, not a contrived corner case — and the shadowing
commit that defeats it (`3860269f`) was created by this very slice's own
close ceremony, so the regression is not hypothetical, it already exists in
this repo's history right now.

This is not a defect introduced by SLICE-194's diff — the `commits.find`
first-match-wins logic predates this slice (present since the original AC-7
work) — and the failure direction is still the safe one (a false "not
shipped" causes wasted re-verification/re-dispatch of already-shipped work,
never a silent drop of unshipped work, so it does not reopen the FEAT-284
incident class). But it does mean the AC-8b acceptance evidence, as reported,
overstates what the live system actually does, and the underlying ordering
bug will keep recurring by construction: any future commit that narrates a
past FEAT/SLICE pair in retrospective prose (which this repo's own
slice-close convention does routinely) permanently shadows genuine bullet
evidence for that pair from then on, for every ordinal it happens to mention.
It also isn't unique to AC-8 — the same `commits.find` bug can shadow a
genuine AC-7 subject match with a later, non-qualifying body-only mention of
the same FEAT/SLICE pair.

**Recommend**: file a follow-up FEAT/defect against
`reconcileProposedSlicesAgainstGit`'s commit-selection logic — it should
search the full candidate list for a commit that satisfies
`hasSubjectEquivalentMatch` before falling back to demoting the
first-by-recency textual mention, rather than stopping at the first token-pair
hit regardless of qualification. Do not record AC-8b as unconditionally
satisfied in FEAT-284's closeout notes; note it as "recognized only when
scanning history up to the point before the shadowing commit; live-HEAD
recognition remains open."

## Verification performed independently

- `bun test src/tests/git-anchored-completion.test.mts --timeout 60000` — 27
  pass / 0 fail.
- `bun test src/tests/ --parallel --timeout 60000` — full suite, 3286
  pass / 7 skip / 0 fail (pre-existing known-flaky files not implicated).
- `bun run typecheck` (`tsconfig.json` + `tsconfig.test.json`) — clean.
- `bunx biome lint` on both changed files — clean, no suppression comments.
- `bunx biome format` on both changed files — clean, no diff.
- `git show -s` on all four cited commits (`71604bb4`, `c2e77fe7`,
  `3bd6ab95`, `859be561`) — compared real bodies against test fixtures.
- Standalone script calling `reconcileProposedSlicesAgainstGit` directly
  against this repo at both `mainRef: f0ec093d` and `mainRef: main` —
  reproduced the builder's reported HEAD-vs-pinned-ref divergence exactly.
- Standalone probes of four additional bullet/prose shapes (numbered list,
  nested sub-bullet, bullet-following-bullet wrap, code-fenced bullet) not
  covered by the shipped test file.

## Decision

**approved_with_notes.** The bullet/block-context predicate itself is
correctly implemented, narrowly scoped, well tested against real
reconstructed commit bodies, doesn't bypass diff corroboration, and meets
the complexity budget without suppression. Ship as-is. But the AC-8b
acceptance evidence does not hold at live HEAD — reproduced independently,
not just accepted from the builder's dispatch note — because of a pre-existing
`commits.find()` first-match-over-newest-commit bug that this slice did not
introduce or fix. File a fast-follow for that ordering bug before treating
AC-8b as closed, and correct FEAT-284's closeout notes to record AC-8b as
"met only up to the point before commit `3860269f`; live-HEAD recognition
remains open" rather than fully satisfied.
