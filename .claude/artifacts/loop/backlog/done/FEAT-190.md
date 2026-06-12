---
id: FEAT-190
status: done
slices_complete: [SLICE-104, SLICE-105, SLICE-106]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: [SLICE-104, SLICE-105, SLICE-106]
derived_from: null
autonomous_safe: false
tags: [workflow, orchestrator, dispatch]
needs_contract: true
needs_ux: false
effort_points: 8
proposed_slices:
  - id_suffix: -SLICE-1
    title: slice-build mode — single-variant routing from tags
    points: 3
  - id_suffix: -SLICE-2
    title: slice-build mode — parallel fe+be fanout for fullstack slices
    points: 3
  - id_suffix: -SLICE-3
    title: slice-build mode — architect pre-flight when needs_contract is true
    points: 2
pm_customer_impact: 0.7
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.85
pm_technical_risk: 0.55
pm_dependency_depth: 0.3
composite_score: 0.62
composite_priority: P1
triage_notes: "Builder routing unification. Three existing modes (lead / orchestrate-slice / direct-builder) plus the persistent lead-pause pattern (witnessed SLICE-97/98/99/101/102/103 across two sessions) motivate one tag-driven mode that emits the right builder variant. Effort 8 because cross-cutting (start-slice + dispatch + walker + tests + docs), risk 0.55 because dispatchInstruction shape is observed cross-plugin by crew and orchestrate-slice consumers. proposed_slices decomposes into routing → fanout → contract pre-flight so each slice ships in ≤ 1 session."
github_issue: 223
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/223"
started_at: 2026-06-12
---
# FEAT-190: slice-build orchestrator mode — pick builder variant from slice tags

## Problem

Three current orchestrator modes (`lead`, `orchestrate-slice`, `direct-builder`) each have failure modes:

- **`lead`**: agent-led, isolated, but the lead specialist-pause pattern keeps biting (paused before/during fanout on SLICE-97, SLICE-98, SLICE-99, SLICE-101, SLICE-102, SLICE-103 — six slices in two sessions). Operator routinely bypasses lead and drives inline.
- **`orchestrate-slice`**: slash-flow, sequential, no agent isolation. Works but no parallelism on fullstack slices.
- **`direct-builder`**: emits `crew:fullstack-dev` regardless of slice's actual surface. Frontend-only slices pay fullstack-dev's broader context cost; backend-only slices ditto. No data-driven routing.

Slice tags (`fe`, `be`, etc.) already exist via `/loop:backlog-enrich`. Nothing reads them at dispatch time.

## Proposal

New `orchestratorMode: "slice-build"`. At dispatch time, read slice frontmatter `tags` and pick the right builder variant:

| Slice tags | Dispatch |
|---|---|
| `fe` only | `crew:frontend-dev` |
| `be` only | `crew:backend-dev` |
| `fe` AND `be` | parallel: `crew:frontend-dev` + `crew:backend-dev` (one Agent message, two tool calls) |
| neither (no surface tag) | `crew:fullstack-dev` (current fallback) |

When slice has `needs_contract: true` AND no architect artifact exists for the slice, dispatch `crew:architect` BEFORE the builder(s). Contract artifact gates the builder dispatch — same pattern lead uses today.

Legacy modes (`lead`, `orchestrate-slice`, `direct-builder`) all remain for back-compat. `slice-build` is opt-in via config.

## Decomposition

Per the FEAT-168 / Framework 6 decomposition rule, `effort_points: 8` carries a `proposed_slices` block in the frontmatter above. Three sub-slices:

1. **SLICE-1 (3 points)**: `slice-build` mode value accepted in config; tag-driven single-variant routing emitted in `buildDispatchInstruction`. Default fallback `crew:fullstack-dev` when tags neither / both / missing. No fanout yet, no architect pre-flight. Tests pin the tag-to-variant mapping.
2. **SLICE-2 (3 points)**: parallel fanout for `fe` AND `be` tagged slices. `buildDispatchInstruction` returns a structured payload the orchestrating agent can use to issue ONE Agent message with TWO tool calls (frontend-dev + backend-dev). Tests pin the parallel dispatch shape.
3. **SLICE-3 (2 points)**: contract pre-flight. When `slice.needs_contract: true` AND no `.claude/artifacts/crew/contracts/` artifact exists for the slice, the dispatch instruction prepends an architect dispatch step. Tests pin both the gate and the bypass when contract artifact already exists.

## Acceptance criteria (FEAT-level)

**AC-1: New config value `"slice-build"`.** `config.loop.orchestratorMode` accepts `"slice-build"` alongside the three existing values. `resolveOrchestratorModeConfig` returns it verbatim; schema validation accepts it.

**AC-2: Tag-driven single-variant routing.** When `orchestratorMode === "slice-build"` AND slice frontmatter has `tags: ["fe"]` (no `"be"`), `buildDispatchInstruction` emits a prompt starting `Dispatch crew:frontend-dev subagent`. Symmetric for `tags: ["be"]` → `crew:backend-dev`. Tests cover both directions + the no-tags fallback to `crew:fullstack-dev`.

**AC-3: Parallel fanout for fe + be slices.** When tags include BOTH `fe` AND `be`, the dispatch instruction returns a structured payload listing two parallel dispatches. Orchestrating agent (caller) issues ONE Agent tool message with TWO tool calls. Tests verify the payload shape.

**AC-4: Architect pre-flight when needs_contract.** When `slice.needs_contract: true` AND no contract artifact exists at `.claude/artifacts/crew/contracts/<sliceId>-*.md`, the dispatch instruction prepends `Dispatch crew:architect subagent first; await contract artifact; then dispatch builder(s)`. When the contract artifact exists, the architect step is skipped.

**AC-5: Back-compat.** Existing `lead`, `orchestrate-slice`, `direct-builder` modes behave identically. Existing tests pass unchanged.

**AC-6: Docs.** `CLAUDE.md § Orchestrator mode` adds `slice-build` to the documented modes table. `commands/slice-start.md` (or equivalent) mentions tag-routing for `slice-build`. CHANGELOG entry per slice.

## Out of scope

- Removing the legacy modes. They stay until `slice-build` proves out across ≥ 5 slices.
- Auto-flipping to `slice-build` as the default. Stays opt-in for v0.43.
- Wiring orchestrate-slice slash flow to use the same routing (it's a different surface).

## Refs

- `src/scripts/lib/slice-linker/start-slice.mts::resolveOrchestratorModeConfig`
- `src/scripts/lib/slice-linker/dispatch.mts::buildDispatchInstruction`
- `src/scripts/lib/walker-gates.mts` (consumer of dispatch instruction in autoMode)
- CLAUDE.md § Orchestrator mode (mode documentation)
- `docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md` (lead-pause history)
