---
name: wave
description: "Run wave-mode autonomous runner: pack N independent slices into parallel worktrees, dispatch in one parallel block, merge PASS, pivot FAIL into /devcrew:fix next wave. Subcommands: plan | run | loop."
auto_execute_steps: false
---

# Wave-mode loop

Reads triaged slices with declared `touches_files`, packs up to `wave.size`
non-conflicting slices into one wave, dispatches each into a parallel git
worktree, merges PASS branches, runs post-merge tests, and enqueues FAIL
slices for `/devcrew:fix` next wave. Loops until `/devcrew:stop-check` fires.

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
2. Execute the configured slash command (`/devcrew:orchestrate-slice --id <SLICE-ID>`).
3. Return a last-line JSON marker:
   `{"slice":"<id>","status":"PASS"|"FAIL","artifacts":[...]}`.

Each `agentBatch` entry MAY carry a resolved `model` field (FEAT-205,
`resolveWaveDispatchModel` in `src/scripts/lib/model-router.mts`) — when
present, pass it into the tool call as
`Agent(subagent_type: general-purpose, model: <model>)`. **When the field is
absent (model routing disabled via `loop.modelRouting.enabled: false`), OMIT
the `model:` argument entirely** — the dispatched agent's own `model:`
frontmatter (`agents/*.md`) then governs; do not substitute a model yourself.
Model choice never lives inside the `prompt` string; it is a separate
structured field on the batch entry. Resolution order per slice (when routing
is enabled):

1. The slice's `classify-slice-shape.mts` shape (computed from its
   `touches_files` at pack time) looks up `SHAPE_TIER_MAP` — trivial shapes
   (`doc-update`, `config-tweak`, `test-only`, `single-module-edit`) route to
   `sonnet` unless overridden via `loop.modelRouting.byShape.<shape>`.
2. Shapes with no override (`none` — mixed file types, large diffs,
   public-surface edits) fall through to the phase-based `build` routing
   (`loop.modelRouting.build`, default `sonnet`).

After all N agents return, `run` calls `dispatch finalize`: merges PASS
branches, leaves FAIL worktrees on disk for next-wave `/devcrew:fix`, runs the
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
when `maxWaves` is reached, the backlog is exhausted, or `/devcrew:stop-check`
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

`marathonRunner: "wave"` opts `/devcrew:auto` and `/devcrew:start` into wave mode
(wiring lands in T21). Default remains `"sequential"`.

## Pre-flight gate, FEAT dependencies, and intra-FEAT sequencing (FEAT-034)

- **Pre-flight drops run before ranking/packing** (`applyPreFlightDrops`,
  `planner.mts`): a candidate whose parent FEAT has `autonomous_safe: false`
  AND a technical-risk score `>= 0.7` is dropped with reason
  `pre-flight: autonomous_safe=false AND pm_risk_level=<score> >= 0.7`. The
  score reads `pm_technical_risk` (the field `pm-apply.mts`/`/devcrew:triage`
  actually write), falling back to the legacy `pm_risk_level` name for
  already-triaged backlogs that still carry it.
- **`depends_on` is satisfied ONLY by `backlog/done/`** — a dependency FEAT
  sitting in `pending/`, `triaged/`, or `in-progress/` still blocks the
  dependent slice's candidate with
  `pre-flight: depends_on unfinished [<ids>]`. There is no partial-credit
  state short of fully `done/`.
- **Ranking** (`rankCandidates`) reads `pm_composite_priority` (mapped
  P0→1.0 / P1→0.75 / P2→0.5 / P3→0.25 / P4→0, falling back to a numeric
  legacy `composite_score` when present) and `pm_strategic_alignment`
  (falling back to legacy `pm_strategic_fit`) — the same fallback-then-warn
  pattern as the risk score above.
- **Intra-FEAT sequencing**: set `sequential: true` on a FEAT's frontmatter
  (next to its `proposed_slices` array) to force its sibling slices to run
  one wave at a time rather than in parallel — useful when later slices
  depend on an earlier sibling's output even though their declared
  `touches_files` are disjoint (so the ordinary path-conflict check alone
  would let them pack together). `sliceFromFeature`'s multi-slice
  materializer (`feature-lifecycle.mts`) stamps every sibling slice it
  creates with `sequential_group: <FEAT id>`; `packWave` refuses to place a
  second candidate sharing that group in the same wave (reason
  `sequential_group:<id> already packed this wave`). Default stays
  parallel — nothing is stamped when the flag is absent or `false`.
- **Widened `touches_files` inference** (`touches-files.mts`, used only when
  a slice has no declared `touches_files`): recognizes `crew/`, `.github/`,
  `.claude-plugin/`, `hooks/`, `dist/`, `templates/` sub-paths in addition to
  the original `src/docs/scripts/commands/agents/skills/` set, plus the bare
  root files `package.json`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`,
  `README.md`, `CHANGELOG.md` cited without any directory prefix.
- **`wave run` is slash-flow-only** — `realDispatch` (`real-deps.mts`) throws
  on a headless CLI invocation; only the `/devcrew:wave` slash command runs
  inside the Claude Code harness that can actually dispatch the parallel
  agents. `wave plan`/`--dry-run` have no such restriction.

## Failure pivots

A FAIL worktree from wave N:

1. Has its slice frontmatter mutated: `wave_attempts++`, `pending_fix: true`,
   `last_failure: { waveId, artifacts }`.
2. Is ranked first by the planner in wave N+1 (`pendingFix` ranks ahead of
   `compositeScore`).
3. Dispatches with a fix-mode prompt invoking
   `/devcrew:fix --slice <id> --failure <artifact>`.
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
  `/devcrew:auto` and `/devcrew:start` into wave mode.

Known limitations:

- `realDispatch` throws on headless invocation — the parallel-agent step
  requires the Claude Code harness. The `/devcrew:wave` slash flow handles
  dispatch via harness.
- `realStopCheck` is a soft no-op until `/devcrew:stop-check` exposes a
  programmatic CLI surface.
- `realFinalize` cannot distinguish merge-conflict branches from cleanly-merged
  ones (always returns `conflicts: []`); merge-conflict failure pivots do not
  fire from CLI runs. Tracked as a follow-up.
- Pre-flight drops (`autonomousSafe: false` + high risk, unfinished
  `dependsOn`, `helpRequestOpen`) ARE enforced by the planner
  (`applyPreFlightDrops`, wired into both `wave plan` and `wave run` — see
  "Pre-flight gate, FEAT dependencies, and intra-FEAT sequencing" above).
  `helpRequestOpen` itself is still hardcoded `false` at `loadCandidates`
  time (no crew-side workflow badge lookup wired up yet) — audit the
  backlog for open help-request badges before enabling wave mode in CI.
- Escalated slices (`wave_attempts >= maxWaveAttempts`) get
  `status: needs-review` in frontmatter but are not file-moved to
  `needs-review/`. Operator must move manually.

See `docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md` for design
rationale.
