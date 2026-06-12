---
target: hero-crew
date: 2026-06-10
status: open
priority: P1
related:
  - reverses: 2026-06-07 crew:lead decommission in loop CLAUDE.md
  - loop-side change: src/scripts/lib/slice-linker/dispatch.mts (added orchestratorMode: "lead")
---

# Restore crew:lead as orchestrator in /crew:build, /crew:validate, /crew:fix

## Context

The loop plugin previously decommissioned `crew:lead` (2026-06-07) and
routed slice-start directly to `crew:fullstack-dev`. As of 2026-06-10 the loop
side has reversed this: `/loop:slice start` now emits a `Dispatch
crew:lead subagent` instruction by default (configurable via
`config.loop.orchestratorMode` in `.claude/loop.json`).

For consistency, the crew slash flows `/crew:build`, `/crew:validate`,
and `/crew:fix` should also route through `crew:lead` as orchestrator
rather than directly invoking the builder / validator specialist.

## Ask

Update the hero-crew plugin so the following commands emit a
`Dispatch crew:lead subagent...` instruction by default:

- `/crew:build` — currently dispatches `crew:fullstack-dev` directly for
  feature work; should route through `crew:lead` so lead can run the
  full ceremony (architect → builder → reviewer → validator → synthesis).
- `/crew:validate` — currently dispatches `crew:verifier` directly;
  should route through `crew:lead` for non-trivial validation work
  (or remain direct for simple gate runs — operator choice).
- `/crew:fix` — currently dispatches builder + reviewer in a fix loop;
  should route through `crew:lead` so lead can sequence the fix +
  re-review + re-validate cycle.

Each command should accept an `orchestratorMode` override (matching the
loop plugin's option: `"lead" | "orchestrate-slice" | "direct-builder"`)
read from `.claude/loop.json` so operators can pin a non-default mode
per-repo.

## Why now

- Lead orchestration is the canonical multi-specialist pattern; direct
  dispatch from main thread reads as a downgrade for non-trivial slices.
- Consistent UX: loop and crew should both default to lead when the
  installed crew version supports it.
- Lead carries the synthesis + escalation responsibility; routing
  through it preserves the audit-trail (final-synthesis artifact, cost
  attribution, slice-progress dashboard) that direct dispatch skips.

## Acceptance criteria

- `/crew:build`, `/crew:validate`, `/crew:fix` default to dispatching
  `crew:lead` when no `--mode` override is given.
- `--mode=direct-builder` (or equivalent) preserves the current
  direct-specialist behavior for operators who pin it.
- A short note in `hero-crew/CHANGELOG.md` documents the routing change
  and any compat shim for older loop consumers.

## Loop-side coordination

When this lands, the loop plugin will:

1. Bump `MIN_CREW_VERSION` in `src/scripts/lib/plugin-identity.mts` to
   the hero-crew release that ships this change.
2. Drop the `useOrchestrateSlice` boolean fallback in
   `src/scripts/lib/slice-linker/start-slice.mts` (or relegate it to
   `direct-builder` mode only).
3. Update `docs/halt-badges.md` and CLAUDE.md to reference the unified
   lead-orchestrator contract across both plugins.

## Notes

This request reverses the 2026-06-07 decommission documented in the
prior `CLAUDE.md` "Decommissioned roles" block. The decommission was
removed in loop@unreleased; see CHANGELOG.md under "Unreleased".
