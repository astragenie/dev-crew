---
slice: SLICE-185
feature: FEAT-259
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

## Summary

Reviewed commit `c7be0fc8` (parent `57e392c4`): `src/scripts/lib/orchestrator-watchdog.mts`
(346 lines) + `src/tests/orchestrator-watchdog.test.mts` (320 lines, 22 tests), plus ceremony
artifacts. Re-ran `bun test src/tests/orchestrator-watchdog.test.mts` (22 pass / 0 fail),
`bunx tsc --project tsconfig.json --noEmit` (clean), `bunx biome lint` on both files (clean),
and confirmed independently via `grep -rln orchestrator-watchdog src/` that only the test file
references the module — zero production callers.

## No-execution-point claim: verified true

Checked every plausible caller myself rather than accepting the builder's assertion:

- `slice-linker/dispatch.mts` (543 lines) — grepped for `Monitor`/idle-state handling: none.
  It's `buildDispatchInstruction`/`extractSection`/etc. — pure prompt-string assembly, confirmed.
- `dispatch-prune.mts` — has its own independent `isInFlight`/mtime staleness check (the
  `IN_FLIGHT_WINDOW_MS` this module's freshness default deliberately mirrors), but it's a
  CLI pruning script over dead worktrees on disk, not a live-session observer — no
  idle_notification/report concept anywhere in it.
- `src/scripts/lib/wave/*.mts` (13 files: planner, runner, conflict, ranking, etc.) — grepped
  for `Monitor`/`idle_notification`/`SendMessage`: none.
- `hooks/report-gate.mjs` (SLICE-187) — the only hit for `SendMessage` outside this module —
  runs as a detached `node` process per FEAT-259's own SLICE-184/187-independence finding
  (agent-definition content never reaches its scanned transcript turn); it has no Monitor/
  TaskList handle by construction, confirmed by re-reading that finding in FEAT-259.md.

Conclusion: there is genuinely no scriptable execution point in this repo today that can
observe a dispatched subagent's live idle/stop status. That capability exists only inside
the interactive orchestrator turn itself, which isn't a `.mts` module this repo's CLI can
call into. Shipping this as a documented pure decision function is the correct call, not an
instance of FEAT-281's "tested but never wired" defect class — the difference being that this
header discloses the gap prominently and accurately (lines 1–25) rather than silently, and a
future reader cannot mistake it for live behavior. I consider this question closed correctly.

## HARD GUARD (running beats everything else)

`classifyLaneCondition` (orchestrator-watchdog.mts:166-185) checks the freshness condition
first and returns early on `"running"` before the uncommitted-changes check is even reached.
I tried to construct an input ordering that defeats it: `worktree.exists: true,
hasUncommittedChanges: true, freshestActivityMs: <fresh>` — still classifies `"running"`
(exercised directly by the test at line 58-66, and by the real-git-repo end-to-end test at
line 307-320). `decideWatchdogAction` independently short-circuits `"running"`/`"ok"` to
`action: "none"` before even touching `priorState` (line 220-222), so no persisted state from
a prior tick can make a `"running"` classification nudge either. I could not find an ordering
that overrides the guard.

One narrow, low-severity edge case *adjacent* to the guard (not a defeat of it): `inspectWorktree`
locates changed-file mtimes via `parseChangedPaths`'s fixed `slice(3)` offset, which does not
un-quote git's C-style quoting for paths containing spaces/special characters, nor does it
resolve rename arrows (`old -> new`) to the new path — both already disclosed in the code's own
comments as accepted gaps. If the *only* uncommitted change in a tick is to such a path, its
mtime is silently dropped from `freshestMtimeAmong` and the freshness signal falls back to
last-commit-time or worktree-root mtime, which could be older than the true edit — the running
agent would then misclassify as `stopped_uncommitted` rather than `running` in that specific
window. This is real but narrow (requires the sole live edit to be to an oddly-named file with
no other changed path), already has a fallback rather than crashing, and cannot presently fire
since nothing calls this module — recommend hardening `parseChangedPaths` before wiring a caller.

## Three conditions are genuinely distinct

Verified by reading `nudgeMessageFor` (line 190-202) directly, not just trusting the tests:
`stopped_uncommitted`'s message never mentions "SendMessage" and instructs "just commit";
`idle_without_report`'s message never mentions "commit" and instructs `SendMessage(to: "main", ...)`.
Confirmed also by the dedicated test at line 149-155 and 168-174.

## Nudge-once accounting

`decideWatchdogAction` (line 215-246) keys `nudgeCounts` per-condition, checks
`priorState.reportMissing` before any per-condition logic, and increments a specific
condition's count on first nudge — second occurrence of that *same* condition (regardless of
what happened in between) sets `reportMissing: true`, after which every subsequent call for
that lane is `action: "none"` unconditionally. I traced an oscillation scenario the tests don't
cover directly (idle → stopped_uncommitted → idle again): the second `idle_without_report`
still correctly resolves via its own persisted count (1 → report_missing) regardless of the
intervening different-condition tick, since counts are keyed by condition, not by tick sequence.
No path nudges the *same* condition twice. By design (and reasonably, given item 2's
requirement that the two messages stay distinct), a lane can receive up to two total nudges
across its lifetime — one for `idle_without_report`, one for `stopped_uncommitted` — before
`reportMissing` locks in; that is a deliberate per-condition budget, not an accounting bug, and
matches the FEAT's requirement that the two instructions not be conflated into one budget.

## `-uall` vs `-uno` divergence

Reasoning holds. `worktree-manager.mts`'s `-uno` answers "is the MAIN tree too dirty to safely
branch a new worktree" — untracked loop/crew state files are expected there and must not block.
This module's `-uall` answers a different question: "would `git worktree remove` destroy
anything unrecoverable in *this* lane's worktree" — and an untracked new file is destroyed by
prune exactly like an unstaged edit to a tracked file, so excluding it would create a hole in
the exact scenario (`SLICE-181`-style lost work) this slice exists to catch. The header comment
at orchestrator-watchdog.mts:309-316 cross-references the divergence explicitly, so a future
reader hitting both call sites side by side won't read it as inconsistency.

## Porcelain-parsing (`gitText` whole-string-trim) fix

Confirmed correct: `gitText` (run-git.mts:39-46) calls `.trim()` on the *entire* stdout string,
which would eat the leading space of a first-line `" M path"` entry before `parseChangedPaths`'s
`slice(3)` runs, shifting every character in that first path by one. `inspectWorktree` correctly
switched to raw `runGit` (untrimmed) for this reason (orchestrator-watchdog.mts:324-336).

Checked whether any other call site shares this bug by enumerating every `--porcelain` call site
in the repo and how each parses its output:
- `checkpoint-commit.mts:45` (`gitText(["status","--porcelain"])`) — only checks
  `stdout === ""`, never slices per-line. Trimming can't turn a non-empty porcelain line into an
  empty string, so this site is unaffected.
- `worktree-manager.mts:123` / `auto-merge.mts:262` — both route through `gitTextOrThrow`, whose
  `gitTextOrThrow` (run-git.mts:78-107) returns `result.stdout` **untrimmed**; callers only check
  `.trim().length > 0`, never parse per-path. Unaffected.
- `dispatch-worktree.mts:284` (`listUncommittedWip`) — uses raw `execFileSync(...).toString()`
  directly (not `gitText`), so the leading-space bug never applies; it does its own
  `substring(0,2)`/`substring(3)` per-line parsing correctly on untrimmed output.
- `dispatch-worktree.mts:148-152` (`preflightGitClean`) and `dispatch-cherrypick-handoffs.test.mts` /
  `dispatch-worktree.test.mts` — raw `execFileSync`, length-only checks, no per-line parsing.
- No other `gitText(...)` call site in `src/scripts/lib/` (git-anchored-completion.mts,
  learnings.mts, doctor.mts, slice-id-allocator.mts, agent-version.mts) touches `--porcelain`
  output at all.

**Finding: no other call site in this repo shares the bug.** The combination required to trigger
it — `gitText`'s whole-string trim *plus* fixed-column per-line parsing of the result — exists
nowhere else; every other porcelain consumer either avoids `gitText` (uses raw `execFileSync`/
`runGit`) or only checks emptiness rather than parsing columns. This is a real bug the builder
correctly found and fixed in new code, not a repo-wide latent defect.

## Freshness default (5 minutes / `IN_FLIGHT_WINDOW_MS` reuse)

Verified directly: `dispatch-prune.mts:55` and `dispatch-tree-snapshot.mts:15` both define
`const IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000;` verbatim. Reuse for the same "is this run still
active" judgment call is appropriate, not coincidental — same question, same repo convention,
now a third site answering it consistently. `resolveFreshnessThresholdMs` correctly falls back
to the 5-minute default on absent/non-numeric/non-positive config (tests at line 180-203 cover
`null`, `{}`, `0`, `-3`, and a string `"10"`).

## Test quality

22 tests. `inspectWorktree` is exercised against real `git init` temp repos via `spawnSync`
(`tmpRepo()`, line 26-40) — actual commits, actual `fs.writeFile`/`fs.utimes` edits, actual
`git status --porcelain -uall` round trips — not hand-authored fixture strings. This directly
follows the FEAT-284/288 lesson cited in the test file's own header. Coverage includes the
priority-order HARD GUARD (fresh activity wins even with uncommitted changes present, both as a
synthetic unit test and as a real-repo integration test), the nudge-once/report-missing state
machine end-to-end across three ticks mirroring the actual SLICE-181 scenario, and config
edge cases. I did not find a gap serious enough to require additional tests before this can
ship as an unwired module; the quoted-path/rename parsing gap noted above would be a reasonable
addition if/when a caller is wired up.

## Scope

Confirmed via `git diff 57e392c4 c7be0fc8 --stat` restricted to the sibling surfaces: no changes
to `hooks/report-gate.mjs`, SLICE-183, SLICE-186, `CLAUDE.md`, `templates/`, `commands/`,
`skills/`, `agents/`, or any other file under `src/scripts/`. The diff touches exactly the two
new source/test files plus this slice's own ceremony artifacts (plan, run-brief, trajectory,
shape-marker) and the FEAT-259 frontmatter update (`slices_complete`).

## Decision rationale

`approved_with_notes`. The core claims all verified true under independent check (no execution
point exists; HARD GUARD cannot be defeated; conditions and their nudge text are genuinely
distinct; nudge-once accounting is sound; the `-uall` divergence is justified; the porcelain-fix
is correct and unique to this new code; the 5-minute default is a real, not coincidental,
convention match; tests use real git repos). The one open item — `parseChangedPaths`'s fixed
`slice(3)` offset not handling quoted/special-character paths or rename-arrow remainders — is a
real, narrow gap adjacent to (but not a defeat of) the HARD GUARD; it's already disclosed in
code comments and bounded by a fallback chain, so it does not block shipping an unwired pure
function, but it should be hardened before any future caller is wired to this module in a
context where oddly-named files are plausible.
