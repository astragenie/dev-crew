---
id: SLICE-106
title: slice-build mode — architect pre-flight when needs_contract (FEAT-190 slice-3)
status: completed
feature: FEAT-190
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
effort_points: 2
completed_at: 2026-06-12
---
# SLICE-106: slice-build mode — architect pre-flight (FEAT-190 slice-3)

Third + final FEAT-190 sub-slice. Adds architect pre-flight to `slice-build` mode dispatch.

## Objective

When `orchestratorMode === "slice-build"` AND slice frontmatter has `needs_contract: true` AND no contract artifact exists at `.claude/artifacts/crew/contracts/<sliceId>-*.md` → prepend an architect dispatch instruction. Otherwise behave as SLICE-104/105 (single-variant or parallel-fe-be).

When the contract artifact already exists OR `needs_contract` is false/missing, NO architect prepend — straight builder dispatch.

## In scope

- `src/scripts/lib/slice-linker/dispatch.mts`:
  - New helper `needsContractPreflight(sliceContent, repoPath, sliceId)`: returns `true` when slice frontmatter has `needs_contract: true` AND glob `.claude/artifacts/crew/contracts/<sliceId>-*.md` is empty.
  - New helper `buildArchitectPreflight(sliceId, title, rel)`: returns a string saying "Dispatch crew:architect FIRST. Await contract artifact at .claude/artifacts/crew/contracts/. Then dispatch builder(s) using the prompt below: ".
  - `buildDispatchInstruction` slice-build path: if `needsContractPreflight` returns true, prepend `buildArchitectPreflight(...)` + a separator (`\n---\n`) before the existing dispatch instruction. Other modes unchanged.
- `src/tests/slice-build-routing.test.mts`:
  - Test: needs_contract: true + no contract artifact + slice-build → output starts with architect pre-flight header AND contains the underlying builder dispatch.
  - Test: needs_contract: true + EXISTING contract artifact → no pre-flight (straight builder dispatch).
  - Test: needs_contract: false → no pre-flight.
  - Test: legacy modes (lead, direct-builder) ignore needs_contract — no pre-flight added.

## Out of scope

- Walker auto-flip of default mode (still opt-in).
- Crew architect agent prompt content (separate concern; the architect prompt embedded here is a stub directing the agent to write a contract).
- Removing the per-slice contract artifact glob heuristic in favor of a structured contract registry.

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean.
- [ ] AC-2 (preflight when needed): slice with `needs_contract: true` AND no contract artifact + slice-build mode produces a dispatch string starting `ARCHITECT PRE-FLIGHT —` (or equivalent unambiguous header) AND containing the builder dispatch prompt below it.
- [ ] AC-3 (preflight skipped when artifact exists): slice with `needs_contract: true` AND an existing `.claude/artifacts/crew/contracts/<sliceId>-*.md` file produces a dispatch string with NO architect pre-flight header — straight builder dispatch.
- [ ] AC-4 (preflight skipped when needs_contract is false/missing): no architect header in the output regardless of contract artifact presence.
- [ ] AC-5 (legacy modes unaffected): `lead`, `orchestrate-slice`, `direct-builder` modes do NOT add architect pre-flight even when slice has `needs_contract: true`. Existing legacy tests stay green.

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc` clean (both configs).
- CHANGELOG entry under [Unreleased].
- Final-synthesis artifact written.
- FEAT-190 moves to `done/` with `slices_complete: [SLICE-104, SLICE-105, SLICE-106]`.

## Reviewer ladder

- Reviewer A (correctness): verify the contract-artifact glob is case-sensitive and matches the existing `.claude/artifacts/crew/contracts/` convention; verify `needs_contract` defaults to false (missing → false); verify the architect prepend doesn't break the parallel-fe-be branch (architect runs FIRST, then both subagents in parallel).
- Reviewer B (production-readiness): verify the new helper is sync-or-async consistent with the surrounding code (`buildDispatchInstruction` is sync today; filesystem glob would force async — use existsSync or refactor); verify the architect prompt mentions writing the contract artifact to a specific path so downstream stages can find it.
