# Review Result — FEAT-249 wave-run self-blocking dirty-tree fix

- **Reviewed:** 2026-07-19
- **Reviewer:** independent review (in-worktree)
- **Repo:** astragenie/runner-plugin, branch `chore/wave0-intake-feat249`
- **Worktree inspected:** `C:\work\mega\runner-plugin\.-feat249-0`
- **Commit under review:** `d0b20f0c` (diff vs `fa6dcbcf`)
- **FEAT:** `.claude/artifacts/loop/backlog/triaged/FEAT-249.md` (P1, github issue #500)

## review_decision: rejected

One MEDIUM finding blocks close: the FEAT's own explicit completion clause
("Remove the .gitignore workaround + restore artifact commits when fixed")
was not carried out. Everything else — the code change itself, its test
coverage, and all CI gates — is correct and green.

## Method

- `git diff fa6dcbcf..HEAD --stat` — 2 files touched
  (`src/scripts/lib/dispatch-worktree.mts`,
  `src/tests/dispatch-worktree.test.mts`), matches the stated scope
  (dispatch-worktree.mts + tests). No scope creep.
- Read `preflightGitClean` and its full surrounding context in
  `dispatch-worktree.mts`, and the wave lifecycle event emission in
  `src/scripts/lib/wave/runner.mts` (`wave_started`/`plan_built`/
  `wave_member_slice` all fire before `prepareFn`, which reaches
  `preflightGitClean`) to confirm the crash-forensics justification for
  choosing allowlist option (b) over write-after-preflight option (a) is
  real, not post-hoc.
- Ran gates in the worktree:
  - `bun test src/tests/dispatch-worktree.test.mts` — 21 pass, 0 fail.
  - `bun test src/tests/ --parallel --timeout 60000` — 3067 pass / 7 skip /
    0 fail across 308 files.
  - `bunx tsc --project tsconfig.json --noEmit` — clean.
  - `bunx tsc --project tsconfig.test.json --noEmit` — clean.
  - `bunx biome lint src/` — 63 warnings / 252 infos repo-wide (pre-existing
    legacy baseline per CLAUDE.md); `bunx biome lint` scoped to the two
    touched files — clean, 0 findings.
  - `bunx biome format src/` — clean, no diffs.
  - `bun ./src/scripts/validate-manifests.mts`,
    `validate-imports.mts`, `validate-dispatch-markers.mts` — all OK.
- Manually re-derived the git pathspec behavior outside the test harness
  (temp repos + the real worktree) to independently verify the Windows
  path-separator and directory-collapse concerns named in the review
  request, beyond what the two new unit tests cover (see Findings).

## Findings

### [MEDIUM] `.gitignore:16` — workaround not removed per FEAT-249's explicit instruction

FEAT-249's description ends with an unambiguous completion clause: *"Remove
the .gitignore workaround + restore artifact commits when fixed."* The
workaround (`.claude/artifacts/loop/waves/`, added by `c1013034`) is still
present in `.gitignore` on this branch — the diff touches only
`dispatch-worktree.mts` and its test file, never `.gitignore`.

This matters beyond housekeeping: I verified in the actual worktree that
`.gitignore` already suppresses `.claude/artifacts/loop/waves/**` from
plain `git status --porcelain` output (ignored paths never appear without
`--ignored`), independent of this fix. So the literal originally-reported
repro (wave run self-blocking on its *own* `waves/` artifact write) was
already masked by the interim workaround before this commit, and remains
masked after it — this commit's allowlist is currently inert for that
specific path. Where the fix *does* add real value is the broader class of
`.claude/artifacts/loop/**` paths the narrower `waves/`-only `.gitignore`
entry doesn't cover (e.g. a hypothetical `.claude/artifacts/loop/some-other-artifact.jsonl`
dispatch trace/summary file — confirmed by hand: plain status shows it
dirty, the new exclude pathspec correctly suppresses it). That's a
legitimate and useful generalization, but it is not what FEAT-249 asked to
be verified, and leaving the `.gitignore` line in place means wave
artifacts stay permanently untracked/uncommitted, contradicting the
FEAT's stated definition of done ("restore artifact commits").

**Fix:** remove `.claude/artifacts/loop/waves/` from `.gitignore` now that
the allowlist makes it safe to keep those artifacts tracked, and confirm
(or add) a case demonstrating a *tracked* wave-artifact path — not just a
fresh unmodified `initRepo()` fixture without the repo's real
`.gitignore` — doesn't regress the fix. This is a small, low-risk,
mechanical follow-up; not a rewrite.

### No other blocking findings

- **Correctness / Windows path handling** — clean. The allowlist uses
  git's own `:(exclude)<pathspec>` pathspec magic
  (`dispatch-worktree.mts:119-123`) rather than a textual line-prefix
  filter over `--porcelain` output, so there is no forward-slash/backslash
  mismatch risk: pathspecs are always `/`-delimited regardless of OS, and
  git's `--porcelain` output is also always `/`-delimited on Windows. I
  independently reproduced this in three ways: (1) a fresh temp repo with
  only the loop artifact dirty → empty status (correctly allowed); (2) the
  same plus an unrelated dirty file → status still shows the unrelated
  file (correctly blocks); (3) in the real worktree, only the loop
  artifact dirty → empty, then also touching `README.md` → ` M README.md`
  still shows (correctly blocks). This matches exactly what the new
  regression test (`dispatch-worktree.test.mts` — "a non-artifact dirty
  file still throws even alongside a loop artifact") asserts.
- **Masking risk / prefix bug** — checked and ruled out. I specifically
  tried to defeat the allowlist with a sibling directory sharing a
  `.claude/artifacts/loop`-*like* prefix (`.claude/artifacts/loopXYZ/`) to
  probe for a naive `startsWith`-style bug; the glob-anchored pathspec
  (`.claude/artifacts/loop/**`, literal trailing slash before `**`)
  correctly does *not* match it. Separately, in a repo where `.claude/` is
  *entirely* untracked (no committed content at all — not this repo's
  actual state), git's own untracked-directory-collapse heuristic can
  report a single `?? .claude/` line covering both excluded and
  non-excluded content; I confirmed this fails *safe* (still reports
  dirty, does not mask), and does not reproduce in this repo's actual
  tracked-`.claude/`-tree state (verified directly in the worktree).
- **Regression test coverage** — present and correct: one test proves the
  self-block reproduction case is fixed (untracked wave artifact alone
  doesn't block), one proves a genuinely dirty file outside the allowlist
  still throws, even when a loop artifact is present alongside it. Both
  pass.
- **Scope** — confined to `dispatch-worktree.mts` +
  `dispatch-worktree.test.mts`. No unrelated changes.
- **CI gates** — all green as run above.

## Recommendation

Land the `.gitignore` follow-up (remove the `waves/` line, verify no
re-break) in the same branch, then re-request review — this should be a
fast turnaround given the core fix is sound.
