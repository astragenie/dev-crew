# Halt-badge registry

**Owner:** loop plugin.
**Origin:** FEAT-063 / SLICE-60. Derives from SPEC-003 (halt-badge observability across plugin boundary).

## Purpose

The loop walker emits structured halt signals as fields under `snapshot.*` in the output of `node scripts/loop.mjs stop-check` and `node scripts/loop.mjs brief`. When any such field is non-null, the walker has detected a condition that warrants attention — either a hard halt or a soft signal the operator should resolve before rolling the next slice.

This file is the **single source of truth** for every halt-badge field loop emits. Downstream consumers (crew `brief-me` renderer, loop `--explain-halts` flag, schema regression tests) iterate this registry instead of hard-coding field names.

## Where halt-badges live in the JSON

```json
{
  "shouldStop": false,
  "reasons": [],
  "blockers": [],
  "suggestions": [],
  "iterationCapReached": false,
  "snapshot": {
    "...": "(other snapshot fields)",
    "sliceCostCeiling": null,
    "costRegression": null,
    "sessionDrift": null,
    "gradeTrend": null
  }
}
```

Each halt-badge is `null` when not triggered; populated with a structured object when it fires. Consumers MUST handle `null` as "not triggered, do not render."

## Fan-out envelope contract (halt-events v1)

In addition to the local `snapshot.*` shape above, every populated halt-badge
field is fanned out cross-plugin as a webhook envelope via
`src/scripts/lib/stop-conditions.mts::fanoutHaltBadgesFromSnapshot`. This
section documents the wire contract, distinct from the local snapshot shape
documented per-badge below.

**`halt_badge` envelope** (badge opened / still open) — payload shape per
`schemas/loop-events/halt-badge.schema.json`:

```ts
{
  schemaVersion: "1.0.0";
  badgeKind: string;   // one of HALT_BADGE_FIELDS
  ts: string;           // ISO-8601, this fan-out call's timestamp
  details: object;      // the snapshot.<badgeKind> object
  sliceId?: string;
  waveId?: string;
}
```

**`halt_badge.resolved` envelope** (badge cleared) — payload shape per
`schemas/loop-events/halt-badge-resolved.schema.json`:

```ts
{
  schemaVersion: "1.0.0";
  badgeKind: string;
  ts: string;              // the ORIGINAL opened timestamp, carried through
  sliceId?: string;
  resolvedAt: string;       // ISO-8601, when the clear was detected
  resolverAgentRole?: string; // best-effort, omitted when unavailable
}
```

**Fires when:** `fanoutHaltBadgesFromSnapshot` detects a `snapshot.<badgeKind>`
field that was populated on a previous call (tracked via
`.claude/state/loop/halt-badge-state.json`, see `src/scripts/lib/halt-badge-state.mts`)
and is `null`/absent on the current call. `resolverAgentRole` is read
best-effort from the last entry of `.claude/artifacts/loop/auto-dispatch.jsonl`
(namespace prefix stripped, e.g. `crew:builder` → `builder`) and omitted
entirely when unavailable.

**BE semantics (astrarunner, out of loop's control):** upserts by
`(appId, badgeKind, sliceId)` where `resolvedAt IS NULL`; out-of-order safe
(falls through to insert-new when no matching open row exists). BE defaults
`schemaVersion` to `"1.0.0"` when absent, so this contract is safe to adopt
independently of BE deploy timing.

**Origin:** runner-plugin#297. Contract source: `docs/contracts/halt-events-v1.md`
in `astragenie/astrarunner`.

## Registry

### `snapshot.costRegression`

**Shape:**

```ts
{
  triggered: true;
  currentUsd: number;
  medianUsd: number;
  thresholdUsd: number;
  multiplier: number;
  window: number;
  sampleCount: number;
}
```

**Meaning:** current slice spend exceeded `multiplier × median` of the rolling window of past cost reports.

**Fires when:** `currentUsd > thresholdUsd` AND aggregate cost reports exist AND `sampleCount > 0`.

**Suggested operator action:** review the runaway slice; either accept the trajectory and bump `loop.costRegressionMultiplier` in `.claude/loop.json`, or halt and investigate. Default multiplier is `3.0`, default window is `5` slices.

**Origin:** FEAT-055 / SLICE-52 / v0.12.0. Source: `src/scripts/lib/cost-regression.mts::checkCostRegression`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildRegressionSnapshotEntry`.

---

### `snapshot.sessionDrift`

**Shape:**

```ts
{
  triggered: true;
  sessionIdAtStart: string;
  sessionIdNow: string;
}
```

**Meaning:** the walker is running in a different Claude session than the one that opened the slice. Cross-session work fragments cache and hides cost in `many-sources` alerts.

**Fires when:** `workflow-state.currentRun.sessionId !== process.env.CLAUDE_SESSION_ID` AND both are present. Fail-open when either is missing.

**Suggested operator action:** complete the slice in the original session, OR pass `--allow-cross-session` to `node scripts/loop.mjs auto` to override. The override logs a `session-drift-override` event with a timestamp to `.claude/artifacts/loop/auto-dispatch.jsonl`. Each entry in `auto-dispatch.jsonl` carries a `stepType` discriminator (`"dispatch"` by default; `"session-drift-override"` for the walker's drift-override path) so consumers can distinguish dispatch events from non-dispatch events.

**Origin:** FEAT-056 / SLICE-54 / v0.14.0. Source: `src/scripts/lib/session-drift.mts::checkSessionDrift`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildSessionDriftSnapshotEntry`.

---

### `snapshot.sliceCostCeiling`

**Shape:**

```ts
{
  exceeded: true;
  actualUsd: number;
  ceilingUsd: number;
}
```

**Meaning:** current slice spend crossed the absolute USD ceiling configured for one slice. Distinct from `costRegression`: ceiling is a hard cap unrelated to the rolling median.

**Fires when:** `actualUsd > ceilingUsd`. Default ceiling is `$75` (see `DEFAULT_SLICE_COST_CEILING_USD` in `src/scripts/lib/slice-cost-ceiling.mts`); operator override via `loop.costSliceCeiling`.

**Suggested operator action:** investigate whether the slice scope is too broad. Either narrow the slice and re-open, or accept the cost and raise `loop.costSliceCeiling`.

**Origin:** pre-existing. Source: `src/scripts/lib/slice-cost-ceiling.mts::checkSliceCostCeiling`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildCeilingSnapshotEntry`.

---

### `snapshot.gradeTrend`

**Shape:**

```ts
{
  consecutiveBelow: number;
  threshold: number;
}
```

**Meaning:** last `consecutiveBelow` slice grades were below `threshold` average. Quality regression signal.

**Fires when:** rolling-window of last N grade averages are all below `threshold`. Configurable via `loop.gradeTrendThreshold` (default `0.8`) and `loop.gradeTrendConsecutiveLimit` (default `3`).

**Suggested operator action:** stop and review the slice template for the dimension that fell, or author a SPEC addressing the gap. Walker halts unless `autoMode` is on AND `score-trend` is listed in `loop.warnAlertCategoriesIgnoredInAutoMode` (default `['score-trend']`).

**Origin:** pre-existing. Source: `src/scripts/lib/grade-trend.mts::checkGradeTrend`.

---

### `snapshot.mergeFailed`

**Shape:**

```ts
{
  status: "failed";
  code: "VALIDATION_REQUIRED" | "VALIDATION_FAILED" | "FETCH_FAILED" | "REBASE_CONFLICT" | "MERGE_FAILED" | "PUSH_FAILED" | "BRANCH_MISSING" | "DIRTY_MAIN" | "WORKTREE_MISSING";
  slice: string;
  feature: string | null;
  attemptedBranch: string;
  attemptedWorktree: string;
  failedStep: "validation-gate" | "fetch" | "rebase" | "merge" | "push" | "preflight";
  note: string;
  markedAt: string;
}
```

**Meaning:** the auto-merge stage detected `validation_failed`, a rebase conflict, a merge error, or a push error. The worktree and slice branch are preserved for `/crew:fix` to resume.

**Fires when:** `runAutoMerge` throws `MergeError` AND `opts.dryRun === false`. NEVER set on `--dry-run` (zero-side-effect guarantee). NEVER set when `--no-merge` is passed or when no worktree is active (legacy slices).

**Suggested operator action:**
- `code: "REBASE_CONFLICT" | "MERGE_FAILED"`: run `/crew:fix` against the preserved worktree.
- `code: "PUSH_FAILED"`: run `git push origin main` manually — the commit is already on local main.
- `code: "VALIDATION_FAILED" | "VALIDATION_REQUIRED"`: open the validation artifact to see what failed, then re-run `/runner:slice complete`.

**Origin:** FEAT-062 / SLICE-64 / v0.23.0. Source: `src/scripts/lib/auto-merge.mts::runAutoMerge`. Also surfaced as `currentRun.gates.mergeFailed` in `workflow-state.json`.

---

### `snapshot.redundantReadStop`

**Shape:**

```ts
{
  triggered: true;
  maxReadCount: number;        // highest read_count across any session entry
  path: string;                // worst-offender file path
  sessionId: string;           // session file that holds the offending entry
  threshold: number;           // effective cap (default 5, override via config)
  offendingPathCount: number;  // total distinct paths over threshold
}
```

**Meaning:** the upstream `check-redundant-read` hook (hero-crew plugin) has recorded one or more files re-Read enough times to bust the prompt cache and waste tokens. Loop cannot modify the upstream hook; this gate is a loop-side surrogate that reads the hook's per-session state files and halts the autonomous walker before more redundant reads accumulate.

**Fires when:** any entry in `.claude/state/cost-hygiene/*.json` has `read_count > threshold`. Strict `>` (not `>=`), so the default cap of 5 trips at 6+ reads.

**Suggested operator action:** trust prior Read results; avoid re-reading unchanged paths. Tune `loop.redundantReadCap` in `.claude/loop.json` to relax the gate.

**Feature toggle (FEAT-170 / SLICE-87):** this gate is guarded by the `featuresService`. Set the top-level `features` block in `.claude/loop.json` to disable it cleanly instead of inflating the cap:

```json
{ "features": { "redundant-read-stop": { "enabled": false } } }
```

When disabled, `checkRedundantReadStop` short-circuits to `null` regardless of `redundantReadCap`. Policy is **default-ON** — a missing/malformed `features` entry keeps the gate active. Source: `src/scripts/lib/features-service.mts::isEnabled`.

**Origin:** FEAT-057 / SLICE-67 / v0.25.0. Source: `src/scripts/lib/redundant-read-detector.mts::checkRedundantReadStop`. Companion to the still-pending upstream-request `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`.

---

### `snapshot.marathonCheckpoint`

**Shape:**

```ts
{
  level: "warn" | "hard";          // warn = advisory, hard = stop
  closesSinceCheckpoint: number;   // grade files written after the newest retro
  every: number;                   // configured threshold (default 4)
  hardThreshold: number;           // 2 × every
  lastRetroPath: string | null;    // absolute path of the newest retrospective
}
```

**Meaning:** the autonomous loop has shipped many slices in a row without pausing for a retrospective. Adopts the AgentOps coherent-arc rule — 2-4 atomic arcs per autonomous session, post-mortem mandatory at >=5 — so long backlog walks cannot accumulate unobserved drift.

**Fires when:** the number of grade files (`*-grade.md` under `gradesRoot`, default `.claude/artifacts/loop/grades/`) with `mtime` newer than the newest retrospective file (under `retroRoot`, default `.claude/artifacts/loop/retrospectives/`) reaches `every` (warn) or `2 × every` (hard). When no retrospective exists, the anchor is the unix epoch, so every grade counts.

**Suggested operator action:** run `/runner:retrospective` to capture lessons + decisions. The walker resumes once a fresh retrospective file lands under `retroRoot`. Tune `loop.marathonCheckpointEvery` in `.claude/loop.json` to widen the window for marathon-style sessions; values <= 0 or non-integer fall back to the default rather than disabling.

**Origin:** FEAT-181 / SLICE-92 / v0.40.0. Source: `src/scripts/lib/marathon-checkpoint.mts::checkMarathonCheckpoint`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildMarathonCheckpointSnapshotEntry`.

---

### `snapshot.pausedForExternalEvent`

**Shape:**

```ts
{
  triggered: true;
  reason: string;      // operator-supplied description of the external wait
  resumeHint: string;  // human-readable resume instruction
  pausedAt: string;    // ISO-8601 timestamp written by the pause subcommand
}
```

**Meaning:** an operator has explicitly suspended the autonomous loop to wait for an external event (CI run, PR review, deploy gate, manual approval, etc.). The walker stops immediately; no slice is promoted until the operator removes the pause.

**Fires when:** `.claude/state/loop/paused.json` exists, is valid JSON, and contains `triggered: true`. Fail-open on file-absent, malformed JSON, or missing `triggered` field — none of those cases halt the walker.

**Suggested operator action:** once the external event has resolved, run:

```
bun src/scripts/loop.mts resume --repo <path>
```

This deletes `.claude/state/loop/paused.json`; the next `stop-check` returns `shouldStop: false` (assuming no other conditions are active) and the walker resumes from the current backlog state. No checkpoint replay is needed — slice artifacts ARE the state.

**Origin:** FEAT-128 / SLICE-118. Source: `src/scripts/lib/paused-for-external-event.mts::checkPausedForExternalEvent`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildPausedForExternalEventSnapshotEntry`.

---

### `snapshot.stuckDetected`

**Shape:**

```typescript
interface StuckDetectedSignal {
  sliceId: string;       // slice that has exceeded retry threshold
  attempts: number;      // number of builder attempts without a PASS gate
  threshold: number;     // configured threshold (loop.stuckDetectorThreshold, default 3)
  lastAttemptAt: string; // ISO 8601 timestamp of most recent stuck-tick call
}
```

**Meaning** — The builder has been re-dispatched `attempts` times for `sliceId` without producing a PASS on the review or validation gate. The loop halts to prevent silent cost accumulation.

**Fires when** — `.claude/state/loop/stuck-detector.json` exists AND `attempts >= loop.stuckDetectorThreshold` (default 3). Fail-open: absent file, malformed JSON, or missing required fields return `null`.

**Suggested operator action** — Investigate builder failures. Once root cause is fixed (or slice is narrowed/deferred), run:

```
bun src/scripts/loop.mts stuck-reset --repo <path>
```

This deletes `.claude/state/loop/stuck-detector.json`; the next `stop-check` returns `shouldStop: false` (assuming no other conditions are active) and the walker resumes.

**Origin** — FEAT-130 / SLICE-119. Source: `src/scripts/lib/stuck-detector.mts::checkStuckDetector`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildStuckDetectedSnapshotEntry`.

---

### `snapshot.prWatch`

**Shape:**

```ts
// max-retries variant
{ triggered: true; haltReason: "max-retries"; retriesUsed: number }

// cost-exceeded variant
{ triggered: true; haltReason: "cost-exceeded"; cumulativeCostUsd: number }

// pr-closed variant
{ triggered: true; haltReason: "pr-closed" }
```

**Meaning:** `/runner:pr-watch` terminated abnormally. The `haltReason` field identifies the stop cause. Emitted in the JSON return value of the `pr-watch` CLI command.

**Fires when:**
- `"max-retries"` — completed builder dispatches reached `loop.prWatch.maxRetries` and checks remain failing.
- `"cost-exceeded"` — cumulative estimated cost of builder dispatches in this session reached `loop.prWatch.maxCostUsd`.
- `"pr-closed"` — PR state is `CLOSED` (not merged) at startup or on any poll iteration.

**Suggested operator action:**
- `"max-retries"`: inspect the failing checks manually and push a fix. Re-run `bun src/scripts/loop.mts pr-watch <PR-URL>` after the fix.
- `"cost-exceeded"`: review the failing checks for scope creep. Either raise `loop.prWatch.maxCostUsd` in `.claude/loop.json` or fix the checks manually.
- `"pr-closed"`: the PR was closed without merging. No action from loop is possible.

**Origin:** FEAT-110 / SLICE-134. Source: `src/scripts/lib/pr-watch.mts::runPrWatch`. Emitted via command JSON output, not via `stop-conditions.mts`.

---

## Wave-mode badges

| Badge | Severity | Description |
|---|---|---|
| `wave_post_merge_red` | error | Post-merge test suite returned non-zero after wave merge to main. Operator must decide whether to revert. |
| `wave_dirty_main` | error | Wave runner detected modifications on main before dispatching. Commit, stash, or reset before re-running. |
| `wave_pending_fix_count` | info | Number of slices with `pending_fix: true`. Planner picks them first next wave. Informational; no halt. |
| `wave_escalation_count` | warn | Slices moved to `needs-review/` since the last retrospective due to repeated wave failures. Investigate at next retro. |

Emitted by: `src/scripts/lib/wave/runner.mts` (via snapshot writer).
Consumed by: `loop-snapshot.md` Wave telemetry block; dashboards reading `snapshot.haltBadges`.

---

## How to add a new halt-badge

When a future FEAT introduces a new halt condition that emits to `snapshot.*`, the FEAT's slice MUST update this registry in the same slice. Don't ship the halt field without documenting it here.

Checklist:

1. **Pick a field name** — camelCase, descriptive, lives directly under `snapshot.*`. Match the naming convention of existing entries.
2. **Define the shape** — TypeScript-style. Include a `triggered: true` or equivalent boolean as the first field if the badge represents a binary fire/no-fire condition.
3. **Update `src/scripts/lib/stop-conditions.mts`** — add a `buildXxxSnapshotEntry` helper that returns `null` when the signal is null, populated object when triggered. Wire it into `assembleStopResult`.
4. **Update this registry** — add a new `### snapshot.xxx` section following the same template as the existing entries (Shape, Meaning, Fires when, Suggested action, Origin).
5. **Update the reasons array** — `stop-conditions.mts` should also push a human-readable reason string when the badge fires (e.g. `"cost_regression_stop: current $X > median $Y × Z"`).
6. **Add tests** — at minimum, a unit test that asserts the snapshot entry is `null` when signal is null and populated when triggered.
7. **Update CHANGELOG.md** — note the new badge field under the FEAT's release entry.

When FEAT-066 (schema regression test) lands, this registry becomes the source-of-truth that the test diffs against. Adding a new badge field without updating the registry will fail the test.

## References

- SPEC-003 — halt-badge observability cross-plugin SLO
- FEAT-064 (upstream-request to hero-crew) — crew `brief-me` renders Blocked/Missing using this registry
- FEAT-065 — loop `brief --explain-halts` flag uses this registry to render human-readable summaries
- FEAT-066 — schema regression test diffs the actual snapshot against the documented shapes
