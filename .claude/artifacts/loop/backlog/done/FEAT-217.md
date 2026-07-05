---
id: FEAT-217
status: done
priority: P2
category: memory
target_release: null
created: 2026-07-03
updated: 2026-07-03
depends_on: []
slices: []
derived_from: null
tags: [memory, telemetry, backend]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: 2026-07-03
triage_notes: "Operator-requested. Generalize the runner:close decision mirror (FEAT-216 follow-up) into a reusable memory-sink: every decision/lesson/note flows to astramem when memory is enabled, via the existing astramem CLI shim (fire-and-forget, fail-silent)."
completed_at: 2026-07-03
---
# FEAT-217: memory-sink — mirror every decision / lesson / note to astramem

## Origin

Follow-up to the FEAT-216 `runner:close` astramem choke-point. That mirror
was prompt-level (an instruction in `commands/close.md`). Operator asked for
a real code feature: whenever a decision is made or a lesson is learned,
check whether memory is enabled and, if so, call the matching astramem
command to add a note / learning / decision.

## Goal

A single reusable module that any close/learn/decision path can call. It:

1. Reads `memory.enabled` from `.claude/loop.json`. **Opt-in**: an absent
   `memory` block (or absent `enabled`) is OFF, so unconfigured repos and every
   test temp-repo stay silent. `off`/`never`/`disabled`/`false` → off;
   `on`/`always`/`true` → enabled (needs CLI to send); `auto` → enabled when the
   astramem CLI resolves.
2. Resolves the cortex **project id from customer config** — explicit
   `memory.project` override wins, else the repo's `productName` (no hardcoded
   default) — for cross-repo traceability.
3. When enabled and the astramem CLI resolves, spawns
   `astramem remember --content <text> --type <decision|lesson|note> [--project <p>]`
   fire-and-forget, 2s-capped, fail-silent (never throws, never blocks the
   caller) — mirroring the existing `memory-bridge.mts::emit` shim. FEAT/SLICE
   ids are embedded in the content as a `[FEAT-x/SLICE-y]` trace tag.
4. Exposes typed helpers `recordDecision`, `recordLesson`, `recordNote`.

## Wiring (choke points)

- **Decision made** — `grade-writer.mts::extractDecisions`, right after each
  new `DEC-*.md` is written → `recordDecision`.
- **Lesson learned** — `learnings.mts::logLearning` (the `runner:learn`
  store write) and slice-close `lessons_learned` frontmatter → `recordLesson`.
- **Note** — `recordNote` exposed for ad-hoc callers.

## Acceptance criteria

- AC-1: When `memory.enabled` is `off`/`never`/`false`, `recordMemory` no-ops
  without resolving or spawning the CLI (returns `{recorded:false, reason:"disabled"}`).
- AC-2: When enabled but the CLI does not resolve, no-op
  (`{recorded:false, reason:"no-cli"}`) — never throws.
- AC-3: When enabled and the CLI resolves, spawns
  `astramem remember --content <text> --type <kind>` (+ `--project` when
  configured); arg round-trip verified via a capturing fake CLI.
- AC-4: `--content` is sanitized (control chars stripped) and never contains a
  bearer/secret — callers pass decision/lesson text only.
- AC-5: Fail-silent + ≤2s cap even when the CLI hangs (mirrors `emit`).
- AC-6: `extractDecisions` calls `recordDecision` once per newly-allocated
  decision; `logLearning` calls `recordLesson` once per new learning.
- AC-7: Opt-in default — no `memory` block → `off` → no CLI resolution/spawn;
  no regression to grade-write / learn paths (their temp-repo tests stay silent).
- AC-8: Project id derives from `memory.project` (override) else `productName`;
  FEAT/SLICE ids embedded in the recorded content for traceability.

## Refs

- FEAT-216 (parent close-mirror), DEC-064.
- `src/scripts/lib/memory-bridge.mts` (`resolveCli`, `emit` shim to reuse).
- `src/scripts/lib/grade-writer.mts` (`extractDecisions`, `emitSliceCloseMemory`).
- `src/scripts/lib/learnings.mts` (`logLearning`).
