---
feat: FEAT-020
title: Hierarchical parallel subagent dispatch (SLICE-1 — loop library)
status: draft
created: 2026-06-09
author: brainstorming
parent_backlog: .claude/artifacts/loop/backlog/triaged/FEAT-020.md
---

# FEAT-020 — Hierarchical parallel subagent dispatch

## Source

FEAT-020 is a deferred competitor-gap entry from the 2026-05-28 audit (Cursor agents, hierarchical async dispatch). PM scoring:

- composite_score: 0.71
- composite_priority: P2 (user-facing P3)
- risk_level: 0.85, effort: 0.85, implementation_confidence: 0.25
- autonomous_safe: true
- deferred: true (depth limit + file-claim system named as blockers)

This design retires the deferred flag for SLICE-1 by addressing both named blockers (depth limit becomes a config-driven cap; file-claim is sidestepped via worktree-per-child isolation).

## Naming note

FEAT-020 titles it "async hierarchical subagent dispatch." This design ships **hierarchical blocking parallel** dispatch. Children execute concurrently, but the parent's `dispatchHierarchical` call is blocking via `awaitAll`. Truly async (parent continues while children run) is an explicit non-goal for SLICE-1 — see §10.

## Implementation-split note (annotation added during plan creation)

Sections below describe the library as a single `src/scripts/lib/hierarchical-dispatch.mts` file. The implementation plan splits it into 10 small modules (`dispatch-types.mts`, `dispatch-config.mts`, `dispatch-gates.mts`, `dispatch-prompt.mts`, `dispatch-trace.mts`, `dispatch-worktree.mts`, `dispatch-batch.mts`, `dispatch-aggregate.mts`, `dispatch-merge.mts`, plus the `hierarchical-dispatch.mts` barrel that re-exports everything) to enable task-parallel execution. The API contract, exported names, types, and behavior are unchanged — external callers continue to import from `./hierarchical-dispatch.mjs`. See `docs/superpowers/plans/2026-06-09-feat020-slice-1-hierarchical-dispatch.md` § Parallel Execution Plan for the dependency waves.

## Decisions (locked during brainstorming)

| # | Decision | Source |
|---|---|---|
| D1 | Generic primitive serving all three callers (intra-slice fan-out, recursive FEAT decomposition, parallel review fan-out) | Q1 |
| D2 | Depth cap is config-driven, default 3, override via `.claude/loop.json` `dispatch.maxDepth` | Q2 |
| D3 | Worktree-per-child isolation. No same-cwd + claim arbitration. | Q3 |
| D4 | Blocking `awaitAll` API. No marker polling, no notification primitive. | Q4 |
| D5 | Continue-on-failure (parallel-runner model). No fail-fast, no retry. | Q5 |
| D6 | Phased delivery: SLICE-1 ships loop library + dispatcher agent; SLICE-2 is an upstream PR to hero-crew that refactors `parallel-runner` to call the library. | Approach C phasing |

## Architecture

```
caller agent (any role)
  ↓ Agent(subagent_type: loop:hierarchical-dispatcher)
loop:hierarchical-dispatcher (thin agent wrapper)
  - reads .claude/loop.json
  - resolves cwd + parent branch
  - calls into library
src/scripts/lib/hierarchical-dispatch.mts (primitive)
  - depth gate (LOOP_DISPATCH_DEPTH env)
  - createChildWorktree(parentBranch, childId) → cwd
  - dispatchBatch(plans) → single-message Agent block
  - awaitAll → collect structured results from marker files
  - mergeChildren(parentBranch, results) → priority order
  - emit jsonl trace
```

Library has zero plugin-specific code — pure git shell + Agent invocation. Dispatcher agent is the prompt + tool budget around the library.

## Library API

`src/scripts/lib/hierarchical-dispatch.mts` (compiled to `scripts/lib/hierarchical-dispatch.mjs`):

```typescript
export type DispatchPlan = {
  id: string;               // child id, e.g. "FEAT-134" or "child-1"
  priority: number;         // merge order (0 first)
  agentType: string;        // e.g. "crew:builder", "crew:reviewer"
  prompt: string;           // self-contained prompt for child
  branch?: string;          // override; default = `<parentBranch>-${id}`
};

export type DispatchStatus = "DONE" | "FAILED" | "BLOCKED" | "CONFLICTED";

export type DispatchResult = {
  id: string;
  status: DispatchStatus;
  branch: string;
  worktreePath: string;
  childResults?: DispatchResult[]; // grandchildren, if any
  artifactPath?: string;
  error?: string;
  costUsd?: number | null;         // populated by FEAT-165; null in SLICE-1
};

export type DispatchOptions = {
  parentBranch: string;     // git branch the children fork from
  repoRoot: string;         // absolute path
  depth?: number;           // current depth; default reads LOOP_DISPATCH_DEPTH env
  configPath?: string;      // .claude/loop.json override
  onChildFailure?: "continue"; // only "continue" in SLICE-1; future-proofing
};

export async function dispatchHierarchical(
  plans: DispatchPlan[],
  opts: DispatchOptions,
): Promise<DispatchResult[]>;
```

Single async function. Callers pass `plans[]` and `opts`; receive structured results.

### Typed error classes

- `DispatchDepthExceeded` — depth gate refused spawn.
- `DispatchFanoutExceeded` — `plans.length > maxChildrenPerBatch`.
- `DispatchWorktreeError` — git op failed (creation, dirty parent, missing ref).
- `DispatchConfigError` — duplicate child ids, malformed config.

Errors thrown at the library boundary abort the whole batch. Per-child failures are surfaced as `DispatchResult.status = "FAILED" | "BLOCKED" | "CONFLICTED"` and do not throw.

## Worktree + branch lifecycle

### Spawn

```bash
git worktree add "${repoRoot}-${childId}-${depth}" "${parentBranch}" -b "${childBranch}"
```

- Path: `<repoRoot>-<childId>-<depth>`. Depth suffix avoids collision when a grandchild reuses an id.
- Branch: forks from `parentBranch` HEAD, **not** `main`. Recursive correctness — grandchild inherits parent's WIP.
- `parentBranch` may contain slashes (e.g. `slice/SLICE-90`); resulting `childBranch` (`slice/SLICE-90-FE`) is a valid git ref. No sanitization beyond rejecting characters git itself rejects (`~`, `^`, `:`, etc.) — library validates via `git check-ref-format` once before spawn batch.
- Sequential spawn within one batch — single git lock per repo. Cross-depth is naturally serialized by the awaitAll boundary.
- Tracked in `.claude/artifacts/loop/dispatch/<runId>/worktrees.jsonl` as each spawn succeeds.

### Cleanup

- Clean child (`status === "DONE"` AND merge clean): `git worktree remove` + `git branch -D`.
- Failed / blocked / conflicted child: leave worktree + branch alive. Logged in `summary.md`. Manual cleanup is the user's call.

### Recursion

- Grandchild forks off the **child's** branch, not the parent's.
- Grandchild merges into child branch first (inside child's call to the same library). Child then merges into parent branch. Merge ordering is bottom-up by construction.
- Inside one depth level, merges are sequential (single git lock). Across depths, the awaitAll boundary serializes naturally.

### Orphan handling

- `git worktree prune` runs at library start. Logged.
- Stale `dispatch/<old-runId>/` directories older than `pruneStaleAfterDays` (default 7) get a console warning, not auto-deletion.

## Dispatch flow

### Depth gate

```typescript
const depth = opts.depth ?? Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
const cap = readConfig(opts.configPath).dispatch?.maxDepth ?? 3;
if (depth >= cap) {
  throw new DispatchDepthExceeded(`depth ${depth} >= cap ${cap}`);
}
```

Refusal, not silent flattening.

### Prompt augmentation

Library injects three pieces of **textual instruction** into every child prompt before passing to `Agent`. These are not OS env vars — Agent prompts cannot set the subagent's process env directly. The child agent must read them from the prompt and forward them explicitly when it invokes Bash:

1. `LOOP_DISPATCH_DEPTH=${depth + 1}` — child MUST forward via `LOOP_DISPATCH_DEPTH=<N+1> node scripts/loop.mjs dispatch ...` OR `--depth <N+1>` CLI flag whenever it invokes nested dispatch. Library reads `process.env.LOOP_DISPATCH_DEPTH` first, falls back to `--depth` flag.
2. `LOOP_DISPATCH_RUN_ID=${runId}` — child forwards the same way for trace correlation.
3. Result-write contract: child MUST write `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` matching the `DispatchResult` schema before returning. If the child itself dispatches grandchildren, the grandchild `DispatchResult[]` returned from its own `dispatchHierarchical` call MUST be included in `childResults[]` of the marker.

### Single-message Agent batch

```typescript
const agentCalls = plans.map(p => ({
  description: `dispatch ${p.id}`,
  subagent_type: p.agentType,
  prompt: augmentPrompt(p.prompt, { runId, depth, childCwd: p.cwd, childBranch: p.branch }),
}));
// emitted as one Agent tool block — concurrent execution
const rawAgentReturns = await callAgentBatch(agentCalls);
```

Concurrency is delivered by the Agent tool's single-message batch semantics, not by `run_in_background`.

### Result reconciliation

For each child:

| Marker state | Library behavior |
|---|---|
| Present + parseable | use marker as canonical `DispatchResult` |
| Present + grandchildren ran | `childResults[]` populated recursively |
| Missing | `status = "FAILED"`, `error = "child did not write result marker"` |
| Malformed JSON | `status = "FAILED"`, `error = "marker parse failed: <msg>"` |

Marker file wins over raw Agent return text — structured, schema-validated, survives Agent text truncation.

### Trace emission

`.claude/artifacts/loop/dispatch/<runId>/trace.jsonl` — one line per child:

```json
{"ts":"2026-06-09T12:34:56Z","depth":1,"parentBranch":"slice/SLICE-90","childId":"FE","status":"DONE","durationMs":42100,"costUsd":null}
```

`costUsd` is `null` in SLICE-1. FEAT-165 populates.

## Result aggregation + merge

### Aggregation

```typescript
const results: DispatchResult[] = plans.map(plan => {
  const marker = readMarker(runId, plan.id);
  if (!marker) {
    return {
      id: plan.id,
      status: "FAILED",
      branch: plan.childBranch,
      worktreePath: plan.cwd,
      error: "no marker",
    };
  }
  return marker;
});
```

### Merge (parent responsibility)

Sequential by `priority` ascending, parent-branch checkout once:

```bash
git checkout "${parentBranch}"
for child in sorted_by_priority(results where status === "DONE"):
  git merge --no-ff "${child.branch}" -m "merge ${child.id} from depth ${depth}"
  if clean:
    git worktree remove "${child.worktreePath}"
    git branch -D "${child.branch}"
  else:
    git merge --abort
    child.status = "CONFLICTED"
    # worktree + branch preserved
```

### Returned shape

Returned array preserves input plan order (not priority order — callers sort if needed). Each entry's status reflects post-merge state:

- `DONE` — child succeeded AND merge clean.
- `CONFLICTED` — child succeeded but merge conflict.
- `FAILED` / `BLOCKED` — child returned non-DONE; no merge attempted.

### Run artifact

`.claude/artifacts/loop/dispatch/<runId>/summary.md` — one row per child, status, branch, worktree path, conflict reason. Linked from caller's slice via `loop:slice-link` when invoked from a slice context.

## CLI + agent surface

### CLI

```
Usage:
  node scripts/loop.mjs dispatch --plan <path> --parent-branch <name> [--repo <path>]

  --plan          JSON file or "-" for stdin. Shape: { plans: DispatchPlan[] }
  --parent-branch git branch children fork from (required)
  --repo          default $PWD
  --depth         override env LOOP_DISPATCH_DEPTH (test/debug only)
  --dry-run       print augmented prompts + worktree commands, no spawn

Output: writes summary.md path to stdout
        exits 0 on partial success
        exit 2 if every child failed
        exit 1 on library error
```

Used by: any agent (via Bash tool), CI smoke tests, manual debugging.

### Agent wrapper

`agents/hierarchical-dispatcher.md` — loop-owned, ≤300 lines, frontmatter:

```yaml
---
name: hierarchical-dispatcher
description: Spawn parallel child subagents in worktrees, awaitAll, merge by priority.
  Depth-capped via .claude/loop.json. Use when one slice needs N parallel children
  (FE+BE+tests) or recursive FEAT decomposition. NOT for sequential phases.
model: sonnet
maxTurns: 30
tools: [Bash, Agent, Read, Write]
color: cyan
---
```

Agent body:
1. Parse caller's request → build `DispatchPlan[]`.
2. Resolve parent branch (current branch if not given).
3. Call CLI: `node scripts/loop.mjs dispatch --plan <stdin> --parent-branch <X>`.
4. Read `summary.md`, surface one-line headline + artifact path to caller.

Agent is thin — all logic in library + CLI. Agent's job: prompt interpretation + summary delivery.

### Caller invocation patterns

| Use case | Caller | Children |
|---|---|---|
| Intra-slice fan-out | builder | `crew:builder-fe`, `crew:builder-be` |
| Recursive FEAT decomp | parallel-runner-style | `loop:hierarchical-dispatcher` (recursive) |
| Parallel review | reviewer | `crew:reviewer` × N (per dimension) |

SLICE-1 ships a test that exercises one level of recursion (parent → child → grandchild).

## Config + telemetry

### `.claude/loop.json` extension

```json
{
  "dispatch": {
    "maxDepth": 3,
    "maxChildrenPerBatch": 8,
    "worktreeRoot": null,
    "pruneStaleAfterDays": 7
  }
}
```

| Key | Purpose | Default |
|---|---|---|
| `maxDepth` | recursion cap | 3 |
| `maxChildrenPerBatch` | per-call fanout cap | 8 |
| `worktreeRoot` | override worktree parent dir | `null` (sibling of repo) |
| `pruneStaleAfterDays` | orphan dispatch dir warning threshold | 7 |

All keys optional; library uses hardcoded defaults when missing or when `.claude/loop.json` doesn't exist.

### Telemetry artifacts

`.claude/artifacts/loop/dispatch/<runId>/`:

| File | Contents |
|---|---|
| `worktrees.jsonl` | one line per spawn: `{ts, childId, branch, path, depth}` |
| `trace.jsonl` | one line per child result: `{ts, depth, childId, status, durationMs, costUsd?}` |
| `<childId>.result.json` | canonical `DispatchResult` written by child before return |
| `summary.md` | human-readable run summary |

### Cost rollup hook

`trace.jsonl` carries `costUsd` per child as a nullable field. SLICE-1 always writes `null`. FEAT-165 (Per-skill cost attribution) populates by having children read their own Agent cost from the harness and report it in their marker file. Library does not compute cost.

Sum-by-depth becomes a one-liner downstream — FEAT-165's responsibility.

## Failure model + edge cases

### Per-child failure (continue-on-failure baseline)

| Symptom | Library behavior |
|---|---|
| Child returns FAILED in marker | Skip merge. Worktree + branch preserved. Recorded in summary. |
| Child returns BLOCKED in marker | Same as FAILED, distinct status in trace. |
| Marker missing after Agent return | Status = FAILED, error = "no marker". Worktree preserved for forensics. |
| Merge conflict on DONE child | `git merge --abort`. Status downgraded to CONFLICTED. Worktree + branch preserved. |
| Grandchild merge conflict | Settled inside child's call. Surfaces at parent as child status = FAILED, `error: "grandchild merge conflict"`. |

### Library-level failures (throw, abort whole batch)

| Symptom | Throw |
|---|---|
| Depth cap hit | `DispatchDepthExceeded` |
| Fanout cap exceeded | `DispatchFanoutExceeded` |
| Worktree creation fails | `DispatchWorktreeError` |
| `parentBranch` unresolvable via `git rev-parse --verify` | `DispatchWorktreeError` |
| Working tree on parent branch dirty | `DispatchWorktreeError` |
| Config parse error | `DispatchConfigError` |
| Duplicate child id in `plans[]` | `DispatchConfigError` |

### Pre-flight (mandatory before first spawn)

1. `parentBranch` exists and is resolvable.
2. Working tree on `parentBranch` is clean (`git status --porcelain` empty). Refuse if dirty.
3. `git worktree prune` to clear ghosts from killed prior runs.
4. `plans.length > 0 && plans.length <= maxChildrenPerBatch`.
5. All `plan.id` values are unique within the batch.

### Non-goal: re-entrancy

Calling `dispatchHierarchical` twice concurrently in one process is undefined. Documented as a non-goal. Real concurrency happens across Agent boundaries, not in-process.

### Cancellation

No support in SLICE-1. `awaitAll` blocks until every child returns. User Ctrl-C leaves worktrees and marker files on disk — partial state is recoverable manually.

### Recovery

All state on disk (worktrees, markers, JSONLs). `--resume` from partial run is **not** supported in SLICE-1.

## Testing

### Unit (`src/tests/hierarchical-dispatch.test.mts` → `tests/hierarchical-dispatch.test.mjs`)

| Test | Coverage |
|---|---|
| `depth cap enforced` | depth=cap throws `DispatchDepthExceeded`; depth=cap-1 proceeds |
| `fanout cap enforced` | plans.length > cap throws `DispatchFanoutExceeded` |
| `prompt augmentation` | augmented prompt contains `LOOP_DISPATCH_DEPTH`, `LOOP_DISPATCH_RUN_ID`, marker contract |
| `marker missing → FAILED` | when marker absent, result.status = FAILED, error set |
| `marker malformed → FAILED` | bad JSON → FAILED, not throw |
| `duplicate child ids` | same id twice → `DispatchConfigError` |
| `config parse fallback` | missing `.claude/loop.json` → hardcoded defaults silently applied |
| `config explicit override` | `maxDepth: 5` honored |
| `trace.jsonl append-only` | concurrent appends from result reads don't corrupt |

Agent tool is mocked at the call boundary. Git ops run against a real tmpdir repo (worktree path math hard to mock correctly).

### Integration (`src/tests/hierarchical-dispatch.integration.test.mts`)

| Test | Coverage |
|---|---|
| `tmpdir repo, mock Agent — happy path` | 2 children both DONE, both merge clean. Verify branches deleted, parent has both commits. |
| `one child FAILED` | 1 DONE 1 FAILED. Parent has only DONE commit. FAILED worktree preserved. |
| `merge conflict path` | crafted conflict between two children. CONFLICTED surfaces. Both worktrees preserved. |
| `recursion 1 level deep` | child invokes library inline, spawns grandchild. Grandchild merges to child, child merges to parent. Trace shows depth=2. |
| `depth cap at recursion boundary` | child at depth=cap tries to spawn → throws. Surfaces as parent's child status = FAILED with `DispatchDepthExceeded` in error. |
| `dirty parent branch refused` | uncommitted changes on parent → `DispatchWorktreeError`. |

### CI gates

- New tests picked up automatically by `npm test` glob.
- `validate-content-length` covers new agent file (cap 300 lines).
- `validate-manifests` extended only if the new agent is registered in the plugin manifest.

### Out of test scope for SLICE-1

- Real end-to-end subagent spawning. Covered by manual smoke pre-merge and by SLICE-2 upstream integration with `parallel-runner`.
- Cost rollup (FEAT-165 owns).
- Cancellation behavior (no support).

## Out of scope (explicit non-goals for SLICE-1)

| Item | Disposition |
|---|---|
| `parallel-runner` refactor to use the library | **SLICE-2** upstream PR to hero-crew. Coordinated with `MIN_CREW_VERSION` bump. |
| Truly async (non-blocking) parent | Deferred. Design is hierarchical blocking parallel. |
| Cancellation / kill propagation | None. Ctrl-C is the user's tool. |
| `--resume` from partial run | Deferred. |
| Cost rollup / per-child cost population | Field present, always `null` in SLICE-1. **FEAT-165** populates. |
| Budget cap on whole dispatch | **FEAT-133** consumes `trace.jsonl`. |
| `run_in_background: true` Agent flag | Not used. |
| Same-cwd + claim arbitration | Rejected during brainstorming (Q3). |
| Caller-declared failure policy | Hardcoded `continue`. |
| Cross-plugin library import from hero-crew | **SLICE-2**. |
| New PM / triage / grade flow integration | Slice ceremony commands unchanged. |
| Reentrancy in same process | Not supported. |

## SLICE-1 deliverables

- `src/scripts/lib/hierarchical-dispatch.mts` (≤ 400 lines per repo convention; split helpers if over)
- `src/tests/hierarchical-dispatch.test.mts`
- `src/tests/hierarchical-dispatch.integration.test.mts`
- `agents/hierarchical-dispatcher.md` (≤ 300 lines)
- `node scripts/loop.mjs dispatch` subcommand (extend `src/scripts/loop.mts` or add `src/scripts/dispatch.mts`)
- `.claude/loop.json` `dispatch.*` keys documented in README
- `CHANGELOG.md` entry
- No upstream PR

## Dependencies + sequencing

- No hard dep on other FEATs for SLICE-1.
- Unblocks **FEAT-133** (budget enforcement) by exposing `trace.jsonl`.
- Unblocks **FEAT-165** (per-skill cost attribution) by exposing `costUsd` field hook.
- **SLICE-2** (hero-crew upstream PR) is downstream and not a SLICE-1 dependency.

## Risk register

| Risk | Mitigation |
|---|---|
| Worktree creation slow at fanout=8 | Sequential spawn already serialized. Document expected wall-clock (~1s × 8 = 8s). |
| Disk pressure from preserved failed worktrees | Documented behavior. Operator deletes when ready. `pruneStaleAfterDays` warning. |
| Agent tool quirks at large prompt sizes from augmentation | Prompt augmentation adds < 1 KB. Within Agent budget. |
| Recursion infinite loop if depth env not propagated | Tested explicitly. Library throws if `LOOP_DISPATCH_DEPTH` is non-numeric. |
| Caller forgets to set `parentBranch` to current branch when on a slice | Pre-flight check resolves via `git rev-parse --verify`; throws on mismatch. |
| Marker write race when child invokes library recursively | Marker path includes `runId` and `childId` — recursive run has its own runId scope. No collision. |
