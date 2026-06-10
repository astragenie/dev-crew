---
id: FEAT-179
status: pending
priority: null
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
---
# FEAT-179: Decay-ranked, citation-tracked learnings retrieval injected at builder dispatch

Adopt AgentOps decay-ranked retrieval (schemas/learning.v1.schema.json, docs/wiki-for-agents.md in C:/work/mega/agentops): learning confidence decays ~10%/week at READ time (timestamp multiplier, no daemon); every retrieval is appended to a citations ledger (citations.jsonl); utility scores update from outcomes (+1 when the consuming slice's review/validation passes, -2 on fail). Retrieval returns the top items trimmed to ~1000 tokens.

## Acceptance hints
- Extend learnings store entries with confidence, utility_score, last_cited_at; decay applied on load.
- `loop lessons rank [--query <slice title>]` returns decay*utility-ranked top-N; slice start embeds them into dispatchInstruction (replacing/augmenting loop:lessons-recent's naive last-N).
- Citations appended to .claude/artifacts/loop/citations.jsonl with sliceId + learning ids; grade-write updates utility from the slice's review/validation outcome.
- Token budget cap on the injected block (~1000 tokens).