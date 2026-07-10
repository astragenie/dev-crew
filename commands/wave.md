---
name: wave
description: "Run wave-mode autonomous runner: pack N independent slices into parallel worktrees, dispatch in one parallel block, merge PASS, pivot FAIL into /crew:fix next wave. Subcommands: plan | run | loop."
auto_execute_steps: false
---

# Wave-mode loop

Reads triaged slices with declared `touches_files`, packs up to `wave.size`
non-conflicting slices into one wave, dispatches each into a parallel git
worktree, merges PASS branches, runs post-merge tests, and enqueues FAIL
slices for `/crew:fix` next wave. Loops until `/runner:stop-check` fires.

## Subcommands

### plan — emit the next wave plan without dispatching

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave plan \
  --repo "$PWD" \
  [--size N] \
  [--json]
```

Reads the triaged backlog, selects up to `size` non-conflicting slices
(conflict = overlapping `touches_files` sets), and prints the wave plan.
No worktrees are created. Exit 0 on success; exit 1 on unexpected error.

Output shape (`--json`):

```json
{
  "waveId": "wave-20260614T120000Z",
  "slices": [{ "id": "SLICE-140", "worktreePath": ".worktrees/SLICE-140", "conflicts": [] }],
  "excluded": [{ "id": "SLICE-141", "reason": "conflict", "conflictsWith": ["SLICE-140"] }],
  "pendingFix": ["SLICE-139"]
}
```

### run — execute one wave end-to-end

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave run \
  --repo "$PWD" \
  [--dry-run] \
  [--size N]
```

`run` must be invoked from within Claude Code (harness-only). The dispatch
step emits a parallel-agent batch payload that the harness materializes into
N parallel `Agent(subagent_type: general-purpose)` calls. Each agent prompt
instructs:

1. `cd <worktreePath>`
2. Execute the configured slash command (`/crew:orchestrate-slice --id <SLICE-ID>`).
3. Return a last-line JSON marker:
   `{"slice":"<id>","status":"PASS"|"FAIL","artifacts":[...]}`.

Each `agentBatch` entry also carries a resolved `model` field (FEAT-205,
`resolveWaveDispatchModel` in `src/scripts/lib/model-router.mts`) — pass it
into the tool call as `Agent(subagent_type: general-purpose, model: <model>)`.
Model choice never lives inside the `prompt` string; it is a separate
structured field on the batch entry. Resolution order per slice:

1. The slice's `classify-slice-shape.mts` shape (computed from its
   `touches_files` at pack time) looks up `SHAPE_TIER_MAP` — trivial shapes
   (`doc-update`, `config-tweak`, `test-only`, `single-module-edit`) route to
   `sonnet` unless overridden via `loop.modelRouting.byShape.<shape>`.
2. Shapes with no override (`none` — mixed file types, large diffs,
   public-surface edits) fall through to the phase-based `build` routing
   (`loop.modelRouting.build`, default `sonnet`).

After all N agents return, `run` calls `dispatch finalize`: merges PASS
branches, leaves FAIL worktrees on disk for next-wave `/crew:fix`, runs the
post-merge test command, writes artifacts, and exits.

With `--dry-run`, worktrees are created but no agents are dispatched; plan
JSON is printed instead.

When `dispatch finalize` is invoked with `--pr` (auto-PR mode), each PASS
branch is pushed and a PR is opened via `gh pr create`
(`dispatch-pr-mode.mts::dispatchFinalizePr`) instead of merging locally.
That is the one place in-repo where a `prUrl` is known immediately after
creation — follow up with `pr-watch <prUrl> --wait-for-merge` per created
PR so the `pr.merged` DORA envelope fires once GitHub merges it. See
`commands/close.md` → "PR-merge detection".

### loop — repeat `run` until a stop condition fires

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave loop \
  --repo "$PWD" \
  [--max-waves N] \
  [--auto-mode]
```

Calls `run` in a loop, decrementing `--max-waves` each iteration. Stops
when `maxWaves` is reached, the backlog is exhausted, or `/runner:stop-check`
fires a halt condition.

## Behavioral note: iteration accounting

Wave mode counts each wave as one `loop.maxIterations` increment. A
wave-size-3 config with `loop.maxIterations: 25` allows up to 75 slice
closes per run. Tighten `loop.maxIterations` or pass `--max-waves` to cap
cost proportionally.

## Exit codes

| Exit | Condition                                                           |
| ---- | ------------------------------------------------------------------- |
| `0`  | `backlog_exhausted`, `max_iterations`, `max_waves`                  |
| `2`  | `post_merge_red`, `dirty_main`, `stop_check_fired` (non-escalation) |
| `3`  | `escalated_to_human`, `escalation_threshold_hit`                    |
| `1`  | Unexpected error                                                    |

## Config (`.claude/loop.json`)

```json
{
  "loop": {
    "marathonRunner": "wave",
    "wave": {
      "size": 3,
      "sliceCommand": "/crew:orchestrate-slice",
      "sliceCommandFallback": "/crew:build",
      "fixCommand": "/crew:fix",
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

`marathonRunner: "wave"` opts `/runner:auto` and `/runner:start` into wave mode
(wiring lands in T21). Default remains `"sequential"`.

## Failure pivots

A FAIL worktree from wave N:

1. Has its slice frontmatter mutated: `wave_attempts++`, `pending_fix: true`,
   `last_failure: { waveId, artifacts }`.
2. Is ranked first by the planner in wave N+1 (`pendingFix` ranks ahead of
   `compositeScore`).
3. Dispatches with a fix-mode prompt invoking
   `/crew:fix --slice <id> --failure <artifact>`.
4. Escalates to `needs-review/` after `wave.maxWaveAttempts` (default 2)
   consecutive failures.

## Artifacts

```
.claude/artifacts/loop/waves/
  <waveId>/
    plan.json
    wave-result.json
    post-merge-test.log
    escalations.json
    SLICE-<id>-marker.json
  index.json
```

## Status

- `plan` — shipped (T16).
- `run` — shipped (T17).
- `loop` — shipped (T17).
- `marathonRunner` routing — shipped (T21). Set in `.claude/loop.json` to opt
  `/runner:auto` and `/runner:start` into wave mode.

Known limitations:

- `realDispatch` throws on headless invocation — the parallel-agent step
  requires the Claude Code harness. The `/runner:wave` slash flow handles
  dispatch via harness.
- `realStopCheck` is a soft no-op until `/runner:stop-check` exposes a
  programmatic CLI surface.
- `realFinalize` cannot distinguish merge-conflict branches from cleanly-merged
  ones (always returns `conflicts: []`); merge-conflict failure pivots do not
  fire from CLI runs. Tracked as a follow-up.
- Pre-flight drops (`autonomousSafe: false`, unfinished `dependsOn`,
  `helpRequestOpen`) are not yet enforced by the planner. Audit the backlog
  before enabling wave mode in CI.
- Escalated slices (`wave_attempts >= maxWaveAttempts`) get
  `status: needs-review` in frontmatter but are not file-moved to
  `needs-review/`. Operator must move manually.

See `docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md` for design
rationale.
