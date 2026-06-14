---
id: FEAT-179
status: done
priority: P3
category: feature
target_release: 0.49.1
created: 2026-06-10
updated: 2026-06-13
depends_on: [FEAT-178]
slices: [SLICE-130]
derived_from: null
autonomous_safe: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.7
pm_technical_risk: 0.65
pm_dependency_depth: 0.6
composite_score: 0.52
triage_notes: "Decay-ranked retrieval extends FEAT-178: ranking algorithm + citations ledger + grade-outcome feedback loop (+1 pass / -2 fail). Depends on FEAT-178 and a cross-stage utility-update contract -> not autonomous. Defer until FEAT-178 lands."
started_at: 2026-06-13
slices_complete: [SLICE-130]
completed_at: 2026-06-13
github_issue: 270
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/270"
---
# FEAT-179: Decay-ranked, citation-tracked learnings retrieval injected at builder dispatch

Adopt AgentOps decay-ranked retrieval (schemas/learning.v1.schema.json, docs/wiki-for-agents.md in C:/work/mega/agentops): learning confidence decays ~10%/week at READ time (timestamp multiplier, no daemon); every retrieval is appended to a citations ledger (citations.jsonl); utility scores update from outcomes (+1 when the consuming slice's review/validation passes, -2 on fail). Retrieval returns the top items trimmed to ~1000 tokens.

## Acceptance hints
- Extend learnings store entries with confidence, utility_score, last_cited_at; decay applied on load.
- `loop lessons rank [--query <slice title>]` returns decay*utility-ranked top-N; slice start embeds them into dispatchInstruction (replacing/augmenting loop:lessons-recent's naive last-N).
- Citations appended to .claude/artifacts/loop/citations.jsonl with sliceId + learning ids; grade-write updates utility from the slice's review/validation outcome.
- Token budget cap on the injected block (~1000 tokens).
