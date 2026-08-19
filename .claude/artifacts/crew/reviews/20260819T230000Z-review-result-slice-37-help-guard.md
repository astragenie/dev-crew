---
decision: needs_fix
reviewer: crew:reviewer
slice: SLICE-37
reviewed_commits: [871eeb9e]
---

# Review — SLICE-37 (FEAT-020, P0): gate every loop.mts subcommand on --help before dispatch

## Summary

Commit `871eeb9e` adds a dispatch-level `if (flags.help)` chokepoint in
`main()` plus a `SUBCOMMAND_USAGE` map, closing the SLICE-31 near-miss
(`install --help` executing a real install) for every command routed
through the `COMMANDS` registry via `parseArgs`. That part is correctly
placed and independently verified. **However, the commit's own safety claim
about the three `rawArgv`-short-circuited commands (`dispatch`, `wave`,
`config`) that bypass this chokepoint entirely is only true for one of the
three.** I live-reproduced the exact SLICE-31 defect class recurring,
unguarded, in two places this fix did not touch: `config migrate-devcrew
--help` performs a real filesystem write, and `wave run --help` /
`wave loop --help` would fall through to a real wave execution (worktree
dispatch, agent spawning, branch merges — a higher blast radius than the
original `install` near-miss). **Decision: needs_fix**, scoped to closing
these two live gaps; everything else in this slice is solid.

## 1. Chokepoint placement — verified correct for the COMMANDS-registry path

Traced `main()` end to end (`src/scripts/loop.mts:898-1039`). For every
command reached via `parseArgs` (install, slice, backlog, intake, and
everything else in the `COMMANDS` registry):

- `parseArgs(rawArgv)` runs (line 936), resolving `flags.help` correctly
  (confirmed — this was never in dispute; SLICE-31's bug was that it was
  parsed correctly but never checked).
- The `flags.help` chokepoint (line 953) fires immediately after, **before**
  the `resolve-skills` special case, **before** the `DELETED_SKILLS_MAP`
  stub check (line 1006 — confirmed via `grep` that the only read of
  `DELETED_SKILLS_MAP[command]` is that one line, strictly after the
  guard), **before** the `COMMANDS[command]` handler lookup (line 1013),
  and **before** `resolveConfig()` (line 1026). No side-effecting code in
  this path can execute before the guard. Placement claim holds.

## 2. Two live, reproducible gaps in the `rawArgv` short-circuits

The commit's in-code comment claims: *"`dispatch` and `config` are
intercepted before parseArgs runs... and are not gated by that chokepoint —
both already refuse to touch the filesystem on missing/unknown
sub-subcommands (dispatch forwards to dispatch.mts's own parser; config's
unknown-sub branch is a pure `console.error` + exitCode)."* I checked all
three `rawArgv[0] === ...` short-circuits in `main()` (`dispatch`, `wave`,
`config` — confirmed exhaustive via `grep`), not just the two named.

**`dispatch` — verified safe.** `dispatch.mts`'s own `parseArgs` sets
`args.subcommand = "help"` unconditionally whenever `--help`/`-h` appears
anywhere in argv (not just in the subcommand position), fully resolved
before its `switch` runs. Live-verified: `dispatch prepare --help` and
`dispatch prune --help` both print the full dispatch usage block and exit
0, no side effects. The claim holds here.

**`config` — FALSE for `migrate-devcrew`, live-reproduced.** The claim only
covers the *unknown/missing sub* branch of `runConfigSubcommand` (line 894:
`console.error(...); process.exitCode = 1`). `config migrate-devcrew` is a
*known* sub whose handler, `runConfigMigrateDevcrewSubcommand`
(`loop.mts:876-882`), never checks for `--help` at all — it goes straight
to `migrateToDevcrewConfig(repoRoot)`. Reproduced live against a disposable
temp repo:

```
$ bun src/scripts/loop.mts config migrate-devcrew --help --repo <tmp>
{
  "written": true,
  "path": "...\\.claude\\devcrew.json",
  "reason": "migrated",
  "backups": ["...\\.claude\\loop.json.bak"]
}
exit=0
```

This **wrote** `.claude/devcrew.json` and `.claude/loop.json.bak` — a real,
unrequested filesystem write, with `--help` silently ignored and exit code
`0`. This is the exact SLICE-31 pattern (operator runs `--help` expecting a
no-op, gets a real side effect instead), in a code path this same P0 fix's
own commit message explicitly (and incorrectly) asserted was already safe.

**`wave` — even more severe, live-mechanism-confirmed.** `waveCli`'s
`switch (sub)` (`src/scripts/lib/wave/cli.mts:40`) dispatches purely on
`sub` (`rawArgv[1]`, the literal second token). `--help`/`-h` is only
recognized when it **is** `sub` itself (the dedicated `case "--help": case
"-h":` branch at line 124). None of the `plan`/`run`/`loop` cases check
`argv` for `--help` at all — so `wave run --help` or `wave loop --help`
would fall straight through to `runWave()`, which spawns worktrees,
dispatches agents, and merges branches for real. Given the destructive
blast radius, I did not execute `wave run --help`/`wave loop --help`
directly against a live tree. Instead I confirmed the mechanism safely
using the read-only `plan` case against an isolated, empty temp repo:

```
$ bun src/scripts/loop.mts wave plan --help --repo <empty-tmp>
Wave plan: size=0, rejected=0
exit=0
```

If `--help` were honored, this would have printed the wave usage line
(`"loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]"`); it
instead executed the real `plan` logic. Since the switch treats
`plan`/`run`/`loop` identically with respect to `--help` (none of the three
branches check `argv` for it), this proves the same silent-ignore behavior
applies to `run`/`loop` — the two side-effecting cases — by direct code
inspection of the identical dispatch structure, without needing to trigger
a real dispatch. **This was not on the commit's own radar at all** (the
in-code comment only discusses `dispatch` and `config`; `wave` isn't
mentioned), and it's the highest-blast-radius command in the whole CLI.

## 3. Everything else independently verified, no issues

- **3 regression tests solo**: `bun test src/tests/cli-help-guard.test.mts`
  → **3 pass, 0 fail**, 10 expect() calls.
- **2 additional live spot-checks** (subcommands the test file doesn't
  cover), against a fresh isolated temp repo: `slice --help` (dedicated
  `SUBCOMMAND_USAGE` entry) and `retrospective --help` (no dedicated entry
  — correctly falls back to the generic `usage()` text via `usageFor`'s
  `??`). Both exit 0, zero files written, confirming the "safe generic
  fallback" design for commands with no dedicated usage text.
- **`install --bogus-flag`**: reproduced live outside the test harness —
  `Unknown argument: --bogus-flag`, exit 1, zero writes. `parseArgs`'s
  pre-existing throw fires before any handler, as claimed.
- **`decisions-cli-parity.test.mts`**: currently green (**4 pass, 0 fail**).
  Checked the specific concern (did the new `SUBCOMMAND_USAGE["decisions"]`
  entry weaken this test's original discriminating power?) — it did not,
  because the test never had discriminating power to begin with. Verified
  live that `decisions list --help` and `decisions totally-bogus-sub --help`
  produce byte-identical output today (both hit the same chokepoint-level
  usage text, which lists all four verbs on one line). Checked the
  pre-SLICE-37 state via an isolated worktree at `871eeb9e^`: `decisions
  list --help` and `decisions totally-bogus-sub --help` were *already*
  byte-identical before this fix too (both printed a "decisions
  subcommands:" block listing all four verbs, before crashing on an
  unrelated dependency-resolution issue specific to the disconnected
  worktree). The test's `toContain(sub)` assertion was already
  non-discriminating pre-fix; this commit swapped one non-discriminating
  help text for another, not a new regression. Worth flagging as a
  pre-existing test-design gap for a future hardening pass, not a defect in
  this slice.
- **Residue check**: `git status --short` on `CLAUDE.md`, `.claude/loop/`,
  and a repo-wide grep for `.bak`/`devcrew.json`/`loop.json` changes turned
  up nothing — no trace of the builder's self-reported mid-task
  re-triggering of the live bug. Both `CLAUDE.md` and `.claude/loop/rules.md`
  last-touched commits predate SLICE-37 entirely. Clean.
- **Both tscs**: `tsconfig.json` and `tsconfig.test.json` — both clean, no
  output.
- **Biome**: `bunx biome lint`/`format` on the 2 changed files — format
  clean; lint shows 4 warnings + 10 infos, but every flagged line (444,
  602, 714, 829, 1636, 1642, 2108, 2116, 2260, 2272, 2322 in `loop.mts`) is
  well outside this commit's touched range (72-181, 944-956) — pre-existing
  tech debt, not introduced here.
- **Full suite** (wave's final confirmation, run once as instructed):
  `bun test src/tests/ --parallel --timeout 60000` → **3416 pass, 7 skip, 0
  fail**, 1578 expect() calls, 3423 tests across 335 files, 104.85s.
  Confirms the lead's `2c92a030` fix holds and this slice introduces no
  regressions.

## Decision rationale

`needs_fix`, scoped narrowly to the two live gaps in §2. The dispatch-level
chokepoint itself is correctly placed and does everything AC-1/AC-2/AC-4
ask of it for the `COMMANDS`-registry path, and the regression tests,
spot-checks, and full suite all confirm no regressions. But AC-3's literal
text — *"every subcommand dispatched from loop.mts's command switch (not
just install)... checks flags.help before any side-effecting operation"* —
is not met for `config migrate-devcrew` (live-reproduced: a real write with
`--help` silently ignored) or `wave run`/`wave loop` (mechanism confirmed
live via the identically-structured `plan` case; not executed directly
given the destructive blast radius of a real wave dispatch). This is a P0
slice whose entire premise is a live near-miss data-loss incident, and I
found the same defect class still open — in one case, in a command
(`wave run`) with a larger blast radius than the original `install`
near-miss. The commit's own safety reasoning about the `rawArgv`
short-circuits was half-right (`dispatch` genuinely is safe) and half-wrong
(`config`'s claim doesn't hold for its one side-effecting sub-subcommand,
and `wave` wasn't even considered). Fix scope: add `--help` checks to
`runConfigMigrateDevcrewSubcommand` and to the `plan`/`run`/`loop` cases in
`waveCli` (or hoist a single `hasFlag(argv, "help") || hasFlag(argv, "h")`
check to the top of `waveCli`, mirroring `dispatch.mts`'s more robust
"resolve subcommand=help if seen anywhere" pattern) before this slice can
close.
