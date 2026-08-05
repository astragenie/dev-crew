---
feature: FEAT-284
status: active
---
# Run Brief: FEAT284 SLICE194: Treat squash-body bullet lines as subject-equivalent match targets (AC-8)

- Created: 2026-08-05T05:09:20.928Z
- Tier: full
- Goal: Recover the genuine squash-merge evidence that AC-7 knowingly gave up.  SLICE-189 landed AC-7 (`git-anchored-completion.mts:313`): the FEAT-id / SLICE-ordinal token pair must appear in the commit **subject**, not merely once subject and body are concatenated. That was correct and measured — all three live false positives (`71604bb4`, `c2e77fe7`, `3bd6ab95`) carry the pair only in the body.  It also cost ~20% of previously-matching commits. A genuine squash-merge puts the original commit subjects
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/git-anchored-completion.mts` — at the AC-7
  subject check (:313)
  - also test body lines that are **bullet-shaped**
  (leading `-`
  - `*`
  - or `+` after optional whitespace) as subject-equivalent.
- A named
  - documented predicate for "bullet-shaped body line"
  - in the style of
  the existing `NON_IMPLEMENTING_PATH_PREFIXES` / `isNonImplementingPath` pair —
  a future reader must be able to see and revise the policy
  - not find it inline.
- Diff corroboration still applies to a bullet-line match exactly as it does to
  a subject match: promotion to `shipped` continues to run through
  `evaluateDiffCorroboration`. A bullet-line match is not a bypass.
- Tests: `859be561`-shaped squash body (recognized)
  - each of the three known
  false positives (still downgraded)
  - and
- Out Of Scope:
  - - **Do not widen `NON_IMPLEMENTING_PATH_PREFIXES`** — SLICE-189's header comment
  at :100-108 explains why `src/tests/` must stay off that list
  - and that
  reasoning still holds.
- Do not alter `planReconcileAction`
  - `SliceAlreadyShippedError`
  - or the
  fail-open contract.
- Frontmatter shape migration (SLICE-191)
  - `materializeProposedSlices` keying
  (SLICE-192)
  - CLI escape hatch (SLICE-193).
-
- Planned Files: -
- Next Step: Begin implementation

