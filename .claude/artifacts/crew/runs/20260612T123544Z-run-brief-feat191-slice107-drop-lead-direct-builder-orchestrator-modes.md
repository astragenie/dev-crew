---
feature: FEAT-191
status: active
---
# Run Brief: FEAT191 SLICE107: Drop lead + direct-builder orchestrator modes — slice-build becomes default (FEAT-191)

- Created: 2026-06-12T12:35:44.473Z
- Tier: full
- Goal: -
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/dispatch.mts`:
  - `OrchestratorMode` union drops `"lead"` and `"direct-builder"`. Final shape: `"slice-build" | "orchestrate-slice"`.
  - `resolveOrchestratorMode` defaults to `"slice-build"` (was `"lead"`).
  - `buildDispatchInstruction` `mode === "lead"` branch removed. `buildLeadOrchestratorInstruction` deleted along with its helpers if unused.
  - `direct-builder` fallthrough branch removed — `slice-build` becomes the only fallthrough.
- `src/scripts/lib/slice-linker/start-slice.mts`:
  - `resolveOrchestratorModeConfig` accepts only `"slice-build"` and `"orchestrate-slice"`. Falls back to `"slice-build"`.
  - All `orchestratorMode: OrchestratorMode = "lead"` defaults flipped to `"slice-build"`.
  - `nextAction` messages no longer reference `crew:lead`.
- Out Of Scope:
  - - Keeping `lead` as opt-in (decision is removal).
- Reviving the lead path once hero-crew fixes specialist-pause (separate FEAT if/when needed).
- Touching crew-side agents (lead is still a real agent in crew; this slice removes loop's dispatch path to it
  - not the agent itself).
- Planned Files: -
- Next Step: Begin implementation

