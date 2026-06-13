---
feature: FEAT-165
status: active
---
# Run Brief: FEAT165 SLICE115: Per-skill cost attribution

- Created: 2026-06-13T08:52:48.566Z
- Tier: full
- Goal: Extend cost-advisor to bucket `auto-dispatch.jsonl` spend by `skill_name` and surface a top-N report mode with delta from 4-week baseline via `loop brief --cost-by-skill`.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Aggregator that reads `auto-dispatch.jsonl` and groups entries by `skill_name`
- Report mode: top-N skills by 4-week average USD + delta from baseline (current week vs 4-week avg)
- `--cost-by-skill` flag wired into `bun src/scripts/loop.mts brief`
- Unit tests: aggregator over synthetic jsonl
  - delta calculation
  - output formatter snapshot
- Out Of Scope:
  - - Real-time cost alerts (next slice)
- Per-agent-role attribution (skill_name only for this slice)
- Planned Files: -
- Next Step: Begin implementation

