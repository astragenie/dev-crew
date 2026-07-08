---
id: FEAT-231
status: pending
priority: P2
category: architecture
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: [FEAT-188, FEAT-219]
slices: []
derived_from: null
tags: [concern:memory, concern:dispatch, surface:plugin, stack:typescript]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Debt from v0.64.0 architect design review (2026-07-08, .claude/artifacts/crew/reviews/20260708T081707Z-...design...md, finding #2). After FEAT-188 S3b, TWO recall transports coexist by design: slice-start builder recall uses the shared @astragenie/astramem-client recallSilent + formatRecallBlockV1 (#366), while the reviewer/validator memory-context path (buildMemoryContext, #347) still uses the legacy CLI-spawn recallPrior (memory-recall.mts). Both live, fail-open, tested — but convergence is incomplete. Converge the reviewer/validator surface onto recallSilent so there is ONE recall transport. Cross-module + touches dispatch prompts -> needs_contract, NOT autonomous_safe."
---
# FEAT-231: converge reviewer/validator recall onto the shared recallSilent transport

## Problem

The v0.64.0 memory-transport unification (FEAT-188) resolved "one memory home or
two" in favor of ONE canonical provider — but the RECALL read-path is not yet
fully converged. Two transports coexist:

1. **slice-start builder recall** — `runRecallHook` (`start-slice.mts`) →
   `@astragenie/astramem-client`'s `recallSilent` + `formatRecallBlockV1`
   (frozen `recall-injection-v1` contract, #366).
2. **reviewer/validator recall** — `buildMemoryContext`
   (`post-builder-fanout.mts:97`, #347) → `recallPrior` (`memory-recall.mts`,
   the legacy CLI-spawn transport) folded in as an optional source.

Both are live, fail-open, and tested, so this is not a defect — but the legacy
`recallPrior` CLI-spawn path lingering on the reviewer/validator surface is
latent drift: two code paths that must be kept in behavioral sync, and a second
transport that dev-team#172's decision ("plugin/MCP is the single transport")
meant to retire.

## Goal

Route the reviewer/validator memory-context recall through the same
`recallSilent` shared-client transport slice-start uses, so there is exactly ONE
astramem recall transport across every dispatch surface. `memory-context.mts`'s
rank/lessons/decisions local readers stay; only its astramem source
(`recallPrior`) swaps to `recallSilent`.

## Acceptance criteria

- AC-1: GIVEN `buildMemoryContext` folds an astramem source, WHEN it recalls,
  THEN it calls `@astragenie/astramem-client`'s `recallSilent` (not
  `recallPrior`/`memory-recall.mts`).
- AC-2: GIVEN memory is off or the daemon is unreachable, WHEN `buildMemoryContext`
  runs, THEN it stays fail-open (byte-identical / non-astramem portion only),
  matching today's behavior — asserted by the existing memory-context tests.
- AC-3: GIVEN the convergence lands, WHEN grepping the dispatch path, THEN
  `recallPrior` has no remaining caller on a live dispatch surface (only its own
  module + any explicitly-retained CLI entry point).
- AC-4: A DEC-* records the single-recall-transport decision.
- AC-5: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Risks / open questions

- `recallSilent`'s response shape (`{ hits }`) vs `recallPrior`'s `RecallResult[]`
  — `memory-context.mts` may need a small adapter; keep the block format it emits
  unchanged.
- Whether `memory-recall.mts`/`recall-injector.mts` become fully dead after this
  (see FEAT-232) — sequence so the dead-code removal follows convergence.

## Refs

- Architect review: `.claude/artifacts/crew/reviews/20260708T081707Z-review-result-feat-188-memoryprovider-capture-recall-design-pre-implementa.md` (finding #2).
- `src/scripts/lib/memory-context.mts` (`recallPrior` source), `post-builder-fanout.mts:97`.
- `src/scripts/lib/slice-linker/start-slice.mts` (`runRecallHook` → `recallSilent`, the target pattern).
- `docs/contracts/recall-injection-v1.md` (dev-team, frozen).
