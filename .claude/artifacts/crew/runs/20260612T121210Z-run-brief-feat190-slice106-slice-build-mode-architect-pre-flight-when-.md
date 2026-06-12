---
feature: FEAT-190
status: active
---
# Run Brief: FEAT190 SLICE106: slice-build mode — architect pre-flight when needs_contract (FEAT-190 slice-3)

- Created: 2026-06-12T12:12:10.311Z
- Tier: full
- Goal: When `orchestratorMode === "slice-build"` AND slice frontmatter has `needs_contract: true` AND no contract artifact exists at `.claude/artifacts/crew/contracts/<sliceId>-*.md` → prepend an architect dispatch instruction. Otherwise behave as SLICE-104/105 (single-variant or parallel-fe-be).  When the contract artifact already exists OR `needs_contract` is false/missing, NO architect prepend — straight builder dispatch.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/dispatch.mts`:
  - New helper `needsContractPreflight(sliceContent
  - repoPath
  - sliceId)`: returns `true` when slice frontmatter has `needs_contract: true` AND glob `.claude/artifacts/crew/contracts/<sliceId>-*.md` is empty.
  - New helper `buildArchitectPreflight(sliceId
  - title
  - rel)`: returns a string saying "Dispatch crew:architect FIRST. Await contract artifact at .claude/artifacts/crew/contracts/. Then dispatch builder(s) using the prompt below: ".
  - `buildDispatchInstruction` slice-build path: if `needsContractPreflight` returns true
  - prepend `buildArchitectPreflight(...)` + a separator (`\n---\n`) before the existing dispatch instruction. Other modes unchanged.
- `src/tests/slice-build-routing.test.mts`:
  - Test: needs_contract: true + no contract ar
- Out Of Scope:
  - - Walker auto-flip of default mode (still opt-in).
- Crew architect agent prompt content (separate concern; the architect prompt embedded here is a stub directing the agent to write a contract).
- Removing the per-slice contract artifact glob heuristic in favor of a structured contract registry.
- Planned Files: -
- Next Step: Begin implementation

