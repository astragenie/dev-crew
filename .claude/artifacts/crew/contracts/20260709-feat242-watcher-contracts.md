# FEAT-242 Watcher MVP — Contract Artifact

Design-only. Fixes shared shapes for SLICE-143..146 (and downstream C1/C3).
Source: `2026-07-07-watcher-implementation-plan.md` (APPROVED-WITH-CONDITIONS,
COND-1..8 folded in) + `2026-07-07-watcher-acs-eta.md` §B1 (AC-1..AC-8).
Do not redesign — this artifact only pins interfaces the plan left open.

## Patterns Found

- `src/scripts/lib/webhook-fanout.mts::fanoutEnvelope(repoPath, kind, payload)`
  resolves routing tenant/bearer from `repoPath`'s own `loop.json` webhook
  block via `readNotifyConfig`; `payload` is a free-form
  `Record<string, unknown>` — no conflict putting business-attribution
  fields inside it.
- `src/scripts/lib/gh-rate-limiter.mts` — JSON state-file precedent
  (`readState`/`writeState`), but `writeState` is a plain `fs.writeFile` to
  the final path, **not** atomic temp+rename. Shape is reusable; the I/O
  primitive is not — watcher state needs a new atomic helper.
- `src/scripts/lib/pr-watch.mts` — `PrWatchConfig.maxCostUsd` /
  `readPrWatchConfig` is the cost-ceiling *pattern* to mirror, but it is
  per-PR/per-repo scoped; watcher's ceiling is machine-wide, so the type is
  new, the pattern (config-driven numeric ceiling + discriminated result)
  is reused.
- `src/scripts/lib/pr-fixer.mts` — `attemptCount >= maxAttemptsPerCategory`
  circuit-breaker pattern reused for reaction attempt gating.
- `src/scripts/lib/slice-linker.mts` (barrel) +
  `src/scripts/lib/slice-linker/*.mts` (sub-modules) +
  `src/scripts/validate-imports.mts` (`BLOCKED_PATTERNS`) is the precedent
  for the new `watch/` module boundary below. **Implementation note for the
  builder**: `validate-imports.mts` needs a parallel `watch/*`
  `BLOCKED_PATTERNS` block — not done here, design-only.
- `src/scripts/lib/state-paths.mts::assertStatePath` gates writes to
  `.claude/artifacts/loop/**` inside *this* repo. It does **not** apply to
  `~/.claude/watch/**` (global, cross-repo, outside any single repo's state
  roots) — watcher state is a new, separate writer surface with its own
  atomic-write helper, not a reuse of `assertStatePath`.

Tier: **Medium** (schema + module-boundary contract for an already-sliced
FEAT; no new HTTP surface, so no OpenAPI artifact — this markdown is the
canonical contract).

## 1. Registry schema (`~/.claude/watch/repos.json`)

Wrapper object, not a bare array — a `controlRepoPath` is needed to resolve
which local loop install's webhook config routes `watch.*` envelopes (see
§4), decoupled from any individual watched repo's tier.

```ts
interface RegistryFile {
  controlRepoPath: string;   // absolute path to THIS machine's loop-installed
                              // control repo; source of webhook url/bearer
                              // for fanoutEnvelope routing (NOT attribution)
  entries: RegistryEntry[];
}

interface RegistryEntry {
  path: string;       // required — absolute local clone path
  ghSlug: string;      // required — "owner/repo", unique across entries
  shard: number;       // required — positive integer, machine assignment
  tier: 1 | 2;          // required — 1 = loop-installed (full react:
                        //   intake/pr-fix/crew:fix, needs .claude/loop.json
                        //   in that repo); 2 = watch-only (detect → file/
                        //   update tracker issue via IssueBroker, no react)
  checks?: string[];    // optional, default [] = treat every check in the
                        // open-PR statusCheckRollup as gating
  tenantId: string;     // required — astrarunner attribution (COND-7)
  appId: string;        // required — astrarunner attribution (COND-7)
}
```

Validation (`registry.mts::validateRegistry`):

- `ghSlug` unique across `entries` — a repo cannot appear under two shards
  at once. This IS the shard-exclusivity rule at the schema level.
- `tier ∈ {1, 2}`; `shard` a positive integer; `tenantId`/`appId` non-empty.
- Cross-machine concurrent-shard-claim (two machines both configured for
  shard 1) is **explicitly out of scope for B1** — no schema-level check
  can detect it; deferred to the plan's "Open decisions" / B2 staleness
  alert. A machine's *own* shard assignment (which shard number it
  services) is local config, not part of this file — resolved via
  `loop.json`'s `watch.shard` (new field, out of this artifact's scope to
  fully define; SLICE-143 owns wiring it).

## 2. Per-repo state — write-ownership split (COND-2)

**Decision: separate files per writer, not keyed-section-in-one-file.**
Justification: file separation makes the tick-vs-reaction lost-update race
(AC-5) impossible *by construction* — each writer only ever opens its own
file, so there is no cross-writer read-modify-write window to lose. A
single shared file with keyed sections would still need a lock to prevent
tick's read-mutate-write from clobbering a reaction's concurrent write to
the same physical file (and vice versa); two files removes that need for
the primary documented race. The narrower same-writer race (two concurrent
reactions on the same repo both writing `reaction.json`) is handled by a
shared atomic-RMW-with-lock helper (below), not by further file splitting.

```
~/.claude/watch/
  repos.json
  state/
    <ghSlugHash>.tick.json      # tick-owned (Layer 1)
    <ghSlugHash>.reaction.json  # reaction-owned (Layer 2)
  tick.lock                     # AC-2 overlapping-tick guard
```

- **`<hash>.tick.json`** (written only by the tick process): `lastSeenIssue`,
  `lastFailedRunIds`, `lastPrShas` (per-check dedup cursors), `lastTickAt`,
  `claims` (claim label + TTL entry, COND-1 — Layer 1 writes this
  *before* spawning, so it is tick-owned even though it gates Layer 2),
  `skippedCeiling` notes (COND-4 — also a Layer-1-only decision; no
  reaction process exists when a spawn is skipped, so this cannot live in
  `reaction.json`).
- **`<hash>.reaction.json`** (written only by spawned Layer 2 processes,
  keyed by `findingId`): `attemptCounts`, `costSpent`.

**Atomic temp+rename convention** (`watch/state.mts::updateStateAtomic`):
write to `<path>.tmp-<pid>-<random>`, `fsync`, then `fs.rename` over the
target (rename is atomic on both NTFS and POSIX). Wrapped in a short-lived
mkdir-based lock sibling (`<path>.lock/`, same primitive as `tick.lock`)
held only across the read-mutate-write critical section — not across any
`gh`/`claude -p` call — so it bounds the same-writer concurrent-reaction
race from §2 without serializing unrelated I/O.

## 3. Module boundaries — `src/scripts/lib/watch/`

Barrel `src/scripts/lib/watch.mts` re-exports the public surface consumed
by `/runner:watch` and the scheduler entry script (mirrors
`slice-linker.mts`). Sub-modules under `src/scripts/lib/watch/` are
barrel-only from outside the directory (same rule `validate-imports.mts`
enforces for `slice-linker/`).

| Module | Responsibility | Reuses |
|---|---|---|
| `watch/registry.mts` | read + `validateRegistry` repos.json | new |
| `watch/state.mts` | `updateStateAtomic`, tick/reaction file I/O | JSON-state shape from `gh-rate-limiter.mts`; new atomic primitive |
| `watch/claims.mts` | claim set/check/TTL self-heal (COND-1) | built on `state.mts` |
| `watch/spawn-gate.mts` | concurrency cap + cost ceiling (COND-4) | ceiling pattern from `pr-watch.mts::readPrWatchConfig`; circuit-breaker pattern from `pr-fixer.mts` (`attemptCount >= max`) |
| `watch/envelopes.mts` | build `watch.tick`/`watch.reaction` payloads, call `fanoutEnvelope` | `webhook-fanout.mts::fanoutEnvelope` as-is |
| `watch/tick.mts` | `runTick()` — orchestrates the above, zero-LLM sweep | `pr-watch.mts` check-classification pattern for statusCheckRollup |

`watch.mts` barrel exports: `runTick`, `recordReactionOutcome`,
`readRegistry`, `validateRegistry` — the only symbols outside
`watch/` may import.

## 4. Envelope shapes + tenantId/appId attribution (resolves a plan gap)

The plan requires registry-sourced tenant attribution but `fanoutEnvelope`
derives its *routing* tenant/bearer from `repoPath`'s own `loop.json`.
Tier-2 repos have no `loop.json` at all, so routing cannot key off the
watched repo. **Resolution**: always call `fanoutEnvelope` with
`RegistryFile.controlRepoPath` (this machine's own loop install — routing
only). Business attribution rides inside `payload.tenantId`/`payload.appId`,
sourced from the watched entry's registry record — independent of which
repo's webhook config physically sent the HTTP call. B2's projection
(COND-7) reads the payload-level fields, not the envelope's routing-level
ones.

```ts
interface WatchTickPayload {
  ghSlug: string;
  shard: number;
  tenantId: string;   // from RegistryEntry, not controlRepoPath's own config
  appId: string;
  tickAt: string;      // ISO timestamp
  findingsCount: number;
  skippedCeilingCount: number;
}

interface WatchReactionPayload {
  ghSlug: string;
  tenantId: string;
  appId: string;
  findingId: string;
  action: "intake" | "pr-fix" | "crew-fix" | "issue-broker-file";
  attemptCount: number;
  costUsd: number;
  outcome: "spawned" | "circuit-broken" | "skipped-ceiling";
}

// call sites, both in watch/envelopes.mts:
fanoutEnvelope(registry.controlRepoPath, "watch.tick", tickPayload);
fanoutEnvelope(registry.controlRepoPath, "watch.reaction", reactionPayload);
```

## 5. TypeScript interfaces (canonical, for `watch/*.mts` to import from a shared `watch/types.mts`)

```ts
// watch/types.mts

export interface RegistryEntry {
  path: string;
  ghSlug: string;
  shard: number;
  tier: 1 | 2;
  checks?: string[];
  tenantId: string;
  appId: string;
}

export interface RegistryFile {
  controlRepoPath: string;
  entries: RegistryEntry[];
}

export interface ClaimEntry {
  findingId: string;      // e.g. "issue:123", "pr:45", "run:987"
  claimedAt: string;       // ISO timestamp
  ttlSeconds: number;       // expiry window; expired = stealable (COND-1)
  label: string;             // e.g. "loop-claimed"
}

export interface TickState {
  lastSeenIssue: number | null;
  lastFailedRunIds: number[];
  lastPrShas: Record<string, string>;   // prNumber -> last-seen head sha
  lastTickAt: string;
  claims: Record<string, ClaimEntry>;    // keyed by findingId
  skippedCeiling: Array<{
    findingId: string;
    reason: "concurrency-cap" | "cost-ceiling";
    at: string;
  }>;
}

export interface ReactionState {
  attemptCounts: Record<string, number>;   // keyed by findingId
  costSpent: Record<string, number>;        // keyed by findingId, USD
  totalCostSpentUsd: number;
}

export type FindingKind = "issue" | "failed-run" | "red-pr";

export interface Finding {
  kind: FindingKind;
  findingId: string;
  ghSlug: string;
}

export type TickResult =
  | { outcome: "swept"; findingsCount: number; spawnedCount: number; skippedCount: number }
  | { outcome: "lock-held" };   // AC-2

export interface SpawnGateConfig {
  maxConcurrentReactions: number;   // default 3, machine-wide (COND-4)
  maxCostUsdPerWindow: number;       // machine-wide cost ceiling (COND-4)
}

export type SpawnGateDecision =
  | { allow: true }
  | { allow: false; reason: "concurrency-cap" | "cost-ceiling" };

export interface ReactionSpawn {
  finding: Finding;
  action: "intake" | "pr-fix" | "crew-fix" | "issue-broker-file";
  command: string;      // the `claude -p "..."` invocation string
  cwd: string;            // RegistryEntry.path
}
```

## Open trade-offs for the user / next slices

1. `loop.json`'s `watch.shard` field (this machine's own shard identity) is
   named here but not fully specified — SLICE-143 should confirm whether it
   lives in `.claude/loop.json` (repo-scoped, awkward for a machine-wide
   concept) or a new `~/.claude/watch/machine.json` (machine-scoped, cleaner
   fit, but a second global file). Flagging rather than deciding — this is
   a scope call, not a shape call.
2. `state.mts`'s lock-sibling directory (`<path>.lock/`) needs a stale-lock
   reap policy (crashed process leaves the lock dir behind) — mirror
   whatever `tick.lock`'s AC-2 test settles on for consistency; not
   specified further here.

## Build Sequence

| Phase | Files | Change type | Acceptance criteria | Validation command |
|---|---|---|---|---|
| 1 (SLICE-143) | `src/scripts/lib/watch/types.mts`, `watch/registry.mts`, `watch/state.mts`, `watch/tick.mts`, `src/scripts/lib/watch.mts` (barrel) | add | AC-1, AC-2 pass; registry validation rejects duplicate `ghSlug` | `bun test src/tests/watch-*.mts` |
| 2 (SLICE-144) | `watch/claims.mts` | add | AC-3 (claim-before-spawn ordering), TTL self-heal test | `bun test src/tests/watch-claims.mts` |
| 3 (SLICE-145) | `watch/spawn-gate.mts` | add | AC-4 (cap + cost-ceiling skip), AC-5 (no lost updates) | `bun test src/tests/watch-spawn-gate.mts` |
| 4 (SLICE-146) | `watch/envelopes.mts`, `commands/watch.md`, scheduler setup script | add | AC-6, AC-7 (no `process.platform` in `watch-tick.mts`), AC-8 (shared tick function) | `bun test src/tests/watch-envelopes.mts && grep -c process.platform src/scripts/watch-tick.mts` |

verifier: none (topology/schema sketch — no OpenAPI/Mermaid emitted this pass).
