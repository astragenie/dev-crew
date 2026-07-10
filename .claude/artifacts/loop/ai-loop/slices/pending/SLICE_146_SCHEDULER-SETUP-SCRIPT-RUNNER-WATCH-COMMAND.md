---
id: SLICE-146
title: "Scheduler setup script + /runner:watch command"
status: pending
feature: FEAT-242
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-07-09
updated: 2026-07-09
effort_points: 2
touches_files:
  - src/scripts/lib/watch.mts
  - commands/watch.md
  - scripts/setup-watch-scheduler.mjs
  - src/scripts/lib/watch/tick.mts
  - src/tests/watch-tick.test.mts
  - src/scripts/watch-tick.mts
  - src/scripts/lib/watch.mts
  - src/scripts/lib/watch/config.mts
  - src/scripts/validate-imports.mts
  - scripts/setup-watch-scheduler.mjs
  - commands/watch.md
  - src/tests/watch-tick-entry.test.mts
  - src/tests/watch-scheduler-setup.test.mts
  - src/tests/watch-config.test.mts
---
# SLICE-146: Scheduler setup script + /runner:watch command

Implements FEAT-242. See [feature file](../../../backlog/in-progress/FEAT-242.md) for product context.

## Objective

Watcher MVP: deterministic tick + registry/state + scheduler setup (Track B1). Implement watch-tick.mts (pure Bun, zero LLM) run by OS scheduler every ~5 min: sweep assigned shard from ~/.claude/watch/repos.json registry (gh issue list delta, gh run list --status failure, open-PR statusCheckRollup), set claim label + timestamped state entry BEFORE spawning headless claude -p reactions (intake --from-issue / pr-fix / crew:fix), enforce machine-wide reaction concurrency cap (default 3) + cost ceiling, emit watch.tick / watch.reaction envelopes via fanoutEnvelope. Includes /runner:watch interactive command sharing same tick function, tick lockfile, Task Scheduler registration script (platform-neutral tick script). State-write ownership split per COND-2 (tick owns detection fields, reactions own attemptCounts/costSpent). Full ACs AC-1..AC-8: .claude/artifacts/crew/runs/2026-07-07-watcher-acs-eta.md section B1. Design: 2026-07-07-watcher-implementation-plan.md (APPROVED-WITH-CONDITIONS). Est 4 slices, 2-3 days. Blocks C1, C3, B1.5 pilot.

## In scope (SLICE-146 delivered scope — AC-7 and AC-8 are the primary ACs; AC-1..AC-5 are regression guards already green from SLICE-143/144/145)

- Entry-point script `src/scripts/watch-tick.mts` (platform-neutral: no `process.platform` branches; sets `process.exitCode`, never `process.exit` from lib code) invoking the exported tick function
- Scheduler registration script (Task Scheduler on Windows, documented cron alternative) registering a ~5-minute interval invocation of the tick entry point
- `/runner:watch` command (commands/watch.md) whose handler calls the SAME exported tick function as the scheduler entry point — no divergent code path
- Resolve `machineShard` from config (open contract question carried from SLICE-143 — runTick currently takes it as a caller parameter); decide source (.claude/loop.json vs ~/.claude/watch/ config) and document
- Tests: AC-7 registration smoke test (or documented manual verification if Task Scheduler can't run in CI) + grep assertion of no process.platform branches in watch-tick.mts; AC-8 same-tick-function assertion

## Out of scope

- Headless-reaction permission allowlist (FEAT-244)
- Pilot operation (FEAT-243, human-run)
- IssueBroker / cross-repo filing (FEAT-245/246)

## Acceptance criteria

- [x] AC-1: Given a registry (`~/.claude/watch/repos.json`) with N repo entries assigned to this machine's shard, When `watch-tick.mts` runs, Then it sweeps every assigned entry (`gh issue list` delta / `gh run list --status failure` / open-PR `statusCheckRollup`) and exits without invoking any LLM call — evidenced by a unit test asserting zero `claude -p` spawns during a quiet tick plus a per-repo sweep-count assertion. (source: 2026-07-07-watcher-acs-eta.md AC-1, B1 section) — PASS (regression guard): `src/tests/watch-tick.test.mts`, plus new `src/tests/watch-tick-entry.test.mts` proving the real `watch-tick.mts` entry point delegates into the same sweep.
- [x] AC-2: Given a tick in progress (lockfile held), When a second tick fires on the same machine before the first exits, Then the second tick exits immediately without sweeping — evidenced by a test that holds the lockfile and asserts the second invocation's early-return and exit code. (source: 2026-07-07-watcher-acs-eta.md AC-2, B1 section) — PASS (regression guard): `src/tests/watch-tick.test.mts`; entry-point-level regression added in `src/tests/watch-tick-entry.test.mts` ("main() exits without sweeping when the tick lock is held").
- [x] AC-3: Given a finding (new issue / red build / red PR) not previously claimed, When Layer 1 processes it, Then it sets a claim label via `gh issue edit --add-label loop-claimed` AND writes a timestamped claim entry to that repo's state file BEFORE spawning any Layer 2 `claude -p` reaction — evidenced by a test asserting claim-write happens-before spawn (ordering, not just presence). (source: 2026-07-07-watcher-acs-eta.md AC-3, B1 section) — PASS (regression guard, unchanged): `src/tests/watch-claims.test.mts`.
- [x] AC-4 [COND-4, failure/skip path]: Given machine-wide concurrent reactions at the configured cap (default 3) and/or the configured cost ceiling, When a new finding would exceed either, Then Layer 1 skips spawning and records a `skipped_ceiling` note in state (finding remains unclaimed for next tick) — evidenced by a test seeding 3 in-flight reactions and asserting the 4th finding is not spawned, plus a cost-ceiling variant of the same test. (source: 2026-07-07-watcher-acs-eta.md AC-4, B1 section) — PASS (regression guard, unchanged): `src/tests/watch-spawn-gate.test.mts`, `src/tests/watch-ledger.test.mts`.
- [x] AC-5 [COND-2, data-integrity edge case]: Given a tick's detection write (`lastSeenIssue`, tick timestamp) and a concurrently-running reaction's write (`attemptCounts`, `costSpent`) to the same repo's state, When both complete, Then neither write is lost — evidenced by a test that interleaves a tick write and a reaction write against the same state file and asserts both field sets are present after both complete (not just that the file parses). (source: 2026-07-07-watcher-acs-eta.md AC-5, B1 section) — PASS (regression guard, unchanged): `src/tests/watch-state.test.mts`.
- [x] AC-7: Given the Task Scheduler / cron setup script runs on Windows, When it registers the scheduled task, Then the task invokes `watch-tick.mts` on a 5-minute interval and the tick script itself is platform-neutral (no OS-specific branching inside `watch-tick.mts`) — evidenced by a script-registration smoke test (or documented manual verification step if Task Scheduler registration can't be exercised in CI) plus a grep assertion that `watch-tick.mts` has no `process.platform` branches. (source: 2026-07-07-watcher-acs-eta.md AC-7, B1 section) — PASS: `src/tests/watch-scheduler-setup.test.mts` (`"AC-7: --dry-run reports the schtasks command line without registering"`, in-process smoke test against `scripts/setup-watch-scheduler.mjs`'s exported `main`/`registerWindowsTask`/`buildSchtasksArgs` — real `schtasks` execution is a documented manual-verification step in the script header and `commands/watch.md`, since CI has no Windows Task Scheduler to register against safely); `src/tests/watch-tick-entry.test.mts` (`"watch-tick.mts source has no process.platform branches"`).
- [x] AC-8: Given `/runner:watch` is invoked interactively, When it runs, Then it executes the same tick logic as the scheduled path (no divergent code path) — evidenced by a test asserting `/runner:watch`'s command handler calls the same exported tick function as the scheduler entry point. (source: 2026-07-07-watcher-acs-eta.md AC-8, B1 section) — PASS: `src/tests/watch-scheduler-setup.test.mts` (`"AC-8: commands/watch.md and the scheduler both reference watch-tick.mts"`); `src/tests/watch-tick-entry.test.mts` proves that same entry point's `main()` genuinely delegates to `runTick`.

## Implementation notes

- **machineShard resolution (open contract question from SLICE-143/144):**
  resolved from `~/.claude/watch/config.json` (`src/scripts/lib/watch/config.mts`),
  not `.claude/loop.json` — machineShard is a machine-wide identity spanning
  every watched repo, and a target repo's `.claude/loop.json` has no single
  natural owner for that. Missing file / unparseable JSON / non-positive
  `machineShard` all fall back to the default (`1`), so a single-machine
  setup with a registry whose entries use `shard: 1` works with zero config.
- **Real Layer-2 spawning was NOT wired in this slice.** `sweep.mts`'s
  `spawnReaction` remains the logging stub from SLICE-143/144. Rationale:
  this slice's own "In scope" list above only covers the entry point,
  scheduler script, `/runner:watch`, and machineShard resolution — it does
  not list headless `claude -p` spawning — and "Out of scope" explicitly
  excludes the permission allowlist (FEAT-244), which the design doc
  requires before any headless reaction may run ("pre-configured permission
  allowlist... NEVER `--dangerously-skip-permissions`. Scoping owned by
  B3"). Wiring real spawning ahead of FEAT-244 would ship a headless
  `claude -p` call path with no allowlist in front of it. Deferred to
  FEAT-244 (or a follow-up slice once FEAT-244 lands); the reviewer INFO
  from SLICE-145 about `recordReactionStart` landing after `spawnReaction`
  resolves therefore does not yet apply to production code — noted here so
  it isn't lost when real spawning does land.
- **Scheduler script placement:** `scripts/setup-watch-scheduler.mjs`
  (repo-root `scripts/`, hand-authored `.mjs`), matching the
  `setup-github-sync.mjs` / `setup-task-store.mjs` precedent for one-shot
  setup scripts. Diverges from those two in one way: it exports its core
  functions (`buildSchtasksArgs`, `registerWindowsTask`, `main`) behind an
  `isMainEntry()` guard (the `validate-manifests.mts` / `loop.mts`
  testable-CLI shape) rather than running top-level side effects
  immediately, because AC-7 requires a `--dry-run` smoke test that must
  never invoke the real `schtasks` binary (unavailable on non-Windows CI,
  and a real registration is not something a test run should perform).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-242 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
