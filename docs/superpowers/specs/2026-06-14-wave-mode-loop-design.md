# Wave-mode loop — design

**Date:** 2026-06-14
**Status:** draft (post-brainstorming, pre-implementation-plan)
**Owner:** loop plugin
**Supersedes:** none

## Problem

The autonomous loop currently walks the triaged backlog one slice at a time. `/devcrew:auto`
emits a sequential dispatch plan; each slice runs the full ceremony (start → builder →
reviewer → validator → complete → grade) before the next slice begins. Throughput is
bounded by single-slice wall-clock latency even when several triaged FEATs touch disjoint
files and could safely run in parallel.

`/devcrew:parallel` (FEAT-136) already proves out the parallel-worktree primitive — it
spawns N git worktrees, dispatches `devcrew:lead` per worktree, and merges DONE branches
back to main. It is a manual one-shot. Nothing today loops it, tests between waves, or
auto-routes failures into the next wave.

## Goal

Add a wave-mode runner that:
1. Packs up to N independent slices per wave (using per-slice `touches_files` declared
   in slice frontmatter).
2. Dispatches each slice into its own git worktree in parallel.
3. Merges PASS results, enqueues FAIL results for `/devcrew:fix` in the next wave.
4. Runs the full test suite once after the wave merges.
5. Loops until a standard `/devcrew:stop-check` condition fires.

Wave mode is opt-in via `loop.json:marathonRunner: "wave"`. Sequential `/devcrew:auto`
stays untouched and remains the default.

## Non-goals

- Changing the slice ceremony semantics (start/complete/grade unchanged).
- Replacing `/devcrew:auto` for users who want sequential execution.
- Cross-slice automatic conflict resolution (planner avoids conflicts; it does not
  attempt three-way merges).
- Parallelizing slices **within the same FEAT** (one FEAT → one worktree per wave).
- Dependency-graph scheduling beyond `depends_on` frontmatter (still respected).

## Decisions (from brainstorming)

| Axis | Decision |
|---|---|
| Wave unit | one SLICE per worktree |
| Conflict gate | spec-writer declares `touches_files`; planner enforces non-overlap |
| Wave size | fixed `loop.json:wave.size` (default 3) |
| Mixed-result handling | merge PASS, dispatch `/devcrew:fix` for FAIL in next wave |
| Test gate | per-worktree validator + once after wave merge |
| CLI surface | new `/devcrew:wave` command; `marathonRunner: "wave"` opts marathon in |
| Halt | standard `/devcrew:stop-check` only (+ internal `post_merge_red`, `dirty_main`) |
| Dispatch shape | configured slash command (`/devcrew:orchestrate-slice` default), not direct `devcrew:lead` agent |
| Approach | wave-native planner library (`src/scripts/lib/wave/*`) |

Rationale for slash-command façade: loop should not couple to `devcrew:lead`'s internals.
Crew can swap lead → direct-builder → any future implementation without a loop edit.
One config knob (`wave.sliceCommand`) controls which crew flow runs per worktree.

## Architecture

### Module layout

```
src/scripts/lib/wave/
  planner.mts          # ranker + file-set conflict graph + greedy packer
  runner.mts           # wave runner: plan → dispatch → finalize → retest → next
  touchesFiles.mts     # read slice frontmatter, infer when missing
  failurePivot.mts     # FAIL item → /devcrew:fix dispatch prompt builder
  artifacts.mts        # write .claude/artifacts/loop/waves/<wave-id>/*

src/scripts/loop.mts
  + subcommand `wave plan`     # dry-run: emit wave plan JSON
  + subcommand `wave run`      # one wave end-to-end
  + subcommand `wave loop`     # repeat wave run until stop-check fires

commands/wave.md               # /devcrew:wave slash flow
agents/spec-writer.md          # contract update: require touches_files in slice frontmatter
src/scripts/lib/slice-frontmatter.mts  # parse + validate touches_files field

src/tests/wave/
  planner.test.mts             # packing + conflict graph
  runner.test.mts              # wave lifecycle (mocked dispatch)
  touchesFiles.test.mts        # parse + fallback
  failurePivot.test.mts        # /devcrew:fix prompt shape
src/tests/integration/
  wave-e2e.test.mts            # one full wave against fixture repo
```

### Data flow per wave

```
devcrew:auto/ranking ────► planner.pack(triagedSlices, N=3)
                            │
                            ▼
                       WavePlan { items: [SliceDispatch...] }
                            │
                            ▼
                       runner.dispatch(plan)
                            │  uses existing `dispatch prepare`
                            ▼
                       parallel Agent(general-purpose) × N in worktrees
                            │  each runs configured /crew:* slash command
                            │  per-worktree: slice ceremony + validator
                            ▼
                       runner.finalize(plan)
                            │  uses existing `dispatch finalize`
                            ▼
                       post-merge `bun test` ──── red? → halt
                            │
                            ▼
                       PASS  → backlog updates
                       FAIL  → enqueue /devcrew:fix for next wave
                            │
                            ▼
                       stop-check → next wave OR halt
```

Reuse from existing code:
- `loop.mts auto` ranking (extracted to shared module)
- `dispatch prepare` + `dispatch finalize` CLI subcommands (unchanged)
- `/devcrew:stop-check` + `checkStopConditions` (unchanged)
- Crew slash commands invoked per worktree (no direct agent coupling)

## touches_files contract

### Slice frontmatter addition

```yaml
---
id: SLICE-117
title: ...
status: pending
feature: FEAT-085
touches_files:                                      # NEW — required for wave dispatch
  - src/scripts/lib/brief.mts
  - src/tests/brief.test.mts
touches_files_confidence: "declared"                # "declared" | "inferred" | "missing"
---
```

Field semantics:
- `touches_files: string[]` — repo-relative paths the slice WILL edit. Globs allowed
  (`src/scripts/lib/wave/*.mts`).
- `touches_files_confidence`:
  - `"declared"` — spec-writer wrote it. Trusted; planner uses as-is.
  - `"inferred"` — wave runner parsed In-scope body bullets via regex fallback.
    Authoritative for packing but flagged in artifact.
  - `"missing"` — neither present. Slice dispatched solo (wave collapses to size 1
    for this slot).

### Spec-writer agent contract update (`agents/spec-writer.md`)

Add to the "Slice-level SDD output" section:

> When producing a slice spec, MUST populate `touches_files` frontmatter array with
> every repo-relative path the implementation will create, edit, or delete. Use exact
> paths, not directories. Globs acceptable only when the change spans a generated set
> (e.g., `src/tests/wave/*.test.mts`). Set `touches_files_confidence: "declared"`.

### Parser + inference (`src/scripts/lib/wave/touchesFiles.mts`)

```ts
export type TouchesFilesResult = {
  paths: string[];               // expanded globs resolved against repo
  confidence: "declared" | "inferred" | "missing";
};

export function readTouchesFiles(slicePath: string, repoRoot: string): TouchesFilesResult;
```

Inference fallback (when `touches_files` absent):
1. Read slice body In-scope section.
2. Regex-extract lines matching
   `(?:src|docs|scripts|commands|agents|skills)/[\w\-./]+\.(mts|md|json|yaml|yml|mjs)`.
3. Dedup, normalize to forward slashes, classify `inferred`.
4. Zero paths found → `missing`.

### Conflict semantics

Two slices conflict if:
- Any path in A exactly equals any path in B, OR
- A's glob matches a B literal (or vice versa), OR
- Both touch any file inside `.claude/loop.json` or `.claude/artifacts/loop/backlog/**`
  (config + backlog files are coarse — overlap risk high).

### Validation gate

New CI script `src/scripts/validate-slice-touches-files.mts`:
- Walks all pending/in-progress slice files.
- Warns (not errors) when `touches_files_confidence: missing` on slices created after
  a configurable cutoff date.
- Errors when `touches_files` contains paths outside repo, or paths whose parent dir
  doesn't exist.

## Planner

`src/scripts/lib/wave/planner.mts`:

```ts
export type SliceCandidate = {
  sliceId: string;
  featureId: string;
  priority: "P0" | "P1" | "P2" | "P3";
  compositeScore: number;
  strategicFit: number;
  touches: TouchesFilesResult;
  pmRiskLevel: number;
  autonomousSafe: boolean;
  retryCount: number;            // wave_attempts frontmatter
  pendingFix: boolean;           // FAIL pivot enqueued previous wave
};

export type WavePlanItem = {
  sliceId: string;
  featureId: string;
  worktreeBranch: string;        // e.g. wave/2026-06-14T1230Z/SLICE-117
  sliceCommand: string;
  dispatchPrompt: string;
  conflictReason: null;          // populated only when packer rejects
};

export type WavePlan = {
  waveId: string;                // ISO timestamp slug
  size: number;                  // items.length (≤ waveSize)
  items: WavePlanItem[];
  rejected: Array<{ sliceId: string; reason: string }>;
  config: { waveSize: number; sliceCommand: string };
};

export function loadCandidates(repoRoot: string): SliceCandidate[];
export function rankCandidates(c: SliceCandidate[]): SliceCandidate[];
export function packWave(ranked: SliceCandidate[], opts: PackOpts): WavePlan;
```

### Ranking

1. `pendingFix === true` first (FAIL pivots get priority next wave).
2. `compositeScore` DESC (missing → 0).
3. Priority P0 > P1 > P2 > P3.
4. `strategicFit` DESC.
5. `retryCount` ASC.

### Conflict graph

Adjacency list over ranked candidates:
- Node = slice.
- Edge between A and B iff their `touches.paths` sets conflict.
- Helpers: `normalizePath(p)` (POSIX, lowercase on Windows, strip `./`),
  `pathsConflict(a, b)`.

### Greedy packer

```ts
function packWave(ranked, { waveSize, sliceCommand }): WavePlan {
  const picked: SliceCandidate[] = [];
  const rejected: Rejection[] = [];
  const pickedPaths = new PathSet();

  for (const cand of ranked) {
    if (picked.length >= waveSize) break;

    if (cand.touches.confidence === "missing") {
      if (picked.length === 0) {
        picked.push(cand);
        break;                            // solo dispatch
      }
      rejected.push({ sliceId: cand.sliceId, reason: "missing_touches_files_solo_only" });
      continue;
    }

    if (pickedPaths.conflictsWith(cand.touches.paths)) {
      rejected.push({ sliceId: cand.sliceId, reason: `conflict_with_${conflictingId}` });
      continue;
    }

    picked.push(cand);
    pickedPaths.addAll(cand.touches.paths);
  }

  return buildWavePlan(picked, rejected, opts);
}
```

### Pre-flight drops (before packing)

- `autonomousSafe: false` AND `pm_risk_level >= 0.7` AND no `riskGate.warn` ack.
- `depends_on` containing unfinished FEAT ids.
- Slice already has open `help_request` workflow badge.
- Slice belongs to a FEAT currently in-progress in a different worktree.

## Wave runner lifecycle

`src/scripts/lib/wave/runner.mts`:

```ts
export type WaveResult = {
  waveId: string;
  plan: WavePlan;
  worktreeResults: WorktreeResult[];
  mergedBranches: string[];
  failedBranches: string[];
  postMergeTest: { ran: boolean; status: "PASS" | "FAIL" | "skipped"; logPath?: string };
  failurePivots: FailurePivot[];
  durationMs: number;
};

export type WorktreeResult = {
  sliceId: string;
  branch: string;
  worktreePath: string;
  status: "PASS" | "FAIL" | "timeout" | "agent_error";
  marker: unknown;
  artifacts: string[];
};

export async function runWave(repoRoot: string, opts: RunWaveOpts): Promise<WaveResult>;
export async function loopWaves(repoRoot: string, opts: LoopOpts): Promise<LoopResult>;
```

### Single wave (`runWave`)

```
1. PRE-FLIGHT
   - git status clean on main? else halt "dirty_main".
   - stop-check → if shouldStop, halt early.

2. PLAN
   - planner.loadCandidates(repoRoot)
   - planner.rankCandidates()
   - planner.packWave({ waveSize, sliceCommand })
   - if plan.size === 0 → return WaveResult{ status:"empty" }

3. PREPARE WORKTREES
   - `loop.mts dispatch prepare --plan <plan> --parent-branch main --json`
   - returns { runId, agentBatch: AgentDispatch[] }

4. DISPATCH (PARALLEL)
   - emit ONE message containing N parallel Agent calls
   - subagent_type = "general-purpose" per item
   - prompt = "cd <worktreePath>; execute <sliceCommand> --id <sliceId>; return marker"
   - await all

5. COLLECT MARKERS
   - parse last-line JSON from each agent result
   - classify PASS / FAIL / timeout / agent_error
   - capture artifact paths

6. FINALIZE (MERGE PASS BRANCHES)
   - `loop.mts dispatch finalize --run-id <id> --plan <plan>`
   - merges only branches whose marker.status === "PASS"
   - FAIL worktrees: kept on disk for /devcrew:fix
   - returns { merged: [], conflicts: [], failed: [] }

7. POST-MERGE TEST
   - `bun test src/tests/ --parallel --timeout 60000` (configurable)
   - capture stdout/stderr to .claude/artifacts/loop/waves/<waveId>/post-merge-test.log
   - exit ≠ 0 → postMergeTest.status="FAIL"; halt reason "post_merge_red"

8. BUILD FAILURE PIVOTS
   - for each FAIL worktree, build FailurePivot
   - mark candidate slice pendingFix=true in next-wave queue (slice frontmatter)

9. WRITE ARTIFACTS
   - .claude/artifacts/loop/waves/<waveId>/wave-result.json
   - .claude/artifacts/loop/waves/<waveId>/plan.json
   - .claude/artifacts/loop/waves/<waveId>/SLICE-<id>-marker.json
   - .claude/artifacts/loop/waves/<waveId>/post-merge-test.log

10. RETURN WaveResult
```

### Wave loop (`loopWaves`)

```
while true:
  result = await runWave(repoRoot, opts)
  appendToLoopArtifact(result)

  if result.status === "empty": halt("backlog_exhausted")
  if result.postMergeTest.status === "FAIL": halt("post_merge_red")
  if checkStopConditions(repoRoot).shouldStop: halt(stopReason)

  iterationCounter++
  if iterationCounter >= maxIterations: halt("max_iterations")

  // FAIL pivots already persisted → planner picks them next wave
  continue
```

### Inline failure handling (no halt)

| Case | Handling |
|---|---|
| Single worktree timeout | FAIL; PASS siblings still merge; /devcrew:fix next wave |
| Agent returns no marker | agent_error; same as FAIL |
| Merge conflict on PASS branch | finalize keeps worktree, marks merge_conflict; /devcrew:fix pivot |
| Post-merge test red | HALT — operator decides whether to revert |

### Concurrency budget

- `wave.dispatchTimeoutMs` (default 30 min per worktree) — runner cancels overdue workers.
- `wave.maxParallel` (default = waveSize) — throttle below waveSize on resource-constrained hosts.

## Failure pivot to /devcrew:fix

`src/scripts/lib/wave/failurePivot.mts`:

```ts
export type FailurePivot = {
  sliceId: string;
  featureId: string;
  originalWaveId: string;
  failureKind: "worktree_fail" | "merge_conflict" | "timeout" | "agent_error";
  failureArtifactPath: string;
  worktreePath: string | null;
  retryCount: number;
  fixCommand: string;
  fixDispatchPrompt: string;
};

export function buildFailurePivot(
  worktree: WorktreeResult,
  finalize: FinalizeOutcome,
  slice: SliceCandidate,
  waveId: string,
  cfg: WaveConfig
): FailurePivot;

export function persistPivot(repoRoot: string, pivot: FailurePivot): void;
```

### Persistence

`persistPivot` mutates slice frontmatter:

```yaml
---
id: SLICE-117
status: pending
wave_attempts: 1
pending_fix: true
last_failure:
  wave_id: "2026-06-14T1230Z"
  kind: "worktree_fail"
  artifact: ".claude/artifacts/crew/handoffs/SLICE-117-reviewer-fail.md"
  pivot_command: "/devcrew:fix"
---
```

Planner's `loadCandidates` reads `pending_fix: true` and sorts those slices first.

### Fix dispatch prompt

```
You are running in worktree <path> for slice <slice-id> in fix mode.

Previous wave attempt FAILED. Failure artifact:
  <failure_artifact_path>

1. Read the failure artifact in full.
2. Execute the slash command: /devcrew:fix --slice <slice-id> --failure <failure_artifact_path>
3. Wait for it to complete.
4. Return a JSON marker on the last line:
   {"slice":"<id>","status":"PASS"|"FAIL","artifacts":[paths],"fixAttempt":<retry_count>}
```

### Retry ceiling

After `wave_attempts >= cfg.maxWaveAttempts` (default 2):
- Move slice to `.claude/artifacts/loop/ai-loop/slices/needs-review/`.
- Strip `pending_fix`; set `status: needs-review` in frontmatter.
- Append to `.claude/artifacts/loop/waves/<waveId>/escalations.json`.
- Planner no longer considers it.

This is the only auto-escalation path. Standard `/devcrew:stop-check` `escalated_to_human`
fires if escalation count crosses `escalationThreshold: 3` (existing config).

### Worktree lifecycle for fixes

| State | Worktree disposition |
|---|---|
| First FAIL → next wave will retry | Keep worktree on disk; reuse for /devcrew:fix |
| Second FAIL → escalation | Remove worktree; commit failure artifact reference |
| Merge conflict (PASS → conflict) | Reset worktree to parent main HEAD; treat as fresh FAIL |

### Marathon checkpoint interaction

Each successful wave finalize counts as N closes (N = `mergedBranches.length`).
`checkMarathonCheckpoint` reuses unchanged: a wave that closes 3 slices burns 3
checkpoint-budget closes, which is correct — more work, faster pressure toward
`/devcrew:retrospective`.

## Config + CLI

### `.claude/loop.json` additions

```json
{
  "loop": {
    "marathonMode": true,
    "marathonRunner": "wave",              // NEW; "sequential" | "wave"; default "sequential"
    "wave": {                              // NEW; only consulted when marathonRunner === "wave"
      "size": 3,
      "sliceCommand": "/devcrew:orchestrate-slice",
      "sliceCommandFallback": "/devcrew:build",
      "fixCommand": "/devcrew:fix",
      "maxParallel": 3,
      "dispatchTimeoutMs": 1800000,
      "postMergeTestCmd": "bun test src/tests/ --parallel --timeout 60000",
      "maxWaveAttempts": 2,
      "subagentType": "general-purpose",
      "artifactsRoot": ".claude/artifacts/loop/waves"
    }
  }
}
```

Validation rules (extend `lib/loop-config.mts`):
- `wave.size >= 1`
- `wave.sliceCommand` matches `/^\/[a-z][a-z0-9:-]*$/`
- `wave.maxParallel <= wave.size`
- `wave.maxWaveAttempts >= 1`
- `marathonRunner` ∈ `{"sequential", "wave"}`; unknown → fall back to `"sequential"` with warning

### CLI subcommands on `loop.mts`

```bash
bun ./src/scripts/loop.mts wave plan \
  --repo "$PWD" \
  [--size N] \
  [--max-features N] \
  [--json]

bun ./src/scripts/loop.mts wave run \
  --repo "$PWD" \
  [--dry-run] \
  [--size N]

bun ./src/scripts/loop.mts wave loop \
  --repo "$PWD" \
  [--max-waves N] \
  [--auto-mode]
```

Exit codes (entry points only). Mapping is by halt reason, not by surface:

| Exit | Halt reasons |
|---|---|
| `0` | `backlog_exhausted`, `max_iterations`, `max_waves`, `marathon_checkpoint_required` (advisory only — hard variant maps to `2`) |
| `2` | `post_merge_red`, `dirty_main`, `marathon_checkpoint_required` (hard), `help_request_open`, any stop-check reason classified as "blocking" |
| `3` | `escalated_to_human`, `escalation_threshold_hit` |
| `1` | unexpected error (uncaught exception, dirty git on startup, missing config, schema validation fail) |

The wave runner asks `/devcrew:stop-check` for `{ shouldStop, reason, severity }` and routes
on severity: `info` → exit `0`, `warn` → exit `2`, `error` → exit `2`, `escalation` → exit `3`.

### `/devcrew:wave` slash command (`commands/wave.md`)

Wraps `loop.mts wave loop`. Subcommands:
- `/devcrew:wave plan` — emit next wave plan, no dispatch
- `/devcrew:wave run` — one wave
- `/devcrew:wave loop` — until halt (default)

Behavior parity with `/devcrew:auto`:
- Respects `loop.autoMode` (no per-plan approval prompt)
- Respects `costStopThreshold`
- Respects all existing stop-check conditions
- Emits halt reasons in same format as `/devcrew:auto`

### Marathon entry-point switch

Existing `/devcrew:start` and `/devcrew:auto` consult `marathonRunner`:
- `"sequential"` → existing `/devcrew:auto` flow unchanged
- `"wave"` → `/devcrew:auto` shells out to `/devcrew:wave loop` and exits

Single config knob flips entire marathon strategy.

### Behavioral change: iteration accounting

Sequential runner counts each slice as one iteration. Wave runner counts each **wave**
as one iteration regardless of how many slices land. Under wave mode, `loop.maxIterations`
caps wave count, not slice count. A wave-size-3 config with `maxIterations: 25` allows
up to 75 slice closes per run vs 25 under sequential. Operators tightening cost should
reduce `maxIterations` proportionally OR set `wave.maxWaves` per-invocation. Documented
in `commands/wave.md` as a deliberate semantic shift.

## Artifacts + stop conditions

### Artifact tree

```
.claude/artifacts/loop/waves/
  <waveId>/
    plan.json
    wave-result.json
    post-merge-test.log
    escalations.json
    SLICE-<id>-marker.json
    SLICE-<id>-handoff.md            # symlink to crew handoff if present
  index.json                         # rolling list (last 50)
```

`index.json` rolls oldest waves via `/devcrew:prune-artifacts` integration (add
`loop/waves/**` to its prune list).

### Snapshot integration

`loop-snapshot.md` gains a Wave telemetry block:

```markdown
## Wave telemetry

- Last wave: 2026-06-14T1230Z (size=3, PASS=2, FAIL=1)
- Recent 10 waves: avg PASS rate 0.83, avg cost $97
- Failure pivots queued: 1 (SLICE-117, attempt 1)
- Marathon: 8 closes since last retro (threshold: 8 advisory, 16 hard)
```

Snapshot writer reads `.claude/artifacts/loop/waves/index.json` to populate.

### Halt-badge contract (per `docs/halt-badges.md`)

New badges in `snapshot.haltBadges`:

| Badge | Severity | Trigger |
|---|---|---|
| `wave_post_merge_red` | error | runner step 7 fail |
| `wave_dirty_main` | error | runner step 1 fail |
| `wave_pending_fix_count` | info | count of slices with `pending_fix: true` |
| `wave_escalation_count` | warn | slices in needs-review/ since last retro |

`docs/halt-badges.md` MUST be updated as part of the wave-mode slice.

### Stop conditions

No new conditions on `/devcrew:stop-check` surface — reuse existing.

| Existing condition | How wave loop responds |
|---|---|
| `backlog_exhausted` | planner size=0 → halt |
| `cost_cap` | each wave counts as 1 iteration; `costStopThreshold` enforced |
| `marathon_checkpoint_required` (hard) | refuses next wave start |
| `escalated_to_human` | refuses next wave start |
| `redundant_read_cap` | existing snapshot-level guard; no override |
| `help_request_open` | refuses next wave start |

Internal halt-only (do NOT change `/devcrew:stop-check` surface):
- `post_merge_red`
- `dirty_main`
- `max_waves` (per-run flag)

## Test plan (high level)

```
src/tests/wave/
  touchesFiles.test.mts       # declared, inferred, missing fallback
  planner.test.mts            # ranking, conflict graph, packer edge cases
  runner.test.mts             # mocked lifecycle; PASS/FAIL/timeout paths
  failurePivot.test.mts       # frontmatter mutation, retry ceiling, prompt shape
  config.test.mts             # loop.json validation + defaults
  cli.test.mts                # `wave plan/run/loop` exit codes + JSON shape
src/tests/integration/
  wave-e2e.test.mts           # one full wave against fixture repo
```

Coverage targets:
- Planner: 100% branch coverage on conflict cases
- Runner: each lifecycle step has unit test + one E2E happy path
- Failure pivot: every `failureKind` path tested
- CLI: every flag combination + exit code

## Open questions for implementation plan

1. Should `dispatch prepare` CLI extend to accept the configured `sliceCommand`, or
   should `runner.mts` build the prompt directly and pass the agent batch through a
   thinner CLI wrapper? Affects whether crew-side `dispatch prepare` needs an update.
2. Where should the `wave_attempts` field be cleared after a successful PASS — on
   wave finalize, on slice complete, or both?
3. Does `/devcrew:prune-artifacts` need a per-prefix configuration extension, or is a
   single `loop/waves/**` add sufficient?
4. Should `/devcrew:wave` ever auto-create slices from triaged FEATs (via
   `/devcrew:slice-from-feature`), or only consume already-pending slices?

These are implementation-phase decisions, not design-blocking.

## Rollout

1. Land schema + spec-writer contract update + validator (touches_files everywhere).
2. Land planner + tests (no runner integration yet).
3. Land runner + e2e test (gated behind `marathonRunner: "wave"`).
4. Land `/devcrew:wave` slash command + CLI subcommands.
5. Update `docs/halt-badges.md` with new badges.
6. Default `marathonRunner: "sequential"` ships unchanged — opt-in only.
7. After 1–2 weeks of opt-in use, evaluate flipping default.

## Risks

| Risk | Mitigation |
|---|---|
| Spec-writer drift — `touches_files` declared incorrectly | CI validator + inference fallback; planner errs on the side of solo dispatch when uncertain |
| Crew slash command signature changes break dispatch prompt | Pin command name in `loop.json`; surface validation error if command absent at runtime |
| Worktree leak when runner crashes mid-wave | `dispatch finalize` already idempotent; add `wave cleanup` subcommand to sweep orphan worktrees |
| Post-merge test flake → halt loop | Allow `wave.postMergeTestCmd` to be a retry-wrapped command; existing flake-budget config applies |
| FAIL → fix → FAIL → fix infinite loop | `maxWaveAttempts: 2` hard ceiling → escalation |
| `bun test --parallel` collides with parallel worktree builds | Worktrees use isolated `node_modules` via Bun; tests run only after merge to main |
