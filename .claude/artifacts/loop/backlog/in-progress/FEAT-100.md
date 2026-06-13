---
id: FEAT-100
status: in-progress
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: [SLICE-117]
derived_from: null
composite_score: 6
source_competitors: [superpowers]
autonomous_safe: false
tags: [session-init, hooks, context-injection]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
triage_notes: "Composite 6. SessionStart hook that injects bootstrap context before any user turn. Near-exact duplicate of FEAT-132. hooks/hooks.json and hooks/session-start already exist in the repo (referenced in FEAT-100). The gap is a loop-specific injection of CLAUDE.md rules at session start. Medium-high strategic alignment — SLICE-81 grade shows context loss risk in long sessions. autonomousSafe: false — modifying hooks/ affects every session; needs architect review for safe injection."
github_issue: 176
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/176"
started_at: 2026-06-13
---
# FEAT-100: SessionStart hook that injects bootstrap context before any user turn

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- superpowers

## Description

Superpowers uses a SessionStart hook to inject the full using-superpowers skill content before the first user message, ensuring rules are present even after context compaction. loop/crew rely on CLAUDE.md being read at session start, which is less reliable in long or compacted sessions.

## PM Scoring

```json
{
  "featureId": "FEAT-100",
  "scores": {
    "customer_impact": 0.45,
    "effort_estimate": 0.40,
    "strategic_alignment": 0.70,
    "technical_risk": 0.35,
    "dependency_depth": 0.10
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from superpowers audit. Context compaction in long sessions (marathonMode: true) is a real risk; hooks/ directory already exists in the repo.",
  "scopeNotes": "Near-exact duplicate of FEAT-132. The hooks/ directory already exists. Minimum: add a session-start hook entry to hooks/hooks.json that injects a compact loop rules summary (not the full CLAUDE.md). Must keep injection small to avoid consuming context budget.",
  "risks": [
    "Near-exact duplicate of FEAT-132",
    "Injecting full CLAUDE.md at every session start would consume significant context budget",
    "hooks/hooks.json changes affect every Claude Code session — blast radius is wide",
    "Interaction with Claude Code's native MEMORY.md injection needs to be understood"
  ],
  "reasoning": "P2: real session-compaction risk in marathonMode; hooks/ infrastructure exists; but full injection risks context budget overconsumption."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- hooks/session-start, hooks/hooks.json

## Consider rejecting because

Near-exact duplicate of FEAT-132. Claude Code already reads CLAUDE.md at session start natively. A redundant injection via hooks could double the context cost of loading project rules. If the concern is long-session context compaction, a more targeted solution would be a compact loop-rules-summary.md (< 200 tokens) rather than the full CLAUDE.md.
