# Handoff — Phase 1: memory write-tagging fix (project/agent top-level)

- **Objective:** fix runner's programmatic memory writes to astramem so they carry project/agent tags top-level, not just nested under metadata (Phase 1 of `.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md`).
- **Owner:** builder (this dispatch), reporting to team-lead.
- **Status:** DONE for the real, currently-existing code surface. One scoped item (`memory-bridge.mts::buildRememberArgs`) does not exist in this codebase — see "Scope discrepancy" below.

## Scope discrepancy (read first)

The dispatch brief's item 2 targets `src/scripts/lib/memory-bridge.mts::buildRememberArgs`
(add `--project`/`--agent` CLI flags). **That file and function do not exist.**
`memory-bridge.mts` was deleted outright by FEAT-235 (Decision 1) — the
CLI-spawn `astramem remember` subcommand path (`emit()`/`buildRememberArgs()`)
was retired because `@astragenie/astramem-client`'s `resolveWireProvider()` is
a verified strict superset of the discovery chain it hand-rolled (DEC-072).
Confirmed by grep: `buildRememberArgs` has zero matches anywhere in `src/`;
every remaining reference to `memory-bridge.mts` in the codebase is a
historical comment noting where code was *extracted from* before deletion
(`astramem-cli-resolver.mts`, `memory-doctor.mts`, `memory-gepa.mts`,
`memory-sanitize.mts`, and three test files).

GEPA-shaped trainset capture (the successor to `memory-bridge.mts`'s `emit()`)
now lives in `src/scripts/lib/memory-gepa.mts` (`emitGepaEvent`), which sends
through the **same in-process provider transport** as `memory-sink.mts`
(`sendViaProvider` in `memory-transport.mts`) — no CLI subprocess at all, so
there is no argv to add `--project`/`--agent` flags to. `GepaPayload` also
carries no `project`/`agent` fields today, so `emitGepaEvent()` does not tag
GEPA events by project/agent yet. I did **not** extend `memory-gepa.mts` in
this dispatch since it was outside the explicitly authorized file list —
flagging it here as a natural Phase 1 follow-up rather than unilaterally
expanding scope.

## Root cause confirmed

`src/scripts/lib/memory-sink.mts::recordMemory` (now fixed, see below) built
the wire payload for `sendViaProvider()` with `project`/`agent` folded only
into a `metadata` sub-object. The installed `@astragenie/astramem-client`
(v0.3.0, `node_modules/@astragenie/astramem-client`) declares its `IngestPayload`
type (`types.ts`, used by `rememberSilent`/the in-process provider path) with
**no top-level `project`/`agent` fields at all** — only `id`, `type`, `text`,
`source`, `importance`, `confidence`, `metadata`. By contrast, the *same
package's* `RecallRequest`/`RecallFilters` (read side) and the daemon's own
`RememberRequest` (`daemon-types.ts`, the canonical astramem-local wire
contract) both declare `project`/`agent` **top-level** — never `projectId`/
`agentId`, and never nested under metadata. That asymmetry (write side
nests, read side and true daemon contract are flat) is exactly what
CANARY-REVIEWER-8801 predicted and is the root cause of `search_memory
project=runner-plugin` returning 0 hits for capture-path writes.

Note: `calls.js::rememberSilent()` forwards the payload object to
`provider.remember(payload)` completely untouched (no field stripping), so
adding extra top-level fields to the object we construct is safe and reaches
the resolved provider unchanged — TypeScript allows it because our local
`ProviderIngestPayload` (a deliberately re-declared, decoupled alias per its
own header comment) is a structural superset of upstream `IngestPayload`.

Also worth noting for Phase 0/upstream tracking: I inspected
`AstramemDaemonClient.remember()` (`daemon-client.js`, the *direct HTTP*
daemon client, a different code path not used by `memory-sink.mts`) and found
it ALSO nests `project`/`agent`/`repo`/`branch`/`importance`/`confidence`
under `metadata` before POSTing to `/remember` — contradicting its own
declared `RememberRequest` type (flat) and the daemon's real wire contract.
That's a separate bug in the shared `@astragenie/astramem-client` package
itself (out of this repo's tree, `node_modules`), not something this dispatch
could fix — flagging for the plugins-common backlog.

## Changed files

- `src/scripts/lib/memory-transport.mts` (~line 25-45) — widened the local
  `ProviderIngestPayload` interface with optional top-level `project?: string`
  and `agent?: string` fields, documented as a local widening beyond the
  installed client's narrower `IngestPayload` type.
- `src/scripts/lib/memory-sink.mts` (~line 139-158, `recordMemory`) — the
  payload sent to `sendViaProvider()` now spreads `project`/`agent` as
  top-level fields (when present) **in addition to** the existing
  `metadata.project`/`metadata.agent` copy, which is kept verbatim for
  back-compat with any provider that only reads metadata.
- `src/tests/memory-sink.test.mts` — added two tests: top-level
  `project`/`agent` delivered alongside the metadata copy
  (CANARY-REVIEWER-8801), and both omitted cleanly when unconfigured/absent.
- `src/tests/memory-transport.test.mts` — extended the existing
  `recordMemory` delivery test with assertions that `seen[0]?.project` /
  `seen[0]?.agent` are now populated (metadata assertion was already there
  and is unchanged).
- `docs/sop/memory-bridge.md` — corrected throughout: struck the false
  "buildRememberArgs()"/CLI-spawn wire-contract description (file doesn't
  exist), replaced with the real provider-path contract
  (`memory-gepa.mts`/`memory-sink.mts` via `sendViaProvider`), documented the
  new top-level project/agent fields and that `GepaPayload` doesn't carry
  them yet, and fixed three other now-stale CLI-era sections ("CLI
  resolution state" → "Provider resolution state", "Off-switch", "Recall
  config"/"Failure contract" wording) that all still referenced the deleted
  `resolveCli()`/`emit()`/CLI-subprocess model.

I did **not** touch `memory-gepa.mts`, `astramem-e2e-preflight.mts`, backlog
files, `agents/`, or `skills/` — all out of the authorized scope for this
dispatch.

## Gate results

- `bun test src/tests/ --parallel --timeout 60000` → **PASS** — 2891 pass, 1
  skip, 0 fail, 1144 expect() calls, 293 files, 27.99s. (Pre-existing
  git-fetch-offline warnings from unrelated worktree tests are noise, not
  failures.)
- `bunx tsc --project tsconfig.json --noEmit` → **PASS** (no output).
- `bunx tsc --project tsconfig.test.json --noEmit` → **PASS** (no output).
- `bunx biome lint` on the 4 touched files → **PASS**, exit 0. 16 pre-existing
  `useLiteralKeys` infos surfaced (e.g. `metadata["project"]` vs
  `metadata.project`) — all on lines that predate this change (copied
  verbatim from the existing code, or in `memory-transport.test.mts`'s
  pre-existing env-var bracket-access style); none are new, none fail the
  gate (info severity, part of the repo's documented legacy-warning
  baseline).
- `bunx biome format` (correct no-`--check`-flag invocation; `format:check` in
  package.json is `biome format src/` with no `--check`) on the 4 touched
  files → **PASS**, "No fixes applied."
- Biome cognitive complexity: no function touched grew in branching; `useLiteralKeys` is the only finding, unrelated to complexity.

## Exact top-level field names the wire preserves (evidence)

`project` and `agent` (bare, not `projectId`/`agentId`) — consistent across
every place the installed `@astragenie/astramem-client` v0.3.0 declares a
top-level project/agent field:
- `types.ts::RecallRequest.project` / `.agent` (single value or OR-list, FEAT-423)
- `daemon-types.ts::RecallFilters.project` / `.agent`, `SearchParams.project` / `.agent`
- `daemon-types.ts::RememberRequest.project` / `.agent` (the canonical, real daemon `/remember` wire shape per its own header comment: "Mirrors astramemory-local src/contracts/memory.ts")

No occurrence of `projectId`/`agentId` naming exists anywhere in the
installed client package. I did not find independent evidence for the
"flat top-level projectId/agentId" naming mentioned in the dispatch brief —
recommend treating that as informal/imprecise phrasing for "flat top-level
project/agent" rather than a distinct field-name convention.

## Risks / open questions

1. **Whether this actually fixes production tagging depends on the
   currently-installed astramem-plugin's `remember()` implementation**,
   which lives outside this repo (`@astragenie/astramem-plugin`, not
   installed in this repo's `node_modules` — it's an optional peer dep, so
   `resolveWireProvider()` falls through to runtime plugin-root discovery in
   real dispatch environments). I could not inspect that implementation's
   source from here to confirm it reads top-level `payload.project`/`.agent`
   rather than only `payload.metadata.project`/`.agent`. The fix is
   structurally correct (mirrors the package's own read-side/daemon
   conventions) and strictly additive/non-regressive (old metadata path
   untouched), but the live AC from the plan ("write → `search_memory
   project=runner-plugin` finds it") needs a real daemon-connected check to
   fully close — that's Phase 2 (e2e smoke suite) territory, or a quick
   manual `ASTRAMEM_E2E=1` run against the live daemon if it's healthy.
2. **`AstramemDaemonClient.remember()`'s own metadata-nesting bug** (found
   above, in `daemon-client.js`) is a separate, real bug in the shared
   `@astragenie/astramem-client` package — outside this repo's tree, not
   fixed here. If the installed astramem-plugin's local/saas provider
   internally routes through this same client class, it would independently
   re-introduce nesting regardless of what memory-sink.mts sends. Worth
   escalating upstream (plugins-common) alongside astramem-local#341/#347.
3. **`memory-gepa.mts` still doesn't tag by project/agent at all** (no field
   in `GepaPayload`) — a real Phase 1 gap (plan item 3, "thread agentType
   through slice-close capture") that this dispatch left untouched per the
   authorized file list. Recommend a small follow-up slice to extend
   `GepaPayload`/`emitGepaEvent()` the same way, once `memory-bridge.mts` is
   corrected out of everyone's mental model.
4. Did not touch `scope: "team"` default (plan item 4) — not in this
   dispatch's authorized scope, and there's no `scope` field anywhere in the
   current `ProviderIngestPayload`/`IngestPayload` contract to hang it off
   of; would need its own design pass.

## Suggested next handoff

Either: (a) team-lead reviews and decides whether to fold `memory-gepa.mts`
project/agent threading + `scope:"team"` default into this same Phase 1
slice or split it out, or (b) proceed to Phase 2 (e2e smoke suite) once
Phase 0 (daemon embed-health blocker) clears, using this fix as the "remember
roundtrip" test's write-side under test.
