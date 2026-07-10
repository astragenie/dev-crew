---
id: SLICE-147
title: "Real headless spawn wiring + permission allowlist (B3 AC-3)"
status: pending
feature: FEAT-244
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-07-10
updated: 2026-07-10
effort_points: 2
touches_files:
  - src/scripts/lib/watch/reaction-spawn.mts
  - src/scripts/lib/watch/sweep.mts
  - src/scripts/lib/watch/config.mts
  - src/scripts/lib/watch/types.mts
  - src/scripts/validate-imports.mts
  - src/tests/watch-reaction-spawn.test.mts
  - src/tests/watch-tick.test.mts
---
# SLICE-147: Real headless spawn wiring + permission allowlist (B3 AC-3)

Implements FEAT-244 (Track B3 code half). See [feature file](../../../backlog/in-progress/FEAT-244.md).

## Objective

Replace the `spawnReaction` console.log stub in `sweep.mts` (deferred from SLICE-146 pending this allowlist) with real detached child-process spawning of headless `claude -p` reaction sessions, gated by a pre-configured permission allowlist. Constructed spawn args MUST include the configured allowlist (`--allowedTools` and/or settings-based permissions) and MUST NEVER include `--dangerously-skip-permissions`. Also close the SLICE-145 reviewer INFO: tighten `recordReactionStart` vs spawn ordering so a crash between spawn-resolve and ledger-record cannot leak an untracked slot (record-before-spawn, prune-on-failure, or an atomic wrapper — document the chosen semantics).

## In scope

- New `src/scripts/lib/watch/reaction-spawn.mts`: builds spawn args (claude binary, -p command, cwd, allowlist flags from machine config) and spawns detached; arg-construction pure function exported for tests
- `~/.claude/watch/config.json` gains an `allowedTools` (or equivalent) field via `config.mts`; sensible safe default documented — absent config means the spawn still runs under Claude Code's normal permission prompts, never a bypass
- `sweep.mts` `buildDefaultTickExec.spawnReaction` wired to the real spawner; recordReactionStart ordering tightened per SLICE-145 reviewer INFO
- AC-3 tests: unit test asserting constructed args never include `--dangerously-skip-permissions` (across every ReactionAction variant) + a grep/lint-style test over spawn call sites in `src/scripts/lib/watch/` asserting the flag string appears nowhere
- Regression: quiet-tick zero-spawn (AC-1 B1) and cap/ceiling skip (AC-4 B1) tests still green against the real spawner (spawner injectable/mocked in tests — tests must never actually spawn claude)

## Out of scope

- PAT provisioning / token scope manifest (B3 AC-1 — human, pilot runbook)
- Unreachable-repo resilience (SLICE-148 / B3 AC-2)
- Fleet-rollout gating checklist (B3 AC-4 — pilot runbook)

## Acceptance criteria

- [x] AC-3 [B3]: Given Layer 2's headless `claude -p` reaction sessions, When they run, Then they execute under a pre-configured permission allowlist (settings permissions / `--allowedTools`) and NEVER pass `--dangerously-skip-permissions` — evidenced by a grep/lint check over the spawn call sites plus a unit test asserting the constructed command args never include that flag. (source: 2026-07-07-watcher-acs-eta.md AC-3, B3 section)
- [x] AC-3b [carried SLICE-145 INFO]: Given a crash between reaction spawn and ledger record, When the next tick runs, Then no concurrency slot is leaked untracked and no reaction double-spawns — evidenced by a test covering the chosen ordering semantics (record-before-spawn with failure-prune, or equivalent) asserting ledger + claim state after a simulated spawn failure.
- [x] AC-reg: Given a quiet tick and a cap/ceiling-blocked finding, When the real spawner is wired, Then existing B1 AC-1/AC-4 tests still pass with zero real processes spawned in any test run.

## Done When

- all acceptance criteria PASS with evidence
- build / test commands per `.claude/loop.json` pass
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (repo ladder ["A"])
