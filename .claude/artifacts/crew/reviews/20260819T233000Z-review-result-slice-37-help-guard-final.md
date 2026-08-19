---
decision: approved
reviewer: crew:reviewer
slice: SLICE-37
reviewed_commits: [871eeb9e, faaa07b8]
supersedes: .claude/artifacts/crew/reviews/20260819T230000Z-review-result-slice-37-help-guard.md
---

# Review — SLICE-37 (FEAT-020, P0) final: config/wave --help fix re-check, supersedes needs_fix

## Summary

This supersedes my prior `needs_fix` review
(`20260819T230000Z-review-result-slice-37-help-guard.md`), which found the
dispatch-level chokepoint correctly placed for the `COMMANDS`-registry path
but live-reproduced two gaps in the `rawArgv` short-circuits: `config
migrate-devcrew --help` performed a real filesystem write, and `wave
plan/run/loop --help` fell through to real execution. Follow-up commit
`faaa07b8` adds an argv-scan `--help`/`-h` guard at the very top of both
`runConfigSubcommand()` and `waveCli()`, mirroring `dispatch.mts`'s already
-safe pattern. I re-ran both of my original live reproductions (now fixed),
added an adversarial `--help`-after-other-flags shape, and — since the fix
makes it safe to do so — went further than the commit's own testing and
live-executed `wave run --help` / `wave loop --help` themselves (not just
`plan`). All clean. **Decision: approved.**

## 1. Original reproduction #1 re-run — fixed

```
$ bun src/scripts/loop.mts config migrate-devcrew --help --repo <tmp>
loop CLI — config
Usage:
  bun src/scripts/loop.mts config get <dotted.path> [--repo <path>]
  bun src/scripts/loop.mts config migrate-devcrew [--repo <path>]
...
exit=0
```

No `devcrew.json`, no `.bak` — confirmed via `find <tmp> -type f`, only the
pre-existing `.claude/loop.json` remains.

## 2. Original reproduction #2 re-run — fixed

```
$ bun src/scripts/loop.mts wave plan --help --repo <tmp>
loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]
exit=0
```

No `"Wave plan:"` output (the real plan case's marker) — the guard fires
before `waveCli` does anything else, confirmed by reading the diff: the
`if (sub === "--help" || ... || argv.includes("--help") || argv.includes("-h"))`
check is the literal first statement in the function, before even
`getFlag(argv, "repo", ...)` runs.

## 3. Adversarial shape — `--help` after other flags, position-independent

```
$ bun src/scripts/loop.mts config migrate-devcrew --repo <tmp> --help
(usage text, exit 0)

$ bun src/scripts/loop.mts wave run --repo <tmp> --size 3 --help
loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]
exit=0

$ bun src/scripts/loop.mts wave loop --repo <tmp> --help
loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]
exit=0
```

`.includes()` scans the whole array regardless of position, so this was
expected to hold — confirmed live rather than assumed. Notably, since the
guard is now provably safe (it's the first line of `waveCli`, before any
config/candidate loading), I went beyond the commit's own testing scope
(which deliberately skipped live-testing `run`/`loop` given the destructive
blast radius under the *old*, broken code) and live-executed both `wave run
--help` and `wave loop --help` themselves. Zero files written across all
five live invocations in this re-check (the two original repros plus these
three adversarial/`run`/`loop` shapes) — only the pre-existing `loop.json`
remained each time.

## 4. Regression tests — both files solo, both new tests meaningful

`bun test src/tests/cli-help-guard.test.mts src/tests/wave/cli.test.mts`:
**9 pass, 0 fail**, 23 expect() calls (cli-help-guard: 4 tests, wave/cli:
5 tests — matches the expected count).

Read both new tests, not just their pass/fail status:

- **`config migrate-devcrew --help exits 0 and writes zero files`**: seeds
  a *real* `.claude/loop.json` with actual content via `writeLoopJson`
  before invoking, specifically so `migrateToDevcrewConfig()` would have
  something real to migrate if the guard failed — proving the guard, not an
  unrelated "nothing to migrate" no-op. Asserts the file list is unchanged
  AND explicitly asserts no file ending in `devcrew.json` or `.bak` exists
  — a precise negative assertion matching my exact original repro, not a
  generic "didn't crash" check.
- **`wave plan --help prints usage instead of running the real plan
  logic`**: asserts the usage text is present AND explicitly asserts the
  real plan case's output markers (`/^Wave plan:/m`, `"waveId"`) are
  **absent** — a genuine negative assertion that would catch a regression
  back to the old fall-through behavior, not just a "some output exists"
  check.

## 5. Sanity checks

- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean.
- `dispatch` short-circuit: untouched by this follow-up commit (already
  independently verified safe in the prior review — its own parser resolves
  `subcommand = "help"` from anywhere in argv, unconditionally).

## Decision rationale

`approved`. Both gaps identified in my prior `needs_fix` review are fixed
using the same robust, position-independent pattern `dispatch.mts` already
used safely, placed as the literal first statement in both functions —
before any config resolution, candidate loading, or side-effecting call.
I re-verified both original live reproductions are now clean, added and
verified a `--help`-after-other-flags adversarial shape, and — now that the
fix makes it safe — went further than the commit's own scope by
live-executing `wave run --help` and `wave loop --help` directly (not just
`plan`), confirming zero writes across all five live invocations. The two
new regression tests are specific and would catch a reintroduction of
either original defect, not generic smoke tests. All three `rawArgv`
short-circuits (`dispatch`, `config`, `wave`) are now confirmed safe against
the SLICE-31 defect class. Combined with my prior review's independently
verified findings on the `COMMANDS`-registry chokepoint (correct placement,
3/3 regression tests, live `install --bogus-flag` reproduction, clean
`decisions-cli-parity` non-regression, clean residue check, clean tscs/
biome, and a full-suite run at 3416 pass/0 fail), FEAT-020 AC-1 through AC-4
are now all satisfied across the full CLI surface, not just the
`COMMANDS`-registry path. No blockers remain for the v1.0.0 cut.
