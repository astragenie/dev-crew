---
id: FEAT-051
status: done
priority: P2
category: feature
target_release: null
created: 2026-06-05
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
external_delta: "Shipped upstream in hero-crew v0.15.0 (commit 3597220, tag v0.15.0). No loop slice required."
completed_at: 2026-06-06
pm_customer_impact: 0.35
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.55
pm_technical_risk: 0.55
pm_dependency_depth: 0.7
composite_score: 0.4675
autonomous_safe: false
triage_notes: "Hard cross-plugin sequencing — hero-crew commands/orchestrate-slice.md edit. AC#5 reconciled with FEAT-050 (contracts artifact = FEAT-ID only; UX spec stays SLICE-scoped). Not autonomous-safe."
---
## Context

Current `/crew:orchestrate-slice` ladder runs strictly sequential:

1. architect → contracts
2. uxdesigner → UX spec (reads contracts)
3. builder → implementation (reads contracts + UX spec)
4. reviewer / validator / copywriter / doc-writer

uxdesigner and builder both consume the architect's contracts but NOT each other's output. They can run in parallel once contracts exist. This roughly halves wall-clock for UX-heavy slices.

User intent: dispatch uxdesigner and builder concurrently from main thread (single message with two Agent tool calls). Builder may read the UX spec when uxdesigner returns it, but does not block on it (UX spec is informational; builder works from contracts + ACs).

## Acceptance criteria

- [ ] `/crew:orchestrate-slice` Step 2 + Step 3 fire in parallel when both NEEDS_UX and BEHAVIOR_CHANGED are true
- [ ] Single user-visible message contains both `Agent(crew:uxdesigner)` and `Agent(crew:builder)` tool calls — they show as concurrent dispatches in the UI
- [ ] Builder prompt references contracts artifact only (not UX spec); reviewer prompt receives BOTH artifacts and checks UX spec conformance separately
- [ ] When only one branch fires (NEEDS_UX=false OR BEHAVIOR_CHANGED=false), behavior reverts to single-thread (no spurious empty Agent call)
- [ ] Race-safety: contracts artifact path computed deterministically from FEAT-ID alone (`.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md`, per FEAT-050 canonical scope) so both subagents read the same file. UX spec artifact remains SLICE-scoped (`<FEAT-ID>-ux-<SLICE-ID>.md`) since UX spec covers one slice's interaction surface.

## Dependencies

- Depends on FEAT-050 (contracts written at FEAT promotion) — without it, architect runs every slice and the serialization is between architect and uxdesigner/builder, not between uxdesigner and builder

## Related

- This is a hero-crew (`commands/orchestrate-slice.md`) change, not a loop change. Track here for traceability; implement upstream.