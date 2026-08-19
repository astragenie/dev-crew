---
target: hero-crew
date: 2026-06-10
status: superseded-by-feat-191
priority: P1
related:
  - reverses: 2026-06-07 devcrew:lead decommission in loop CLAUDE.md
  - loop-side change: src/scripts/lib/slice-linker/dispatch.mts (added orchestratorMode: "lead")
resolved: 2026-06-12
resolved_by: >-
  FEAT-191 / SLICE-107 dropped `lead` and `direct-builder` as loop-side
  orchestrator modes (v0.43) for documented cause — `lead` mode
  suffered persistent specialist-pause across SLICE-97/98/99/101/102/103/104.
  This request asked hero-crew to route MORE surfaces (`/devcrew:build`,
  `/devcrew:validate`, `/devcrew:fix`) through `devcrew:lead`; that direction is
  now reversed on the loop side. See CLAUDE.md "Orchestrator mode" for
  the current `slice-build` / `orchestrate-slice` contract. Do not
  re-open this request without first re-litigating the lead-pause
  root cause that motivated FEAT-191.
---

# Restore devcrew:lead as orchestrator in /devcrew:build, /devcrew:validate, /devcrew:fix

> **Superseded 2026-06-12 by FEAT-191.** Loop-side `lead` orchestrator
> mode was removed for documented cause (persistent specialist-pause).
> This request is closed — see `resolved_by` above and CLAUDE.md
> "Orchestrator mode". If the upstream lead-pause issue is ever fixed
> in hero-crew, file a fresh request rather than reopening this one.

## Context

The loop plugin previously decommissioned `devcrew:lead` (2026-06-07) and
routed slice-start directly to `devcrew:fullstack-dev`. As of 2026-06-10 the loop
side has reversed this: `/runner:slice start` now emits a `Dispatch
devcrew:lead subagent` instruction by default (configurable via
`config.loop.orchestratorMode` in `.claude/loop.json`).

For consistency, the crew slash flows `/devcrew:build`, `/devcrew:validate`,
and `/devcrew:fix` should also route through `devcrew:lead` as orchestrator
rather than directly invoking the builder / validator specialist.

## Ask

Update the hero-crew plugin so the following commands emit a
`Dispatch devcrew:lead subagent...` instruction by default:

- `/devcrew:build` — currently dispatches `devcrew:fullstack-dev` directly for
  feature work; should route through `devcrew:lead` so lead can run the
  full ceremony (architect → builder → reviewer → validator → synthesis).
- `/devcrew:validate` — currently dispatches `devcrew:verifier` directly;
  should route through `devcrew:lead` for non-trivial validation work
  (or remain direct for simple gate runs — operator choice).
- `/devcrew:fix` — currently dispatches builder + reviewer in a fix loop;
  should route through `devcrew:lead` so lead can sequence the fix +
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

- `/devcrew:build`, `/devcrew:validate`, `/devcrew:fix` default to dispatching
  `devcrew:lead` when no `--mode` override is given.
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
