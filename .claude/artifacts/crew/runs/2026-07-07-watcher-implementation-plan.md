# Watcher implementation plan (standalone Track B/C) — 2026-07-07

**Status: APPROVED-WITH-CONDITIONS** (opus architect-reviewer, 2026-07-07,
standalone pass). Conditions folded in below (marked [COND-n]); B1 clear to
start as-is.

Scope: multi-repo issue/build watcher + cross-repo tracker provider.
DORA correctness lives in `2026-07-07-dora-implementation-plan.md`
(APPROVED-WITH-CONDITIONS; ACs in `2026-07-07-dora-acs-eta.md`). Tracks are
independent — no cross-track sequencing.

Validation state: design reviewed by opus architect-reviewer 2026-07-07
(combined-plan pass); factual claims fact-checked by opus researcher with
file:line evidence. Both sets of feedback folded in below.

## Goal

Up to 20 repos watched from 1-2 dev machines. Every ~5 min: detect new
issues, broken builds, red PRs, deployment failures. React automatically:
file/route tickets, dispatch loop fix actions. No open terminals required.
Observable in astrarunner fleet dashboard.

## Architecture — headless two-layer (decided 2026-07-07)

**Layer 1 — deterministic tick, zero LLM.** `watch-tick.mts` (pure Bun),
run by OS scheduler (Windows Task Scheduler / cron) every 5 min per
machine:

- reads registry + per-repo state, sweeps assigned shard:
  `gh issue list` delta, `gh run list --status failure`, open-PR
  `statusCheckRollup`
- emits `watch.tick` envelope via existing `fanoutEnvelope`
  (webhook-fanout.mts); updates state; exits
- quiet tick = zero tokens, ~seconds
- tick lockfile prevents overlapping runs on one machine

**Layer 2 — headless Claude reaction, one per finding.** Layer 1 sets a
claim label, then spawns:

- new issue → `claude -p "/runner:intake --from-issue <url>"` (cwd = target
  repo, tier-1 only)
- red build/PR → `claude -p "/runner:pr-fix <n> ..."` (pr-fixer categorize +
  circuit breaker, `priorAttempts` from state file)
- regression → `claude -p "/crew:fix ..."`
- cross-repo root cause → IssueBroker files issue in the other repo (C1)
- emits `watch.reaction` envelope per action

Permissions: pre-configured allowlist for headless runs (settings
permissions / --allowedTools). NEVER --dangerously-skip-permissions.
Scoping owned by B3.

`/runner:watch` = interactive/debug entry over the same tick logic (pilot
debugging, live escalation). Open `/loop 5m` session is fallback mode.

## Registry + state

```
~/.claude/watch/
  repos.json                 # registry, git-versioned for multi-machine sync
  state/<ghSlug-hash>.json   # per-repo: lastSeenIssue, attemptCounts,
                             # costSpent — atomic temp+rename writes
  tick.lock
```

Registry entry:
`{path, ghSlug, shard, tier, checks, tenantId, appId}`

- `tenantId`/`appId` REQUIRED (arch review): astrarunner ingest is
  multi-tenant; a fleet-spanning watcher breaks the one-tenant-per-repo
  assumption every other ingest path relies on. Attribution decided at
  emit time from registry, not inferred at ingest.
- `tier`: `1` = loop-installed (full react: intake/pr-fix/crew:fix; needs
  `.claude/loop.json` + webhook config in that repo). `2` = watch-only (no
  loop install; detect → file/update tracker issue via IssueBroker → done).
  This tiering is why cross-repo filing cannot live on TaskStoreProvider —
  tier-2 repos have no loop config to resolve a provider from.
- Registry sync across machines: git-versioned file for fleet v1;
  astrarunner-served endpoint later (avoids hard uptime dependency now).
  Explicit: only `repos.json` is git-synced; `state/` and `tick.lock` are
  machine-local, never synced (shard exclusivity makes per-machine state
  authoritative for its shard).

State-file facts (validated): pr-watch's breaker state is process-local and
does not survive restarts — persistent per-repo state is NEW work, not
reuse. Cost-ceiling pattern (pr-watch.mts:27-327) and circuit-breaker
pattern (pr-fixer.mts:179-249) are real and get reused as logic, not as
state storage.

## Cross-machine safety

- Shard exclusivity enforced: registry validation refuses overlapping
  shards; watcher refuses to start on shard mismatch. [COND-3] Shard
  exclusivity IS the cross-machine safety net — claim labels are not
  (GitHub label add is idempotent, not compare-and-swap; two machines can
  both add + readback-pass in a tight race).
- Claim label (`gh issue edit --add-label loop-claimed` + timestamped state
  entry) BEFORE reacting — [COND-3] scoped as intra-machine / cross-tick
  idempotency ("don't re-react to what I already claimed"), not cross-
  machine dedup. Local lock files (gh-rate-limiter.mts pattern — actually a
  per-PR dispatch mutex) are per-machine only.
- [COND-1] Orphaned-claim recovery: claim gets TTL via timestamped
  companion entry in the state file (GH labels carry no metadata). Expired
  claim = stealable. Pilot exit test: kill Layer 2 mid-reaction, verify
  claim self-heals after TTL.
- [COND-2] State-file write ownership split between tick and reaction:
  tick owns detection fields (`lastSeenIssue`, tick timestamps); reaction
  processes own their reaction record (`attemptCounts`, `costSpent`) in a
  separate file or keyed section merged on read — read-modify-write races
  between a tick and its still-running reaction must not lose updates.
  Atomic temp+rename alone prevents corruption, not lost updates.
- [COND-5] Shard reassignment is not hot-swappable: operator guidance —
  stop both watchers (or pause ticks), git-pull registry on both machines,
  resume. Registry git-sync is not instantaneous; editing shards live
  creates a window where both/neither machine owns a repo.
- Per-tick gh call budget with skip-cap — flat 40-60 calls/tick estimate
  undercounts per-open-PR `gh pr checks` fanout on busy repos.
- [COND-4] Fleet-wide reaction concurrency + cost ceiling per machine
  (not just per-repo): a correlated failure (shared CI dependency breaking
  many repos at once) must not spawn unbounded parallel headless sessions.
  Global cap (e.g. 3 concurrent reactions/machine, N $/hour ceiling)
  enforced by Layer 1 before spawning.

## Work items

### B1 — watcher MVP (plugin) [M]

`watch-tick.mts` + registry/state modules + `/runner:watch` command +
scheduler setup script (Task Scheduler registration). Emits
`watch.tick`/`watch.reaction` (RawEnvelopeHandler already persists unknown
kinds verbatim into `loop_events` — validated; NOTE: they do NOT become
`loop.raw`, that string is a resync-subsystem fallback only). Concurrency
cap ~3 reactions; per-repo circuit breaker; per-tick cost ceiling.

### B1.5 — pilot checkpoint [gate, ≥3 days]

2-3 repos (suggest: runner-plugin + astrarunner + one active repo — gives a
real cross-repo case), 1 machine, claim labels ON from day one. Exit
criteria before any fleet rollout:

- unattended reaction completion ≥70% (current dispatch pause rate 66.7% is
  the known weak link — watcher dispatches/files only, never inlines fixes)
- zero duplicate reactions
- state files intact after kill mid-tick
- [COND-1] orphaned claim self-heals: kill Layer 2 mid-reaction (claim set,
  reaction dead) → claim expires per TTL → next tick steals cleanly
- [COND-2] no lost updates when a tick fires while a reaction is mid-write
  on the same repo's state
- gh call budget validated against rate-limit headers
- sharding/multi-machine design finalized here

### B2 — astrarunner watchers panel [M]

- New `ILoopEventHandler` for `watch.tick`/`watch.reaction` with projection
  table + index (validated: generic `loop_events` rows have no per-kind
  index; ad-hoc kind queries are not a dashboard-grade path).
- [COND-7] Projection table carries mandatory `tenant_id` + nullable
  `app_id` under the same tenant-isolation constraint the rest of
  astrarunner enforces (claim-derived tenant, Forbid on mismatch) —
  values come from the emitting watcher's registry entry.
- FleetOverviewPage "Watchers" panel: last tick per machine/shard,
  reactions, stalls.
- Server-side staleness alert: ≥3 missed ticks → alert (machine-offline
  detection cannot be a passive dashboard field — a dead watcher can't
  self-report).

### B3 — credentials + permission scoping [S-M]

- Fine-grained least-privilege PAT for watcher gh calls: per-org/repo
  allowlist, issues:write only where filing is needed, separate from
  operator's personal token. Documented behavior for unreachable private
  repos.
- Headless permission allowlist definition for Layer 2 reaction sessions.
- Always-on LLM-driven automation must not hold a broad-write token —
  this item gates fleet rollout same as B1.5.

### C1 — IssueBroker port (plugin) [S-M per COND-8 — owns the idempotency
contract + tests across two provider backends]

Separate port in watcher subsystem — NOT `TaskStoreProvider.createIssue`
(arch review: ISP violation; task-store is repo-bound lifecycle sync,
target repos may have no loop config at all).

- `fileIssue({targetGhSlug, title, body, labels}) → externalId | null`,
  non-throwing on backend failure.
- Keyed off registry entry (ghSlug); composes GithubProvider/LinearProvider
  implementations internally.
- Idempotency contract (arch review risk #3): deterministic title hash +
  `loop-filed` label; `gh issue list --search` before create; a persisting
  root cause must NOT be re-filed every 5 minutes.
- [COND-6] Accepted bounded residual risk: search-before-create has a race
  window — two DIFFERENT source repos detecting the same root cause in
  target repo B can file concurrently. Worst case is a duplicate ticket
  (not corrupted state); acceptable at this scale. Cheap follow-up dedup
  pass (periodic title-hash scan closing dupes) is a post-pilot chore, not
  a C1 blocker.

### C2 — LinearProvider real implementation [M]

Linear GraphQL API; team/project mapping in loop.json `taskStore.linear.*`.
Serves both task-store lifecycle (existing stub at
`task-store/providers/linear-provider.mts` — every method throws today)
and IssueBroker composition.

### C3 — tracker-as-queue cross-repo flow [S, mostly glue]

Watcher A detects root cause in repo B → IssueBroker files idempotently →
repo B's watcher picks it up via `--from-issue` next tick (tier-1) or it
waits for a human (tier-2). No direct cross-repo dispatch; the tracker IS
the queue.

## Layout: pilot vs fleet

| Concern | Pilot (2-3 repos, 1 machine) | Fleet (20 repos, 2 machines) |
|---|---|---|
| Registry | 1 file, shard 1 | same file git-synced; shards 1/2, overlap refused |
| Execution | 1 scheduled task | 1 scheduled task per machine |
| Dedup | claim labels (proving mechanism) | claim labels load-bearing |
| Tenant | near-trivial | tenantId/appId per entry drives attribution |
| Observability | raw loop_events rows | B2 panel + staleness alert |
| Token | operator gh auth acceptable | B3 PAT mandatory |
| Repo tiers | all tier-1 | tier-1 (loop-installed) + tier-2 (watch-only) |

Migration pilot→fleet = registry edits + second scheduled task + B2/B3 on.
No watcher code changes if B1.5 exit criteria hold.

## Sequencing

B1 → B1.5 (gate) → C1 → C3 → B2 → C2. B3 runs alongside B1/B1.5 and gates
fleet rollout. Independent of DORA track entirely.

## Risks (ranked)

1. Cross-machine double-reaction — shard exclusivity + claim labels;
   proven at pilot.
2. Reaction quality (pause rate 66.7% on recent dispatches) — pilot
   measures; circuit breakers bound cost; watcher never inlines fixes.
3. Cross-repo re-filing loop — C1 idempotency contract.
4. Missing tenant mapping — registry schema requirement, done in B1 not B2.
5. gh rate limits — per-tick budget + skip-cap, verify at pilot.
6. Token exposure — B3.
7. Scheduler platform drift (Task Scheduler vs cron) — keep setup script
   per-platform, tick script platform-neutral.

## Open decisions

- Registry sync mechanism at fleet scale (git file v1 chosen; revisit
  astrarunner endpoint later).
- Which 17 repos beyond pilot set, and their tier assignments.
- Linear adoption timing (C2 has no dependency pressure until a Linear
  workspace is actually in use).

## Next steps

1. File B1/B1.5/B3/C1 FEATs via `/runner:intake` (this repo's backlog).
2. B2 FEAT into astrarunner backlog.
3. Pilot registry draft (3 repos) at B1 completion.
