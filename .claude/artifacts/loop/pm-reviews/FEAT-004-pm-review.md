---
id: PM-REVIEW-FEAT-004
feature: FEAT-004
reviewed_at: 2026-08-18
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.65
pm_dependency_depth: 0.75
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-004

## Demand Assessment

- **Evidence:** unification-plan.md section 2, verbatim: 'Result: 39 first-party + 1 vendored... No TBD cells; every parent command dispositioned above.' and the risk register row: 'Agent-cap CI red on day one -- 4 dev-team agents exceed runner's 300-line cap.' Concrete, already-measured evidence the merge will break a CI gate on day one absent this FEAT.

## Scope Challenge

- **Scope notes:** Effort: plan states 5-7 slices for P3 -> pm_effort_estimate 0.65 falls in [0.6,0.85) -> effort_points=8, triggering the MANDATORY decomposition gate (FEAT-168). Landmines isolated per runner#393 rule (a): the 3-agent merge (document-writer/researcher/architect) needs behavioral judgment on which parent's variant wins per case, the hook-consolidation perf gate (<=150ms measured) is a design-sensitive spike, and the models.yaml/model-router merge is explicitly called out in the plan's own text as 'a real design merge (single model-tier source)... not mechanical dedupe' -- each gets its own slice, never folded into the mechanical command-map/dispatch-token-rewrite batch. No cost analog (dev-crew has zero history).

## Scores

- customer_impact: 0.55
- effort_estimate: 0.65
- strategic_alignment: 0.80
- technical_risk: 0.65
- dependency_depth: 0.75

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: 8-point epic (mandatory decomposition, 2-point cap per runner#393) covering the full command/agent/skill/hook surface; technical_risk banded 0.65 (cross-module reach across the whole surface, but the individual changes are mostly mechanical rename/dedupe with clean git-revert rollback -- kept below the 0.9+ band since nothing here is a schema or cross-plugin contract change); autonomousSafe=false given the dependency chain (3 unresolved predecessor phases) and the already-measured day-one CI-red risk from the agent-cap row.

## Risks

- Pre-mortem Q1: most likely failure is the agent-map merge (document-writer/researcher/architect) silently dropping a behavior one parent had and the other didn't -- e.g. crew:document-writer's slice-close CLI sequence (write-final-synthesis + slice complete + slice grade) not surviving the merge into the unified devcrew:document-writer.
- Pre-mortem Q2: rollback is a plain git revert for the mechanical command/token-rewrite batches (no stored state changes), but the hooks-consolidation change needs a targeted revert of hooks.json plus re-verification of the <=150ms measurement -- a partial revert that leaves some hooks matcher-scoped and others not could reintroduce the ~540ms/Bash-call overhead silently.
- Pre-mortem Q3: no existing test asserts 'every crew:X/runner:X dispatch token in every owned .md resolves to a devcrew: name' -- validate-agent-refs today only scans CLAUDE.md per the plan's own risk-register row ('validate-agent-refs extended to scan ALL owned .md + templates, not just CLAUDE.md'); until that extension lands, a rename-phantom in an agent or skill file (not CLAUDE.md) would not be caught.
- Blocked by FEAT-001, FEAT-002, FEAT-003 (P0-P2) -- surface merge assumes a unified runtime and a de-seamed bridge already exist; running P3 early would mean rewriting dispatch tokens for code that still imports the old crew-bridge.
