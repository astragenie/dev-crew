# Handoff — FEAT-188 S1b contract clarification (capture transport)

- **To:** fable
- **From:** opus → fable (updated 2026-07-07 after reading plugin/daemon source)
- **Issue:** GitHub runner-plugin **#357** (FEAT-188 S1b — capture repair)
- **Type:** transport decision now RESOLVED by source evidence; implement it

## Objective

Swap runner-plugin's headless learnings-capture transport from CLI-shell
(`resolveCli()` + `spawn`) to the astramem **MemoryProvider library interface**,
closing S1b's last remaining delta.

## Status coming in

S1b is **~95% shipped**. Capture ceremonies already live in v0.62.0:

- `runner:close` lessons/surprises auto-capture — #327
- `runner:pr-fix` circuit-breaker trip + retro decisions — #327
- enriched shape (`failure_class`/`root_cause`/`recommended_fix`) — #332 (FEAT-220)
- astramem-absent → fail-silent local degrade — shipped

**Do NOT rebuild these.** Only the transport swap remains.
Blocker cleared: **dev-team#172 DECIDED + CLOSED** — transport standardized on
local MCP / plugin commands, CLI-shell retired.

## RESOLUTION — the proper MemoryProvider integration (verified in source)

Earlier draft framed this as an open A/B/C fork (direct HTTP vs keep-CLI vs
queue+flush). Reading the actual repos resolves it:

- **Plugin repo:** `C:\work\mega\astramemory-plugin` (github.com/astragenie/astramem-plugin)
- **Daemon repo:** `C:\work\mega\astramemory-local` (Fastify daemon, port 7777)

Key facts:

1. The plugin is a real package **`@astragenie/astramem-plugin` v0.6.0** with an
   exports map added *specifically* for library consumption (commit `ec851f19`-adjacent
   `ec61c0b`: "feat(pkg): add exports map so providers are importable as a library (#23)"):
   ```json
   "exports": {
     ".": "./src/contracts/index.ts",
     "./providers/local": "./src/providers/local.ts",
     "./providers/saas": "./src/providers/saas.ts",
     "./contracts": "./src/contracts/index.ts"
   }
   ```
2. **`MemoryProvider`** interface lives at `src/contracts/provider.ts`:
   `ingest` / `ingestTranscript` / `recall` / `remember(req: IngestPayload)` / `health`.
   Implemented by `providers/local.ts` (HTTP → daemon `POST /remember`,
   `providers/local.ts:251`) and `providers/saas.ts`.
3. **`resolveProvider()`** (`src/lib/selector.ts:182`) does full precedence:
   flag → `ASTRAMEM_PROVIDER` env → config → auto (probe local `/health`, 5s cache,
   fallback saas) + wire-version compat probe. It owns URL + bearer resolution —
   exactly the config/auth logic we'd otherwise duplicate.
4. Daemon route surface confirms `POST /remember` exists (`astramemory-local`
   `src/server/routes/search.ts:207`); Bearer auth from `%APPDATA%\Astramem\secrets.env`.
5. Repo-HEAD `remember` CLI now parses `--project`/`--agent` (folds into metadata) —
   the cached-install gap noted in the v6 findings doc is already fixed upstream.

**Decision (1): integrate as a library dependency.** Add
`@astragenie/astramem-plugin` as a dependency of runner-plugin
(git dep `github:astragenie/astramem-plugin` — public; or `file:` during local dev),
then in the capture seam:

```ts
import { resolveProvider } from "@astragenie/astramem-plugin/selector"; // see GAP below
import type { IngestPayload } from "@astragenie/astramem-plugin";

const { provider } = await resolveProvider();
await provider.remember(payload); // in-process, no spawn
```

This IS "complete integration with MemoryProvider": in-process, headless-safe,
reuses selector/auth/wire-compat/pending logic, kills the subprocess, satisfies
dev-team#172. Bun runs the exported `.ts` sources directly — no build step needed.

### GAP — one small upstream PR required

`resolveProvider` lives in `src/lib/selector.ts` which is **NOT in the exports
map** (only contracts + raw providers are). Two options:

- **Preferred:** tiny PR to astramem-plugin adding `"./selector": "./src/lib/selector.ts"`
  (or re-export `resolveProvider` from `src/contracts/index.ts` — note
  `contracts/selector.ts` is types-only today, so index re-export means touching that).
- Fallback (no upstream wait): import `./providers/local` directly + replicate URL/bearer
  resolution in runner. Works but duplicates selector logic — only if PR stalls.

File the PR first; it's a two-line change against a repo we control.

## Remaining decisions (recommendations)

2. **Payload mapping** — `IngestPayload = { id, type, text, source?, importance?,
   confidence?, metadata? }` (Zod, `contracts/wire.ts:18`). Map:
   - sink `recordMemory`: `id` = generated uuid, `type` = MemoryKind
     (decision|lesson|note|failure), `text` = sanitized content,
     `metadata` = `{ project, agent }`, `source` = repo name.
   - bridge `emit` (GEPA): `type` = payload.event, `text` = feedback,
     `metadata` = existing summarized block (keep `summarizeStructured` caps —
     no longer argv-bound, but bounded payloads still right).
3. **CLI fallback:** **keep** the existing `resolveCli()` spawn as fallback when
   `resolveProvider()` throws/unresolvable — preserves degrade AC during rollout;
   delete in a follow-up once proven. (Cheap: seam already exists.)
4. **Scope:** migrate the **shared seam once** — both `recordMemory`
   (memory-sink.mts) and `emit` (memory-bridge.mts) route through one new
   `memory-transport.mts` that wraps provider-call in fail-silent + 2s cap.
5. **Fail-silent hardening:** `resolveProvider` can throw `WireIncompatibilityError`;
   `provider.remember` can reject; auto-probe adds latency (5s health cache mitigates).
   The wrapper must try/catch-all + `Promise.race` a 2s cap — capture must NEVER
   block or throw into ceremony paths.

## Allowed scope

- runner-plugin: `src/scripts/lib/memory-sink.mts`, `src/scripts/lib/memory-bridge.mts`,
  new `src/scripts/lib/memory-transport.mts` + colocated tests, `package.json` dep add.
- astramem-plugin: the two-line exports-map PR only.

## Forbidden scope

- Do NOT rebuild capture ceremonies (#327/#332 — shipped + green).
- Do NOT touch recall (`memory-recall.mts` / `recall-injector.mts`) — that's S3b (#358).
- Do NOT change the enriched entry shape.
- Do NOT edit daemon (`astramemory-local`) — `POST /remember` already exists.

## Deliverable

- Transport swapped to in-process MemoryProvider; CLI spawn demoted to fallback.
- Fail-silent + 2s-cap contracts preserved (never throws, never blocks caller).
- Tests: (a) provider.remember called with correct IngestPayload when paired
  (inject `_provider` test seam like plugin's own `RememberOpts`), (b) silent
  no-op degrade when unresolvable, (c) 2s cap honored on hung provider.
- Update `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` +
  close #357.

## Key files / evidence

- runner: `src/scripts/lib/memory-sink.mts:96` (`recordMemory`),
  `memory-bridge.mts:120` (`resolveCli`), `:242` (`emit`), `:263` (`spawnRemember`)
- plugin: `src/contracts/provider.ts` (MemoryProvider), `src/lib/selector.ts:182`
  (`resolveProvider`), `src/contracts/wire.ts:18` (IngestPayloadSchema),
  `src/providers/local.ts:251` (POST /remember), `package.json` exports map
- daemon: `src/server/routes/search.ts:207` (`POST /remember` route)
- research: `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md`

## Confidence / risks

- **Confidence:** high — integration path verified against live source of all three
  repos; plugin's exports map was added for exactly this consumption pattern.
- **Risk:** exports-map gap (selector not exported) — mitigated by the tiny upstream PR.
- **Risk:** dependency pinning — pin the git dep to a tag/sha; astramem CLI surface
  drifted twice before (v6 findings doc), a floating dep re-imports that fragility.
- **Risk:** test isolation — plugin's selector probes real daemon on `auto`; tests must
  inject `_provider` seam or set `ASTRAMEM_PROVIDER`-style overrides, mirroring
  runner's existing `ASTRAMEM_DISABLE_PATH_PROBE` hygiene.

## Suggested next handoff

1. Upstream PR (exports map) → astramem-plugin.
2. Builder: `memory-transport.mts` + seam migration in runner-plugin.
3. crew:reviewer / crew:typescript-reviewer — verify fail-silent + degrade tests before close.
