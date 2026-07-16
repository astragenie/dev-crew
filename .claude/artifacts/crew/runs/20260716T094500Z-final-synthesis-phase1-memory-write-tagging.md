# Final synthesis — Phase 1: memory write-tagging fix (2026-07-16)

- **Objective:** stop runner's programmatic memory writes landing untagged in astramem (root cause of `project=runner-plugin` recall returning 0 hits).
- **Plan:** `.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md` (Phase 1).
- **Outcome:** DONE — built, review **approved**, live-verified end-to-end. Nothing committed (operator mandate; tree also holds uncommitted SLICE-160 work).

## Phase 0 status (checked first, same session)

Resolved upstream without a build: daemon `status: ok`, `embed.ok: true`, `/recall` 0.69s (was ≥15s hang), 32s event-loop stalls gone, re-embed backfill confirmed. Watch item: doctor still lists "Crash loop"; short uptimes.

## What shipped (uncommitted working tree)

| File | Change |
|---|---|
| `src/scripts/lib/memory-transport.mts` | `ProviderIngestPayload` widened with top-level `project?`/`agent?` (documented local widening; `rememberSilent` forwards untouched). |
| `src/scripts/lib/memory-sink.mts` | `recordMemory` sends top-level `project`/`agent` + keeps `metadata` copy (back-compat). |
| `src/tests/memory-sink.test.mts`, `src/tests/memory-transport.test.mts` | 39 tests on touched files; fakes capture raw payload (no mock-mirror trap). |
| `docs/sop/memory-bridge.md` | CLI-era claims struck (memory-bridge.mts/`buildRememberArgs` deleted by FEAT-235/DEC-072); provider-path contract documented. |

Scope correction vs plan: plan item "memory-bridge.mts --project/--agent" was impossible — file deleted by FEAT-235/DEC-072; the provider path is the only live write surface and is now fixed.

## Evidence chain

- Builder handoff: `.claude/artifacts/crew/handoffs/20260716T092751Z-handoff-memory-write-tagging-phase1.md`
- Review (approved, independent type-citation + test re-run): `.claude/artifacts/crew/reviews/20260716T093123Z-review-result-phase1-memory-write-tagging.md`
- Gates: bun test 2891 pass / 0 fail; tsc ×2 clean (re-verified by lead AND reviewer); biome lint+format clean on touched files.
- **Live validation (lead):** `recordMemory` via real provider (`CLAUDE_PLUGIN_ROOT_MEMORY` → plugin cache) returned `recorded:true`; canary `812f4a93` immediately top-hit under `project=runner-plugin` (0.909, FTS+vec) and under `agent=runner:researcher`. Wire field names confirmed: bare `project`/`agent` (not projectId/agentId) on the provider path.

## Open follow-ups

1. **Phase 2** — ASTRAMEM_E2E-gated e2e smoke suite with timing budgets (plan table); closes SLICE-160's AC-4/5 MEDIUM too.
2. **Phase 3** — thread `agentType` through slice-close capture (`memory-gepa.mts` `GepaPayload` has no project/agent); add `scope` to `ProviderIngestPayload` + default `team` for loop writes (smoke atom landed `private`).
3. **Upstream** — shared `@astragenie/astramem-client` `AstramemDaemonClient.remember()` nests project/agent under metadata despite flat `RememberRequest` type (file plugins-common/astramem-local ticket; #341 family). Widen upstream `IngestPayload` type so the local widening can retire.
4. Daemon flap watch (#343) + 768 pending merge proposals + contradiction judge silent (FEAT-456 / #352) + profile pollution (#353).

## Commit status

Not committed. When operator green-lights: this diff is review-approved and validation-evidenced; commit alongside or after the SLICE-160 tree decision.
