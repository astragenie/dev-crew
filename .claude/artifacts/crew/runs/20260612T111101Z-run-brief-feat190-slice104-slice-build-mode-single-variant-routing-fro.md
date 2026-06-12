---
feature: FEAT-190
status: active
---
# Run Brief: FEAT190 SLICE104: slice-build mode — single-variant routing from tags (FEAT-190 slice-1)

- Created: 2026-06-12T11:11:01.579Z
- Tier: full
- Goal: Add `"slice-build"` as a fourth `orchestratorMode` value. When set, `buildDispatchInstruction` reads slice frontmatter `tags`:  - `tags ⊇ {"fe"}` AND NOT `tags ⊇ {"be"}` → `crew:frontend-dev` - `tags ⊇ {"be"}` AND NOT `tags ⊇ {"fe"}` → `crew:backend-dev` - neither / both / missing → `crew:fullstack-dev` (existing fallback; both case handled here is the "interim" — SLICE-2 wires real parallel fanout)  Tests pin the four-way mapping. No fanout, no architect pre-flight, no docs beyond CHANGELOG.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/dispatch.mts`:
  - `OrchestratorMode` type adds `"slice-build"`.
  - `resolveOrchestratorMode` accepts the new value.
  - `buildDispatchInstruction` switch handles `mode === "slice-build"`:
    - Read slice frontmatter from `sliceContent` (parsed via `parseFrontmatter`).
    - New helper `pickBuilderVariant(tags: unknown): "frontend" | "backend" | "fullstack"`.
    - New helper `buildSliceBuildInstruction(sliceId
  - title
  - rel
  - variant
  - ...)` emits the dispatch prompt with the correct agent name.
- `src/scripts/lib/slice-linker/start-slice.mts::resolveOrchestratorModeConfig`: accept `"slice-build"`.
- `src/scripts/lib/walker-gates.mts`: documentation comment lists the new mode (no behavior change here — walker forwards the dispatch instruction verbatim).
- Tes
- Out Of Scope:
  - - Parallel fanout for `fe` AND `be` slices (SLICE-2 / SLICE-105).
- Architect pre-flight when `needs_contract: true` (SLICE-3 / SLICE-106).
- Walker auto-flip of default mode. Stays opt-in.
- `commands/` doc updates beyond CHANGELOG.
- Planned Files: -
- Next Step: Begin implementation

