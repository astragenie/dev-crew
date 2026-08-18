---
name: watch
description: Run one watcher tick interactively — the same Layer 1 sweep the OS scheduler runs every ~5 minutes, useful for pilot debugging and live escalation.
auto_execute_steps: false
---

# Interactive Watch Tick

Runs one watcher tick (FEAT-242 Track B1) against the local
`~/.claude/watch/repos.json` registry. This is the SAME entry point the
scheduled task registered by `scripts/setup-watch-scheduler.mjs` invokes —
`/runner:watch` and the scheduler are two callers of one script, never two
implementations (AC-8).

Workflow:

1. Run:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/watch-tick.mts"
   ```
2. The script:
   - resolves `watchHome` (`~/.claude/watch`, overridable via
     `LOOP_WATCH_HOME`) and this machine's `machineShard` from
     `~/.claude/watch/config.json` (default `1` — zero-config on a
     single-machine setup)
   - sweeps every registry entry assigned to that shard (`gh issue list`
     delta / `gh run list --status failure` / open-PR
     `statusCheckRollup`), zero LLM calls during the sweep itself
   - claims new findings (state write + `gh` label BEFORE any Layer 2
     spawn) and respects the machine-wide reaction concurrency cap / cost
     ceiling
3. Output reports the sweep outcome:
   - `swept: findings=<n> spawned=<n> skipped=<n>` — normal tick result
   - `lock held by another tick — exiting` — a concurrent tick (scheduled
     or interactive) is already running on this machine; this invocation
     exited immediately without sweeping (AC-2)

## When to use this vs. the scheduler

- **Scheduler** (`scripts/setup-watch-scheduler.mjs`) — unattended,
  ~5-minute cadence, no open terminal required. The default operating mode
  once a repo is registered.
- **`/runner:watch`** — on-demand, for pilot debugging ("did the last
  finding get picked up?"), live escalation, or exercising the tick
  immediately after editing the registry rather than waiting for the next
  scheduled interval.

## Registering the scheduled task

See `scripts/setup-watch-scheduler.mjs` (Windows Task Scheduler; POSIX cron
line printed as a documented alternative). Not run by this command — a
one-time setup step, not part of the interactive tick.
