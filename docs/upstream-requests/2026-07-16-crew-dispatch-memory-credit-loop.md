# Upstream request — dev-team: dispatch-time memory digest + credit loop

- **Date:** 2026-07-16
- **From:** runner-plugin (loop layer)
- **To:** dev-team (crew plugin) — dispatch-assembly surfaces
  (`/devcrew:build`, `/devcrew:fix`, `orchestrate-slice`, subagent preamble assembly)
- **Status:** open
- **Design record:** runner-plugin
  `.claude/artifacts/crew/runs/20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`

## Problem

Crew agents were wired to astramem via the `using-memory` skill (crew v0.76.0),
which relies on the subagent voluntarily calling `agent_profile` / `recall_memory`
/ `submit_feedback`. Measured result on the live daemon (2026-07-16, 7-day
window): **634 memories served, 4–5 credited (~0.7%)**. With the ADR-010
usefulness signal starved at its 0.5 default, astramem's fusion ranking degrades
to near-pure text similarity, and stale/noise atoms outrank real lessons.
Voluntary crediting is a proven dead end (same conclusion as the earlier
memory-integration review: retrieval and crediting need an
orchestrator-controlled path, not a voluntary subagent action).

Runner-side slice ceremonies cannot fix this alone: most crew dispatches never
pass through `/devcrew:start` (direct `/devcrew:build`, `/devcrew:fix`,
`orchestrate-slice`, ad-hoc `Agent()` calls).

## Ask

At dispatch-assembly time (parent/orchestrator thread), for owned specialist
agents:

1. **Inject a recall digest into the dispatch prompt** — `agent_profile`
   (corrections first) + `recall_memory` scoped by `project` + `agent`, k≤5,
   each entry carrying its memory `id`. Plain prepended prompt text; no schema
   change to any dispatch contract.
2. **Extend the handoff convention with an optional `memories_used: [ids]`
   field** — the subagent lists ids it actually relied on. Optional: absent
   field = credit nothing; never validated/gated.
3. **Credit on receipt** — the orchestrator that consumes the handoff calls
   `submit_feedback` for each reported id.

## Constraints (hard)

- **Warm connection only:** run recall/credit from the parent session's live
  MCP connection. One-shot cold clients hit astramem-local#343 (multi-second
  cold penalty → timeout → empty profile). Do not shell out per call.
- **Fail-silent, bounded:** any daemon error/timeout → skip silently. Memory
  must never block, delay, or fail a dispatch, gate, or ceremony.
- **Shared seam:** go through `@astragenie/astramem-client` (plugins-common);
  do not hand-roll daemon resolution. Note astramem-local#341: the package's
  `daemon-client.remember()` still nests project/agent under metadata — the
  read path used here is unaffected, but avoid copying its write pattern.
- **Off-switch:** respect a config kill-switch equivalent to runner's
  `memory.enabled: "never"`.

## Division of labor

- dev-team (this ask): per-dispatch inject + credit — covers every dispatch
  path regardless of loop ceremony.
- runner-plugin (Phase 3b, in progress): slice-close batch credit weighted by
  slice outcome (skip crediting on FAIL), telemetry in loop snapshot.
- Contract between plugins is only the optional handoff field.

## Acceptance signal

Daemon `/health` `usefulness.rate_7d` climbs off ~0.7% toward >10% under
normal crew traffic; `agent_profile` top_lessons for crew roles show
usefulness values ≠ 0.5.
