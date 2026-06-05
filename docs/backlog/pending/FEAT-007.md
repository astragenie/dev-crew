---
id: FEAT-007
status: pending
priority: P0
category: workflow
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
---
# FEAT-007: Wire /crew:orchestrate-slice as default dispatchInstruction in slice-start

## Description

When the autonomous loop starts a slice via `/loop:slice start --id SLICE-NN`, it
currently emits a generic `dispatchInstruction` telling the lead to run `/crew:build`.
Now that hero-crew ships `/crew:orchestrate-slice` (FEAT-040, merged 2026-06-05), the
loop should emit that command instead — so the full tag-driven specialist ladder
(architect → uxdesigner → builder → reviewer → validator → copywriter → doc-writer)
fires automatically without manual lead assembly.

## Acceptance hints

- `slice-start` output `dispatchInstruction` reads `/crew:orchestrate-slice --id SLICE-NN`
  (or equivalent invocation) instead of `/crew:build`
- `MIN_CREW_VERSION` guard in dispatch logic bumped to the hero-crew release that
  ships `/crew:orchestrate-slice` (≥0.10.x; confirm exact tag at implementation time)
- If the installed crew version is below `MIN_CREW_VERSION`, fall back gracefully
  to the existing `/crew:build` dispatch with a warning in the instruction text
- Existing slice-start tests updated / extended to cover the new dispatch shape
- `dispatch.mts` (or equivalent dispatch wiring) updated to route through
  orchestrate-slice when version guard passes

## Notes

- Implementation reference: hero-crew `commands/orchestrate-slice.md` (commit `622d6be`,
  fixes in `6eda281`). Full step ladder and classification logic documented there.
- hero-crew version that ships the command: check `marketplace.json` at implementation
  time — the command landed on `main` but no release tag cut yet. Pin once tagged.
- Plan B from hero-crew session 2026-06-05: update `loop/commands/slice-start.md`,
  `loop/src/scripts/lib/slice-linker/dispatch.mts`, bump `MIN_CREW_VERSION`.
- `autonomous_safe` should be set during triage — dispatch wiring is mechanical but
  touches the loop's critical path; human review recommended.
