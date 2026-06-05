---
feature: FEAT-047
phase: null
autonomous_safe: false
status: completed
completed_at: 2026-06-05
updated: 2026-06-05
---
# SLICE-44: Wire /crew:orchestrate-slice as default dispatchInstruction

## Objective

When slice-start emits a dispatchInstruction, route through `/crew:orchestrate-slice` when installed crew >= 0.10.0; fall back to legacy crew:builder dispatch otherwise.

## Acceptance criteria

- [ ] AC-1: dispatchInstruction references `/crew:orchestrate-slice --id SLICE-NN` when crew >= 0.10.0
- [ ] AC-2: ORCHESTRATE_SLICE_MIN_CREW_VERSION constant = "0.10.0" in plugin-identity.mts
- [ ] AC-3: falls back to crew:builder dispatch when crew < 0.10.0
- [ ] AC-4: slice-start tests updated/extended to cover new dispatch shape
- [ ] AC-5: dispatch.mts updated to route through orchestrate-slice when version guard passes

## In scope

- src/scripts/lib/plugin-identity.mts — add ORCHESTRATE_SLICE_MIN_CREW_VERSION + checkOrchestrateSliceSupport
- src/scripts/lib/slice-linker/dispatch.mts — buildOrchestrateSliceInstruction + routing
- src/scripts/lib/slice-linker/start-slice.mts — wire version check + propagate useOrchestrateSlice
- src/tests/slice-start.test.mts — update + extend tests

## Out of scope

- Changes to crew plugin itself
- UI or CLI surface changes
