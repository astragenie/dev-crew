---
id: FEAT-006
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-02
depends_on: []
slices: [SLICE-10]
derived_from: null
composite_score: 7
source_competitors: [Cursor agents]
autonomous_safe: false
triage_notes: no fields needed inference
pm_customer_impact: 0.7
pm_strategic_fit: 0.75
pm_implementation_confidence: 0.55
pm_demand_signal: 0.65
pm_risk_level: 0.55
pm_reasoning: Plan Mode aligns with loop intent but adds user-approval gate touching slice start ceremony — user-visible behavioral contract needs SPEC first
github_issue: 11
github_milestone: 2
phase: 2
started_at: 2026-06-02
completed_at: 2026-06-02
---
# FEAT-006: Plan Mode with codebase-research pre-flight

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

Before writing any code, Plan Mode runs a codebase research pass, asks clarifying questions, generates an editable Markdown plan, and only executes after explicit user approval. Plans can be saved to workspace for team sharing.

## Scoring

- Impact: 2
- Effort: 1
- Fit: 3
- Composite: 7 / 9

## References

- https://cursor.com/docs/agent/plan-mode

## Consider rejecting because

_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_

## Adaptation for autonomous loop (added 2026-06-02)

Vanilla Cursor Plan Mode (research → ask user → wait for approval → execute) directly contradicts the loop's HARD RULE "Run until PASS. Do not stop for confirmation."

Implement as **conditional Plan Mode** keyed on the FEAT's `autonomous_safe` flag (already populated by PM triage):

| Condition | Behavior |
|---|---|
| `autonomous_safe: true` | Research pre-flight runs, plan artifact written, dispatch proceeds automatically (no approval prompt) |
| `autonomous_safe: false` | Research pre-flight runs, plan artifact written, `AskUserQuestion` gate fires, dispatch blocks until user approves |
| `loop:auto` mode active | All gates suppressed regardless of `autonomous_safe`; clarifying questions auto-resolve to default, logged as DEC-TBD for retroactive review |

### In scope of this FEAT

1. Insert "plan" ceremony step between `slice start` and `crew:build` dispatch.
2. Codebase research pass: structured grep + glob + file-read of related modules; results saved as `plan-research-<slice>.md` artifact.
3. Clarifying questions: surface as `AskUserQuestion` when ambiguity score > threshold; auto-resolve in `loop:auto` mode.
4. Editable Markdown plan written to `.claude/artifacts/loop/plans/<slice>-plan.md` — used as resumable checkpoint after compaction.
5. Conditional approval gate (see table above).

### Out of scope

- Persisting plans to a shared workspace (Cursor's team-sharing feature). Defer to FEAT-024 (pluggable task-store) for cross-system sync.
- Plan-vs-implementation drift detection. Separate FEAT.
- Auto-generated test plan from research output. Separate FEAT.

### Why this helps autonomous mode (vs. hurts it)

- Research pre-flight = fewer mid-slice pivots = fewer compactions (last FEAT-006 run cost $52 largely on compaction tax).
- Plan artifact = resumable checkpoint after compaction; agent re-reads plan instead of re-deriving from spec.
- Conditional gate respects existing `autonomous_safe` semantics; doesn't make every slice human-blocking.
