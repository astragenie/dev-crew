---
status: active
---
# Run Brief: FEAT242 SLICE146: Scheduler setup script + /runner:watch command

- Created: 2026-07-10T00:09:08.819Z
- Tier: full
- Goal: Watcher MVP: deterministic tick + registry/state + scheduler setup (Track B1). Implement watch-tick.mts (pure Bun, zero LLM) run by OS scheduler every ~5 min: sweep assigned shard from ~/.claude/watch/repos.json registry (gh issue list delta, gh run list --status failure, open-PR statusCheckRollup), set claim label + timestamped state entry BEFORE spawning headless claude -p reactions (intake --from-issue / pr-fix / crew:fix), enforce machine-wide reaction concurrency cap (default 3) + cost ceil
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - [ ] AC-1: Given a registry (`~/.claude/watch/repos.json`) with N repo entries assigned to this machine's shard
  - When `watch-tick.mts` runs
  - Then it sweeps every assigned entry (`gh issue list` delta / `gh run list --status failure` / open-PR `statusCheckRollup`) and exits without invoking any LLM call — evidenced by a unit test asserting zero `claude -p` spawns during a quiet tick plus a per-repo sweep-count assertion. (source: 2026-07-07-watcher-acs-eta.md AC-1
  - B1 section)
- Out Of Scope: -
- Planned Files: -
- Next Step: Begin implementation

