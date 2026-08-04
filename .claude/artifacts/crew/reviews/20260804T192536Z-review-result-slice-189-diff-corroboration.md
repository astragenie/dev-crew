---
slice: SLICE-189
feature: FEAT-284
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

## Summary

SLICE-189 adds diff-level corroboration (AC-1/AC-2/AC-6) plus a subject-only
discriminator (AC-7) to `reconcileProposedSlicesAgainstGit`. The core defect —
FEAT-259's `-SLICE-1` being silently marked shipped from prose-only mentions —
is genuinely fixed, verified independently, not just against the fixtures.
One real, previously-untested gap surfaces: AC-7 also demotes genuine shipped
evidence from GitHub squash-merged multi-slice PRs, a shape this repo uses
constantly. That gap is worth a note and a fast-follow, not a block — it's
the same fail-open/false-negative direction the FEAT explicitly prefers over
silent data loss, and it doesn't regress anything AC-7 didn't itself introduce.

## 1. Does it close the defect, or only the fixtures?

Verified independently, not by re-reading the builder's fixtures. I called
`reconcileProposedSlicesAgainstGit` live against this repo's own
`FEAT-259.md` proposed_slices:

```
shipped: []
textOnlyMatches: [{ ordinal: 1, idSuffix: "-SLICE-1", commitSha: "3bd6ab95...",
  reason: "token-pair-in-body-only" }]
```

Matches the builder's claim exactly. `3bd6ab95` (SLICE-188's own fixture
commit) is correctly demoted instead of silently marked shipped. This is a
real fix against live repo state, not a fixture-shaped tautology — the
fixtures in the test file were authored to mirror the live repro, but the
verification above never touches the test file at all.

## 2. False negatives — AC-7 and squash-merges (real gap, needs a note)

Confirmed concretely, using this repo's own history, that AC-7 introduces a
false negative for a commit shape this repo uses routinely: a GitHub
squash-merged multi-slice PR whose squash **subject** is the PR title (no
SLICE token) while the **body** is the concatenation of the original
per-slice commit subjects (which do carry the token pair).

Live example: PR #549 / commit `859be561` ("FEAT-267: wave
worktree-placement fix + crash-recovery CLI (#549)") genuinely shipped both
`-SLICE-1` and `-SLICE-2` — confirmed via `gh pr view 549`, whose body shows
"## SLICE-1 — child worktree placement" and "## SLICE-2 — `dispatch recover`
CLI". I ran `reconcileProposedSlicesAgainstGit(repo, "FEAT-267", [SLICE-1,
SLICE-2])` directly against this repo and got:

```
shipped: []
textOnlyMatches: [
  { ordinal: 1, reason: "token-pair-in-body-only", commitSha: "859be561..." },
  { ordinal: 2, reason: "token-pair-in-body-only", commitSha: "859be561..." }
]
```

Before this slice (parent commit `0511f557`), this same commit would have
matched on subject+body concatenated, passed diff corroboration (it touches
real `src/` files, not docs-only), and correctly registered as shipped. AC-7
is what turns this specific real, common shape into a false negative — it is
not defense-in-depth on top of an already-broken case, it is a net-new miss
for a case that used to work.

**Direction and severity**: this is the safe direction the FEAT explicitly
designs for (`docs/memory`'s own "Note on AC-6's false-negative direction"
section: bias toward re-doing work over silently dropping it). Concretely,
`shipped=[]` here just means `reconcileProposedSlicesStartIndex` returns
`undefined` and the caller falls back to `existingSlices.length` — the exact
pre-SLICE-189 behavior for a FEAT whose `slices` frontmatter is already
accurate. So it does **not** cause any data loss or reordering; it just
silently gives up the auto-advance win for the squash-merge shape, which was
arguably the primary practical payoff of this whole module. It "bites" as a
missed convenience, not a correctness regression — but it is real, it is
common (most multi-slice FEATs in this repo ship via squash-merged PR, per
git log), and it is untested and undocumented in this diff. Recommend a
fast-follow: treat each `* <subject>` bullet line in a squashed body as an
independent subject-equivalent match target, since that's exactly the shape
GitHub's squash-merge produces from the original per-commit subjects.

## 3. Fail-open contract

`fetchChangedFiles` (git-anchored-completion.mts:189-201) uses the existing
`gitText` helper (same one `fetchCandidateCommits` already used), passes
`timeoutMs: GIT_TIMEOUT_MS`, and returns `null` on any failure — never
throws. `evaluateDiffCorroboration` treats `null` identically to `[]` (line
223: `no-diff-evidence`). The outer `reconcileProposedSlicesAgainstGit` is
still wrapped in the pre-existing try/catch that converts any thrown error to
`gitError` + empty arrays. I forced a real git-level failure (deleted the
matched commit's tree object) and confirmed via `bun test` (test at
`git-anchored-completion.test.mts:411-443`, which I ran, not just read) that
the result is `gitError: null` (fail-open swallowed internally) with the slice
correctly demoted to `textOnlyMatches` with reason `no-diff-evidence`, never a
crash. Contract holds.

## 4. Additive-ness of `textOnlyMatches`

Grepped the whole `src/` tree for `reconcileProposedSlicesAgainstGit`,
`GitAnchorReconcileResult`, and `textOnlyMatches`: the only non-test consumer
is `src/scripts/lib/slice-linker/feature-lifecycle.mts`
(`reconcileProposedSlicesStartIndex`, lines 154-200), which reads only
`reconcile.gitError` and `reconcile.shipped` — confirmed by reading the full
function body. No other file references this module. The claim is correct;
adding `textOnlyMatches` to the result shape cannot break any existing
runtime caller.

## 5. Scope

`git show --stat fcdc30bb` confirms exactly two files changed:
`git-anchored-completion.mts` and its test file. `feature-lifecycle.mts` is
untouched — no `proposed_slices_shipped` frontmatter shape change (SLICE-191
territory), no `planReconcileAction` edits (SLICE-192 territory), and no new
`console.*` calls in the diff (SLICE-190 territory: `textOnlyMatches` is
correctly left as data for a future caller to print, not printed here).
Scope is clean.

## 6. Builder's flagged notes

**(a) `DiffCorroboration` as a plain `{ok, reason}` instead of a discriminated
union.** Verified independently, not taken on faith: I wrote a standalone
`{ ok: true } | { ok: false; reason: Reason }` test file and compiled it under
this repo's actual `tsconfig.test.json`. Accessing `.reason` in the `else`
branch after `if (r.ok)` fails with `TS2339: Property 'reason' does not exist
on type 'Result'` — confirming narrowing genuinely does not hold under this
project's `strict:false` config. The builder's justification is accurate, not
a rationalization for skipping a cleaner type. The `!` assertion on
`corroboration.reason!` is safe in practice because `evaluateDiffCorroboration`
always returns `reason` together with `ok:false` in every branch (verified by
reading all three return sites in the function) — the invariant is just
enforced by convention instead of the type system, which is a fair tradeoff
given the compiler can't help here.

**(b) The `tmpGitRepo` `.claude/loop.json`-before-`git init` fix.** Real fix,
not a mask. Before this change, `tmpRepo()` writes `.claude/loop.json` to disk
but never stages/commits it; the old `tmpGitRepo` then ran fixture commits
with no prior commit of that file, so the first `files`-bearing fixture
commit's `git add -A` (in `commitFixture`) would sweep in the untracked
`.claude/loop.json` as an extra changed path. Under the new AC-6 rule that
matters concretely: `.claude/loop.json` is not under `.claude/artifacts/` or
`docs/`, so its presence would flip `allNonImplementing` to `false` and
falsely corroborate a docs-only fixture as shipped — inverting exactly the
AC-6 test's expected outcome. The fix (commit the scaffold file before the
loop) is the correct, minimal repair for a real fixture-pollution bug, scoped
to the test harness only; it has no bearing on production code.

## Verification performed independently

- `bun test src/tests/git-anchored-completion.test.mts` — 21 pass / 0 fail.
- `bunx tsc --project tsconfig.test.json --noEmit` — clean.
- Live call against this repo's real `FEAT-259.md` — reproduced the builder's
  exact claimed result.
- Live call against this repo's real `FEAT-267` / PR #549 — found and
  confirmed the squash-merge false-negative described in §2.
- Standalone discriminated-union compile probe under `tsconfig.test.json` —
  confirmed the builder's narrowing claim in §6(a).

## Decision

**approved_with_notes.** The defect FEAT-284 exists to fix is genuinely
fixed and independently reverified against live repo state, not just
fixtures. Fail-open contract, additive result shape, and scope boundaries all
hold under independent check. One real, load-bearing gap: AC-7 trades away
detection for genuinely-shipped squash-merged multi-slice PRs (common in this
repo — see PR #549 / FEAT-267 above), which is safe-direction but silently
gives up this module's main practical win for that commit shape. Recommend
filing a fast-follow (a natural AC-8 on FEAT-284, or its own FEAT) to
recognize per-bullet subject lines inside a squashed body before closing out
FEAT-284, rather than blocking SLICE-189 on it.
