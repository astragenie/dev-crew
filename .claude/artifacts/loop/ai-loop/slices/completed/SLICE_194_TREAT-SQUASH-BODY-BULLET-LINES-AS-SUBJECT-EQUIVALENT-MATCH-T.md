---
id: SLICE-194
title: Treat squash-body bullet lines as subject-equivalent match targets (AC-8)
status: completed
feature: FEAT-284
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-05
effort_points: 2
estimated_tokens: 60000
github_issue: 611
github_url: "https://github.com/astragenie/runner-plugin/issues/611"
completed_at: 2026-08-05
---
# SLICE-194: Treat squash-body bullet lines as subject-equivalent match targets (AC-8)

Implements FEAT-284. See [feature file](../../../backlog/in-progress/FEAT-284.md) for product context.

## Objective

Recover the genuine squash-merge evidence that AC-7 knowingly gave up.

SLICE-189 landed AC-7 (`git-anchored-completion.mts:313`): the FEAT-id /
SLICE-ordinal token pair must appear in the commit **subject**, not merely once
subject and body are concatenated. That was correct and measured — all three
live false positives (`71604bb4`, `c2e77fe7`, `3bd6ab95`) carry the pair only in
the body.

It also cost ~20% of previously-matching commits. A genuine squash-merge puts
the original commit subjects into the merge commit's **body**, as bullet lines.
`859be561` is a real, currently-missed example. Those bullet lines *are*
subjects — they just moved.

This slice treats each squash-body bullet line as a subject-equivalent match
target, so a genuine multi-slice squash merge is recognized again while prose
mentions elsewhere in the body stay non-qualifying.

**Measured before scoping — do not re-derive, and do not "improve" on it:** the
bullet-line rule reinstates 0 of the 3 known false positives and recovers 2 of
the 4 genuine matches. A plausible-sounding alternative ("FEAT-id OR
SLICE-token appears in subject") reinstates **all three** false positives. That
alternative is a trap; it is recorded here so it is not rediscovered and
adopted.

## In scope

- `src/scripts/lib/slice-linker/git-anchored-completion.mts` — at the AC-7
  subject check (:313), also test body lines that are **bullet-shaped**
  (leading `-`, `*`, or `+` after optional whitespace) as subject-equivalent.
- A named, documented predicate for "bullet-shaped body line", in the style of
  the existing `NON_IMPLEMENTING_PATH_PREFIXES` / `isNonImplementingPath` pair —
  a future reader must be able to see and revise the policy, not find it inline.
- Diff corroboration still applies to a bullet-line match exactly as it does to
  a subject match: promotion to `shipped` continues to run through
  `evaluateDiffCorroboration`. A bullet-line match is not a bypass.
- Tests: `859be561`-shaped squash body (recognized), each of the three known
  false positives (still downgraded), and a prose body mention that merely
  happens to sit on a line starting with a dash inside a paragraph.

## Out of scope

- **Do not widen `NON_IMPLEMENTING_PATH_PREFIXES`** — SLICE-189's header comment
  at :100-108 explains why `src/tests/` must stay off that list, and that
  reasoning still holds.
- Do not alter `planReconcileAction`, `SliceAlreadyShippedError`, or the
  fail-open contract.
- Frontmatter shape migration (SLICE-191), `materializeProposedSlices` keying
  (SLICE-192), CLI escape hatch (SLICE-193).
- Do not relax AC-7's subject rule itself; this slice ADDS a match target, it
  does not weaken the existing one.

## Acceptance criteria

Scoped from FEAT-284's set to AC-8 only. AC-1/2/6/7 already shipped in
SLICE-188/189; AC-3 shipped in SLICE-190; AC-4/5 belong to SLICE-192/193.

- [ ] AC-8: Given a squash-merge commit whose body contains bullet lines composed from the original commit subjects, When reconcileProposedSlicesAgainstGit evaluates it, Then each bullet line is treated as a subject-equivalent match target, so a genuine multi-slice squash merge is recognized as evidence. Prose mentions elsewhere in the body remain non-qualifying.
- [ ] AC-8a: Given the three known live false positives (`71604bb4`, `c2e77fe7`, `3bd6ab95`), When the bullet-line rule is active, Then all three are still downgraded to text-only matches — asserted explicitly, since reinstating any of them is the specific failure mode of the rejected alternative.
- [ ] AC-8b: Given the real squash-merge commit `859be561`, When reconcile runs against live repo history (not a fixture alone), Then it is recognized as shipped evidence.
- [ ] AC-8c: Given a bullet-line match, When it is evaluated for promotion, Then it still passes through `evaluateDiffCorroboration` exactly as a subject match does — a bullet-line match is not a corroboration bypass.
- [ ] AC-8d: Full suite green; typecheck + lint + format clean.

## Done When

- AC-8, AC-8a through AC-8d PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-284 stays in `in-progress/`** — SLICE-191/192/193 are still open. Only
  the final sibling slice moves the feature to `done/`.
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: `crew:reviewer` — verify the bullet-line predicate cannot match
  prose, that AC-7's subject rule is unweakened, and that the rejected
  "FEAT-id OR SLICE-token in subject" alternative was not silently adopted.
