---
kind: handoff
objective: E2E pilot of the v0.68.0 watcher (FEAT-243) — register, observe 3 days, gate fleet rollout
owner: human-operator
slice: null
feature: FEAT-243
phase: pilot
created_at: 2026-07-10
confidence: high
next_handoff: fleet-rollout-decision
---
# Handoff — watcher e2e pilot (FEAT-243, v0.68.0)

**Feature:** FEAT-243 (human pilot, `autonomous_safe: false`) · **Ships in:** runner v0.68.0 (tag pushed, CI green, installed plugin updated 0.67.0 → 0.68.0)

## Objective

First real scheduled run of the headless watcher: Layer-1 tick (`src/scripts/watch-tick.mts`) fired by Windows Task Scheduler, sweeping a real registry and spawning real headless `claude -p` reaction sessions under the permission allowlist. 3-day observation gates fleet rollout (B3 AC-4).

## What is already verified (do not re-test)

Smoke run 2026-07-10 (scratch watchHome, live `gh` sweeps of astragenie/runner-plugin, capturing spawn stub):

- Tick swept 150 real findings, spawned exactly 3 (machine concurrency cap), skipped 147.
- Captured argv: `claude -p "/runner:intake --from-issue <url>" --allowedTools Read,Grep,Glob` — headless, allowlist attached, `--dangerously-skip-permissions` absent (also pinned by unit + grep tests; 54 watch tests green).
- Tick 2 re-spawn suppression via claims: 0 findings.
- Unreachable-repo isolation: bogus 404 entry → `lastSweepError: not-found (count=1)` in that repo's state, reachable repo unaffected, tick exits clean.

What has NEVER run: a real schtasks-fired tick, and a real (non-stubbed) `claude -p` reaction session end-to-end. That is this pilot.

## Prerequisites

1. **Restart Claude Code sessions** — installed runner plugin updated to 0.68.0 but only loads on restart.
2. **PAT provisioning (B3 AC-1, human):** `gh` on this machine must hold a token that can read issues/runs/PRs on every registry repo AND add labels (claim labels are real writes). Current `gh auth status`: shishkosv via GITHUB_TOKEN — verify scopes cover label writes on the pilot repo.

## Setup steps

1. `~/.claude/watch/config.json`:

   ```json
   {
     "machineShard": 1,
     "allowedTools": ["Read", "Grep", "Glob", "Write", "Edit", "Bash", "Skill", "TaskCreate", "TaskUpdate"]
   }
   ```

   ⚠️ The smoke test's read-only allowlist is NOT production-viable: a `/runner:intake --from-issue` reaction must Write (FEAT files) and Bash (loop CLI). An action missing from the allowlist makes the headless `-p` session stall on an unanswerable prompt — documented trade-off, never resolved with a bypass flag. Tune this list on day 1 from observed stalls.

2. `~/.claude/watch/repos.json` (this repo as pilot entry):

   ```json
   {
     "controlRepoPath": "C:\\work\\mega\\runner-plugin",
     "entries": [
       {
         "path": "C:\\work\\mega\\runner-plugin",
         "ghSlug": "astragenie/runner-plugin",
         "shard": 1,
         "tier": 1,
         "tenantId": "pilot",
         "appId": "runner-plugin"
       }
     ]
   }
   ```

3. Register the scheduled task: `node scripts/setup-watch-scheduler.mjs` (Windows branch registers schtasks; the task only ever invokes `src/scripts/watch-tick.mts`, same entry as `/runner:watch`).

## ⚠️ First-tick behavior — read before registering

The smoke run showed **150 findings** on this repo (open issues + failed runs + red PR checks). The first real tick will:

- spawn **3 real `claude -p` intake/pr-fix sessions immediately** (cap), and
- **write claim labels to real GitHub issues/PRs** as it processes findings.

If that's more than you want on day 1, start with a quieter pilot repo, or accept the 3-per-tick drip (~every 5 min, gated by cap + cost ceiling) and watch the first hour.

## Observation checklist (3 days, B3 AC-4 gate)

- [ ] Day 1: scheduled task actually fires (CI cannot test schtasks — this is the documented manual AC from the SLICE-146 grade). Check Task Scheduler history + `~/.claude/watch/state/*.tick.json` timestamps.
- [ ] Reaction sessions complete (not stalled on permission prompts) — if stalled, widen `allowedTools`, kill the stuck session, next tick self-heals via claim TTL (COND-1).
- [ ] Concurrency never exceeds 3 in-flight reactions; cost ceiling respected (check ledger.json).
- [ ] Claim labels appear on processed issues/PRs; no double-spawn on later ticks.
- [ ] Kill a tick mid-run once: next tick recovers (lock released, no leaked slot).
- [ ] `lastSweepError` stays absent for the pilot repo (or clears after transient gh failures).

## Rollback

`schtasks /Delete /TN <task-name> /F` (name printed by the setup script), or unregister via the script if it supports it. Delete `~/.claude/watch/` to fully reset. In-flight reaction sessions are detached — kill them from Task Manager if needed.

## Forbidden scope

- No fleet rollout (adding more repos/machines) before the 3-day checklist passes.
- Never add `--dangerously-skip-permissions` anywhere, including "just to unstall a session".

## References

- Slices: `SLICE_143..146` (FEAT-242), `SLICE_149` + `SLICE_148` (FEAT-244) under `slices/completed/`
- Smoke evidence: this handoff §"already verified"; memory note `watcher-feat242-progress`
- Release: CHANGELOG v0.68.0; contract `.claude/artifacts/crew/contracts/20260709-feat242-watcher-contracts.md`

## Suggested next handoff

After 3 green days: fleet-rollout decision (B3 AC-4 checklist → FEAT-245/246 unblock, add repos to registry, second machine shard).
