# Watcher implementation — ACs, autonomous_safe, ETA — 2026-07-07

Input: `2026-07-07-watcher-implementation-plan.md` (APPROVED-WITH-CONDITIONS, opus
architect-reviewer, standalone pass, [COND-1]..[COND-8] folded into the plan).
Scope: B1, B1.5, B2, B3, C1, C3. **C2 (LinearProvider) excluded/deferred** —
no dependency pressure until a Linear workspace is in use; no ETA attempted.
ACs follow the FEAT-277 inline-AC contract (`agents/pm.md` § "Inline AC + SPEC
drafting") — Given-When-Then, each naming its evidence. Sibling artifact:
`2026-07-07-dora-acs-eta.md` (style/format reference).

Repos: `C:\work\mega\runner-plugin` (loop plugin, Bun/TS — B1, B1.5, B3, C1,
C3) and `C:\work\mega\runner` (astrarunner .NET + React — B2).

## B1 — watcher MVP (plugin)

**ACs**

- AC-1: Given a registry (`~/.claude/watch/repos.json`) with N repo entries
  assigned to this machine's shard, When `watch-tick.mts` runs, Then it
  sweeps every assigned entry (gh issue list delta / `gh run list --status
  failure` / open-PR `statusCheckRollup`) and exits without invoking any LLM
  call — evidenced by a unit test asserting zero `claude -p` spawns during a
  quiet tick and a per-repo sweep-count assertion.
- AC-2: Given a tick in progress (lockfile held), When a second tick fires
  on the same machine before the first exits, Then the second tick exits
  immediately without sweeping — evidenced by a test that holds the
  lockfile and asserts the second invocation's early-return + exit code.
- AC-3: Given a finding (new issue / red build / red PR) not previously
  claimed, When Layer 1 processes it, Then it sets a claim label via `gh
  issue edit --add-label loop-claimed` (or equivalent PR/run marker) AND
  writes a timestamped claim entry to that repo's state file BEFORE
  spawning any Layer 2 `claude -p` reaction — evidenced by a test asserting
  claim-write happens-before spawn (ordering, not just presence).
- AC-4 [COND-4]: Given machine-wide concurrent reactions at the configured
  cap (default 3) and/or the configured cost ceiling, When a new finding
  would exceed either, Then Layer 1 skips spawning and records a
  `skipped_ceiling` note in state (finding remains unclaimed for next tick)
  — evidenced by a test seeding 3 in-flight reactions and asserting the
  4th finding is not spawned, plus a cost-ceiling variant of the same test.
- AC-5 [COND-2]: Given a tick's detection write (`lastSeenIssue`, tick
  timestamp) and a concurrently-running reaction's write (`attemptCounts`,
  `costSpent`) to the same repo's state, When both complete, Then neither
  write is lost — evidenced by a test that interleaves a tick write and a
  reaction write against the same state file and asserts both field sets
  are present after both complete (not just that the file parses).
- AC-6: Given `watch.tick` / `watch.reaction` envelopes are emitted via
  `fanoutEnvelope` (webhook-fanout.mts), When they reach astrarunner's
  ingest, Then they persist verbatim as unknown-kind rows in `loop_events`
  (no `loop.raw` misrouting) — evidenced by an envelope-shape unit test in
  this repo plus a note that FEAT-B2 owns the projection-side assertion.
- AC-7: Given the Task Scheduler / cron setup script runs on Windows, When
  it registers the scheduled task, Then the task invokes `watch-tick.mts`
  on a 5-minute interval and the tick script itself is platform-neutral
  (no OS-specific branching inside `watch-tick.mts`) — evidenced by a
  script-registration smoke test (or documented manual verification step
  if Task Scheduler registration can't be exercised in CI) plus a grep
  assertion that `watch-tick.mts` has no `process.platform` branches.
- AC-8: Given `/runner:watch` is invoked interactively, When it runs, Then
  it executes the same tick logic as the scheduled path (no divergent
  code path) — evidenced by a test asserting `/runner:watch`'s command
  handler calls the same exported tick function as the scheduler entry
  point.

**autonomous_safe: true** — new module + CLI command following existing
patterns (fanoutEnvelope, cost-ceiling from pr-watch.mts, circuit-breaker
from pr-fixer.mts are reused as logic); no cross-repo schema change; ACs
above are independently testable in this repo.

## B1.5 — pilot checkpoint (operational gate, not a buildable FEAT)

Model as a **checklist/milestone FEAT** (frontmatter `type: milestone` or
equivalent gate marker), not a scored autonomous_safe item — its
"acceptance criteria" are pilot-run outcomes observed over ≥3 wall-clock
days on a human-operated machine, not code the loop builds and closes in a
slice. The loop can build B1 (which B1.5 depends on) but a human runs and
observes the pilot itself.

**ACs (pilot exit criteria — human-verified, evidence = pilot state files
+ operator log, not automated tests)**

- AC-1: Given 2–3 pilot repos (suggested: runner-plugin + astrarunner + one
  active third repo, chosen to exercise a real cross-repo case) running on
  1 machine with claim labels on from day one, When the ≥3-day pilot
  window closes, Then unattended reaction completion is ≥70% — evidenced
  by a tally of `watch.reaction` outcomes in state files / loop_events
  over the window.
- AC-2: Given the same pilot window, When reactions are reviewed, Then
  zero duplicate reactions occurred for the same finding — evidenced by a
  manual/scripted scan of claim labels + reaction records for repeats.
- AC-3 [COND-1]: Given Layer 2 is killed mid-reaction (claim set, reaction
  process dead), When the claim's TTL expires, Then the next tick steals
  the claim cleanly and completes the reaction — evidenced by a documented
  pilot test: operator kills a live `claude -p` reaction process, observes
  claim state before/after TTL expiry, and confirms the next tick's
  behavior in the state file / logs.
- AC-4 [COND-2]: Given a tick fires while a reaction is mid-write on the
  same repo's state, When both complete, Then no update is lost —
  evidenced by re-confirming AC-5 from B1 under real pilot load (not just
  the synthetic unit test), captured in the pilot log.
- AC-5: Given the pilot's actual `gh` call volume per tick, When compared
  against GitHub's rate-limit headers, Then the per-tick budget assumption
  (40–60 calls/tick) is validated or revised — evidenced by an operator
  note recording actual observed call counts vs. remaining-rate-limit
  headers across the window.
- AC-6: Given the pilot's operational experience, When the window closes,
  Then a finalized sharding/multi-machine design is written up (informing
  B2/B3 fleet rollout) — evidenced by an addendum to this plan or a new
  design note under `docs/superpowers/specs/`.

**autonomous_safe: false (not applicable — operational gate, not a build
item)** — no code change to grade; the loop's role is limited to having
already shipped B1 correctly. A human runs and evaluates the pilot.

## B2 — astrarunner watchers panel

**ACs**

- AC-1: Given a `watch.tick` or `watch.reaction` envelope reaches
  astrarunner ingest, When a new `ILoopEventHandler` processes it, Then it
  writes to a dedicated projection table (not the generic `loop_events`
  jsonb blob) with an index supporting per-machine/per-shard lookup —
  evidenced by an EF Core migration + a handler test asserting a row lands
  in the new table with queryable columns.
- AC-2 [COND-7]: Given the emitting watcher's registry entry carries
  `tenantId`/`appId`, When the projection row is written, Then it carries
  a mandatory `tenant_id` column and a nullable `app_id` column, both
  sourced from the envelope (not inferred at ingest) — evidenced by a
  handler test asserting tenant_id is required (row rejected/erroring if
  absent) and app_id is nullable, plus a test confirming values are
  attributed at emit time, matching the tenant-isolation pattern used
  elsewhere in astrarunner (claim-derived tenant, Forbid on mismatch).
- AC-3: Given the FleetOverviewPage, When it renders the new "Watchers"
  panel, Then it shows last tick per machine/shard and recent reactions —
  evidenced by an RTL/component test asserting the panel renders
  machine/shard/timestamp/reaction-count fields from a seeded projection
  fixture.
- AC-4: Given a machine/shard has missed ≥3 consecutive expected ticks
  (interval known from registry), When the server-side staleness check
  runs, Then it raises a stall/offline alert — evidenced by a backend test
  seeding a gap in tick timestamps and asserting the alert condition
  fires, plus a test confirming it does NOT fire below the 3-miss
  threshold.

**autonomous_safe: true** — additive `ILoopEventHandler` + projection
table + dashboard panel following astrarunner's existing ingest-handler
pattern; the one non-trivial piece (tenant_id/app_id enforcement) reuses
an existing isolation convention rather than inventing one. Flag for
review if astrarunner's migration conventions require a DBA-style
check — otherwise standard additive schema work.

## B3 — credentials + permission scoping

**ACs**

- AC-1: Given the watcher's `gh` calls, When a fine-grained PAT is
  provisioned, Then it is scoped to only the registry's listed
  org/repos with `issues:write` limited to repos where filing is
  configured, and is a distinct token from the operator's personal
  credential — evidenced by a documented token-scope manifest (repo list
  + permission list) checked against the PAT's actual granted scopes
  (via `gh api` token-introspection or documented manual verification).
- AC-2: Given a registry entry for a private repo the PAT cannot reach,
  When a tick attempts to sweep it, Then the tick logs a clear
  "unreachable / insufficient scope" state rather than failing silently
  or crashing the whole tick — evidenced by a test simulating a 403/404
  from `gh` for one repo and asserting the tick continues sweeping
  remaining repos with a recorded per-repo error state.
- AC-3: Given Layer 2's headless `claude -p` reaction sessions, When they
  run, Then they execute under a pre-configured permission allowlist
  (settings permissions / `--allowedTools`) and NEVER pass
  `--dangerously-skip-permissions` — evidenced by a grep/lint check over
  the spawn call sites plus a unit test asserting the constructed command
  args never include that flag.
- AC-4: Given B1.5/fleet rollout readiness, When B3's token + allowlist
  are not yet in place, Then fleet rollout (2+ machines / >pilot repo
  count) is blocked — evidenced by an operator checklist item tying B3
  completion to the pilot→fleet migration step in the plan's layout table.

**autonomous_safe: false** — PAT creation and scope grants are an
operator/GitHub-org action outside the loop's write surface (the loop
cannot create org-level tokens); this item is human-in-the-loop for the
credential-provisioning half. The code-side allowlist wiring (AC-2, AC-3)
is mechanical and could be split out as `autonomous_safe: true` if filed
as a separate sub-FEAT — see split below.

## C1 — IssueBroker port (plugin)

**ACs**

- AC-1: Given a target repo identified by `ghSlug` from the registry, When
  `fileIssue({targetGhSlug, title, body, labels})` is called, Then it
  returns an `externalId` on success or `null` on backend failure without
  throwing — evidenced by unit tests for both the success path and a
  simulated backend-failure path (network error / API error), asserting
  no exception propagates.
- AC-2: Given `IssueBroker` composes `GithubProvider` (and, later,
  `LinearProvider`) internally, When it is instantiated, Then it is NOT
  layered on `TaskStoreProvider.createIssue` and has no dependency on a
  target repo having `.claude/loop.json` — evidenced by a test filing an
  issue into a registry entry with no loop config present, asserting
  success purely off the registry's `ghSlug`.
- AC-3: Given a root-cause title, When `fileIssue` is called twice with
  the same deterministic title hash within the recheck window, Then the
  second call detects the existing `loop-filed`-labeled issue via `gh
  issue list --search` and does NOT create a duplicate — evidenced by a
  test asserting exactly one `gh issue create` call across two `fileIssue`
  invocations with identical title-hash input.
- AC-4 [COND-6]: Given two DIFFERENT source repos detect the same root
  cause in target repo B within the search-before-create race window,
  When both call `fileIssue` concurrently, Then the accepted outcome is at
  most one duplicate ticket (not corrupted state, not a crash) — evidenced
  by a concurrency test asserting both calls complete without error and
  documenting (not necessarily preventing) the possible duplicate; a
  follow-up dedup sweep is explicitly out of scope for this FEAT's AC set
  per [COND-6].
- AC-5 [COND-8]: Given C1 is scoped at S-M "owns the idempotency contract
  and tests across two provider backends," When GithubProvider composition
  ships without LinearProvider yet implemented, Then the idempotency
  contract (title-hash + `loop-filed` label + search-before-create) is
  exercised and tested against GithubProvider now, with the same contract
  documented as the required test shape for LinearProvider composition
  once C2 lands — evidenced by the test suite covering GithubProvider
  fully and a code comment / doc note marking the LinearProvider slot as
  pending C2.

**autonomous_safe: true** — new port composing an existing GithubProvider
implementation; the accepted residual risk [COND-6] is explicitly
descoped from this FEAT's AC set rather than left ambiguous, so scope is
bounded and testable without needing a human call on the dedup-race
design.

## C3 — tracker-as-queue cross-repo flow

**ACs**

- AC-1: Given watcher A (repo A) detects a root cause whose fix belongs in
  repo B, When it calls C1's `fileIssue` against repo B, Then no direct
  cross-repo dispatch occurs — the only cross-repo signal is the filed
  issue — evidenced by a test asserting watcher A's code path never
  invokes a `claude -p` spawn targeting repo B's cwd.
- AC-2: Given repo B is tier-1 (loop-installed) and the filed issue exists
  at repo B's next tick, When repo B's `watch-tick.mts` sweeps, Then it
  detects the filed issue as a new-issue finding and reacts via
  `/runner:intake --from-issue <url>` exactly as it would for any
  organically-filed issue — evidenced by a test seeding a `loop-filed`
  issue and asserting the tier-1 reaction path is invoked with no special
  casing beyond the existing new-issue flow.
- AC-3: Given repo B is tier-2 (watch-only, no loop config), When the
  issue is filed, Then no automated reaction is attempted for repo B — the
  issue waits for a human — evidenced by a test asserting a tier-2
  registry entry never triggers a Layer 2 spawn regardless of finding
  type.

**autonomous_safe: true** — described in the plan as "mostly glue"; wires
existing C1 output into the existing tier-1/tier-2 tick logic from B1, no
new external dependency or data-shape change.

## ETA

Assumptions: single machine per repo for pilot-phase estimates (B1, B1.5);
reviewer ladder `["A"]` (single reviewer) and `validation.satisfiedByReview:
true` confirmed for runner-plugin (both this repo's settings — all items
below except B2 land here). Astrarunner's own reviewer-ladder/validation
settings are not visible from this repo; B2's estimate assumes a comparable
single-reviewer setup — if astrarunner runs a two-reviewer default plus an
independent validator, add ~30–50%. B1.5's wall-clock is dominated by the
mandated ≥3-day pilot soak, which is calendar-bound, not effort-bound — no
amount of parallel dispatch shortens it.

| Item | Slices | Wall-clock | Notes |
|---|---|---|---|
| B1 | 4 (tick core + registry/state modules; claim-label + TTL logic; concurrency/cost ceiling; scheduler setup script + `/runner:watch` command) | 2–3 days | new-pattern risk in state-write ownership split (COND-2); scheduler script is Windows-first, cron is a documented variant not a separate slice |
| B1.5 | 0 build slices (operational gate) | ≥3 days (calendar, not effort) | depends on B1 merged + deployed; wall-clock is the pilot soak itself, not construction time |
| B3 (code-side allowlist wiring only; PAT provisioning is human, not slice-estimable) | 1 | 0.5 day | credential creation itself has no loop ETA — it's an operator action against GitHub org settings |
| C1 | 2 (fileIssue + GithubProvider composition; idempotency contract tests incl. concurrency case) | 1–1.5 days | COND-8 scope (owns idempotency contract) folded into slice 2, not a separate slice |
| C3 | 1 | 0.5 day | "mostly glue" per plan; depends on both B1 (tier-1/tier-2 tick logic) and C1 |
| **Total, pilot-ready (B1 + B3 code-side)** | **5** | **~2.5–3.5 days build** + then B1.5's ≥3-day soak starts | B3's PAT provisioning (human) can run in parallel with B1 build, not on the critical path if started early |
| **Total, fleet-ready (through B2)** | **9 (adds B2's 4)** | **~2.5–3.5 days build (runner-plugin) + ≥3 days pilot soak (serial, gates fleet) + 1.5–2 days build (astrarunner B2, can run in parallel with the pilot soak)** | B2 has no dependency on B1.5's outcome structurally, but shipping it live before the pilot validates the design risks building dashboard scaffolding around a data shape that changes post-pilot — recommend holding B2 merge-to-main until B1.5 exits, even though the code itself can be written in parallel |

B2 alone: 4 slices (ILoopEventHandler + projection table/migration; tenant_id/app_id
enforcement; FleetOverviewPage panel; staleness alert), ~1.5–2 days.

## Suggested FEAT split

1. **FEAT (runner-plugin)** — "Watcher MVP: deterministic tick + registry/state
   + scheduler setup" → B1. `autonomous_safe: true`. No inbound dependency;
   blocks C1, C3, and (operationally) B1.5.
2. **FEAT (runner-plugin, milestone/checklist type, not scored)** — "Pilot
   checkpoint: 2–3 repo watcher soak, ≥3 days" → B1.5. Frontmatter:
   `depends_on: <B1 FEAT id>`, `type: milestone` or equivalent gate marker
   so PM triage doesn't try to score it as a normal build item. Human-run;
   the loop's only role is having shipped B1 correctly beforehand.
3. **FEAT (runner-plugin)** — "Watcher headless-reaction permission
   allowlist (code-side)" → B3's allowlist wiring only (AC-2, AC-3 above).
   `autonomous_safe: true`. Split from PAT provisioning deliberately: the
   code half is loop-buildable, the credential half is not. Note in the
   body: "PAT creation/scoping is a separate human action against the
   GitHub org — track as a checklist item in this FEAT's description, not
   as a slice."
4. **FEAT (runner-plugin)** — "IssueBroker port: cross-repo issue filing
   with idempotency contract" → C1. `autonomous_safe: true`. Depends only
   on B1 existing (registry shape); no dependency on B1.5's outcome.
5. **FEAT (runner-plugin)** — "Tracker-as-queue: tier-1/tier-2 cross-repo
   pickup flow" → C3. `autonomous_safe: true`. `relates_to: <C1 FEAT id>`
   plus `depends_on: <B1 FEAT id>` (same-repo depends_on is valid here
   since both are runner-plugin FEATs).
6. **FEAT (astrarunner)** — "Watchers fleet panel: projection table +
   FleetOverviewPage + staleness alert" → B2. `autonomous_safe: true`.
   Frontmatter: `relates_to: <runner-plugin B1 FEAT id>` (cross-repo, plain
   `depends_on` only resolves same-repo ids) with a body note that live
   `watch.tick`/`watch.reaction` envelopes must be flowing (i.e., B1
   deployed) before this FEAT's ingest-handler slice can be tested
   end-to-end; recommend holding this FEAT's merge until B1.5 exits so the
   projection schema isn't built against a pre-pilot design that changes.

That's 6 FEATs across two repos (1 astrarunner, 5 runner-plugin, one of the
five a non-scored milestone gate), plus C2 explicitly deferred with no FEAT
filed yet.

## Risks affecting ETA confidence

1. **Reaction quality / pause rate**: current dispatch pause rate is 66.7%
   (from the loop snapshot) — this is the single biggest unknown for
   B1.5's "≥70% unattended completion" exit criterion, since the watcher's
   Layer 2 reactions are themselves headless `claude -p` dispatches subject
   to the same pause dynamics. If pause rate doesn't improve, B1.5 may not
   pass on the first pilot window, extending the gate by another ≥3-day
   soak cycle rather than a fixed slice count.
2. **Windows Task Scheduler platform quirks**: the setup script targets
   Windows Task Scheduler first (this machine); cron parity for a second
   pilot machine is a documented variant, not yet built/tested — if the
   second pilot machine is Linux/macOS, add a small (~0.5 day) buffer to
   B1's scheduler slice for cross-platform verification.
3. **`gh` rate limits at scale**: the flat 40–60 calls/tick estimate is
   explicitly flagged in the plan as undercounting busy-repo `gh pr checks`
   fanout; B1.5's AC-5 exists specifically to catch this before fleet
   rollout, but a mid-pilot surprise here (hitting secondary rate limits)
   could force a mid-soak design change to B1, effectively restarting part
   of the pilot clock.
4. **Pilot soak is wall-clock-bound, not effort-bound**: B1.5's ≥3-day
   minimum cannot be compressed by additional dispatch parallelism or more
   engineering effort — it is a calendar constraint. Total fleet-ready
   wall-clock is dominated by this gate, not by build slices; plan
   accordingly if a stakeholder asks "how fast can this go" — the answer
   is bounded below by the soak, not by loop throughput.
5. **B1.5 is not independently loop-gradeable**: because it's a milestone
   rather than a scored FEAT, there's no `grade.recorded` event or
   automatic backlog-close signal for it the way there is for B1/C1/C3 —
   the operator must manually confirm exit criteria and manually unblock
   B2's merge-to-main recommendation; this is a process risk (someone
   forgets to check) more than a technical one.

## AC coverage note

All ACs above are testable with named evidence (test file/kind, grep
check, or documented operator-verification step), with two explicit
exceptions carried over from the plan's own framing rather than invented
here: B1.5's ACs are pilot-observed outcomes (operator log + state-file
inspection), not unit tests, because the gate itself is an operational
soak, not code; and C1's AC-4 documents rather than prevents the
[COND-6] duplicate-ticket race, per the plan's explicit acceptance of that
residual risk. B3's PAT-provisioning half has no AC in the testable sense
at all — it's a checklist item for a human action outside the codebase,
noted in the FEAT split above rather than forced into a Given-When-Then
shape it doesn't fit.
