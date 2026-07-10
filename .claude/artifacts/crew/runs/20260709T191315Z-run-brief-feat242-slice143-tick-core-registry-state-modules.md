---
status: active
---
# Run Brief: FEAT242 SLICE143: Tick core + registry/state modules

- Created: 2026-07-09T19:13:15.273Z
- Tier: full
- Goal: Watcher MVP: deterministic tick + registry/state + scheduler setup (Track B1). Implement watch-tick.mts (pure Bun, zero LLM) run by OS scheduler every ~5 min: sweep assigned shard from ~/.claude/watch/repos.json registry (gh issue list delta, gh run list --status failure, open-PR statusCheckRollup), set claim label + timestamped state entry BEFORE spawning headless claude -p reactions (intake --from-issue / pr-fix / crew:fix), enforce machine-wide reaction concurrency cap (default 3) + cost ceil
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - bullet 1
- Out Of Scope: -
- Planned Files: -
- Next Step: Begin implementation

