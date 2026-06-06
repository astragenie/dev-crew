---
feature: FEAT-060
slice: SLICE-56
title: Worktree creation at slice-start
created: 2026-06-06
status: draft
---

# FEAT-060 — Contract artifact

Scope: introduce gated git-worktree creation at `slice start`. A new
`worktree-manager` helper is invoked by `startSlice` after `pinSessionId`;
when `loop.worktreeMode` is true and the slice does not already record a
`worktreePath`, the helper creates a sibling worktree + branch and writes
the absolute path into both `workflow-state.currentRun.worktreePath` and
the slice frontmatter. When the flag is false (default) the helper is a
strict zero-op — no mutation, no I/O beyond the cheap flag check.

This slice ONLY creates the worktree and persists the path. It does NOT:

- redirect subagent dispatch to the worktree (FEAT-061)
- auto-merge or clean up the worktree (FEAT-062)
- emit audit events for worktree create/merge (FEAT-062)

## TypeScript Interfaces

All types live in `src/scripts/lib/worktree-manager.mts` unless noted.

```ts
// Public result of a successful `ensureSliceWorktree` call.
// Returned when worktreeMode is on AND the gate evaluates the slice as
// eligible (no pre-existing worktreePath, or pre-existing path matches an
// already-good worktree on disk).
export interface WorktreeResult {
  /** Absolute path to the worktree root. Always an absolute, normalized path. */
  worktreePath: string;
  /** Branch checked out inside the worktree (e.g. "slice/SLICE-56-FEAT-060"). */
  branchName: string;
  /**
   * True when this call performed the `git worktree add` and branch
   * creation. Implies `reused === false`.
   */
  created: boolean;
  /**
   * True when this call observed an existing worktree at `worktreePath`
   * and returned it untouched (idempotent re-entry). Implies
   * `created === false`.
   */
  reused: boolean;
}

// Error surfaced when the gate is on, the helper attempted git work, and
// git failed. Caller (startSlice) MUST treat this as a slice-start halt
// and propagate the error message verbatim — no partial state writes
// must have happened by the time this throws (see Idempotency &
// failure-atomicity contract below).
export class WorktreeError extends Error {
  /** Stable machine code for tests + downstream tooling. */
  code:
    | "DIRTY_TREE"          // working tree not clean — `git status --porcelain` non-empty
    | "WORKTREE_ADD_FAILED" // `git worktree add` returned non-zero
    | "BRANCH_EXISTS"       // target branch already exists outside the intended worktree
    | "PATH_COLLISION"      // worktreeRoot/<SLICE-ID> exists but is not a registered worktree
    | "ROOT_NOT_WRITABLE"   // could not create worktreeRoot parent dir
    | "GIT_NOT_AVAILABLE";  // `git` binary not on PATH
  /** Absolute path the helper attempted to write to (audit). */
  attemptedPath: string;
  /** Branch name the helper attempted to create. */
  attemptedBranch: string;
  /** Raw stderr from the failing git command, trimmed. May be empty. */
  gitStderr: string;
}

// Public signature of the helper. Returns `null` when the gate is off
// (the dominant case — no allocation, no I/O beyond config read).
// Throws WorktreeError on hard failures when the gate IS on.
export function ensureSliceWorktree(
  repoPath: string,
  sliceId: string,
  opts: {
    /** Resolved loop config from `resolveConfig(repoPath)`. Pass through to avoid double-read. */
    config?: Record<string, any> | null;
    /**
     * Feature id discovered via `readSliceContext` — used to compose the
     * branch name `slice/<SLICE-ID>-<FEAT-ID>`. When null, branch is
     * `slice/<SLICE-ID>` (no feature suffix).
     */
    featureId?: string | null;
  }
): Promise<WorktreeResult | null>;
```

### Internal config-resolution helper (not exported)

```ts
// Resolves the effective worktree configuration. Single source of truth for
// default derivation rules. Pure with respect to filesystem (does NOT mkdir).
interface ResolvedWorktreeConfig {
  mode: boolean;          // loop.worktreeMode, default false
  root: string;           // absolute, normalized worktreeRoot
  rootSource: "config" | "default-sibling";
}
function resolveWorktreeConfig(
  repoPath: string,
  config: Record<string, any> | null
): ResolvedWorktreeConfig;
```

## API Contracts

### `.claude/loop.json` field additions

Added to the existing `loop` object alongside `costStopThreshold` /
`costRegressionMultiplier`. Both fields are OPTIONAL.

```jsonc
{
  "loop": {
    // ... existing fields ...

    // SLICE-56: master switch for git-worktree-per-slice mode.
    // When false (default), startSlice behaves identically to today:
    // no worktree-manager work performed, no frontmatter mutation,
    // no state mutation. When true, slice-start creates (or reuses)
    // `<worktreeRoot>/<SLICE-ID>/` on a `slice/<SLICE-ID>-<FEAT-ID>` branch.
    "worktreeMode": false,

    // SLICE-56: directory containing per-slice worktrees. When null OR
    // missing, defaults to `../<basename(repoPath)>-worktrees` — a
    // sibling directory to the repo root. Accepted shapes:
    //   - absolute path:   "D:/work/loop-worktrees"
    //   - relative path:   "../loop-worktrees" (resolved against repoPath)
    //   - null (default):  sibling derivation rule (above)
    // Path is normalized to an absolute path at resolve time.
    "worktreeRoot": null
  }
}
```

Validation rules (enforced by `resolveWorktreeConfig`, not a schema layer):

- `worktreeMode` — coerced via `=== true`. Any non-true value (false,
  null, missing, string `"true"`, integer 1) is treated as `false`.
  Pattern matches `loop.autoMode` / `loop.marathonMode`.
- `worktreeRoot` — if non-string OR empty-string after trim, fall back to
  the sibling derivation. If string, expand `~` (POSIX) is OUT OF SCOPE
  for this slice; raw value is `path.resolve(repoPath, value)`d.

### CLI behavior — `node scripts/loop.mjs slice start`

No new flags. No new exit codes. Existing CLI surface unchanged.

Behavioral additions, conditional on `loop.worktreeMode === true`:

1. After `pinSessionId(repoPath)` returns, `startSlice` awaits
   `ensureSliceWorktree(repoPath, sliceId, { config, featureId })`.
2. On `WorktreeResult` return (success — created OR reused):
   - Slice frontmatter is updated to set `worktreePath: "<absolute-path>"`.
   - `workflow-state.currentRun.worktreePath` is set to the same value
     (written via the existing currentRun-update path used by
     `writeCrewRunBrief`, NOT via a new direct state write).
   - The `result` object returned by `startSlice` includes a new optional
     field `worktree: { path, branchName, created, reused }` — additive,
     non-breaking for existing callers.
3. On `null` return (gate off): no frontmatter mutation, no state
   mutation, `result.worktree === undefined` (omitted, not `null`, so
   the JSON surface remains identical to today when the flag is off).
4. On `WorktreeError` thrown:
   - `startSlice` does NOT swallow the error — it propagates so the CLI
     exits non-zero with the actionable message.
   - Frontmatter MUST NOT have been mutated.
   - `workflow-state.currentRun.worktreePath` MUST NOT have been written.
   - The `pinSessionId` write that already happened is left as-is
     (it is independent of worktree work and itself best-effort).

### Internal git command surface

`ensureSliceWorktree` shells out to git only via the existing
`execFile`-based helper pattern used in `slice-cost-ceiling.mts` /
`session-drift.mts`. The exact commands invoked, in order, when the gate
is on AND no existing worktree is recorded:

1. `git status --porcelain` — must return empty stdout. Non-empty
   → throw `WorktreeError{ code: "DIRTY_TREE" }`.
2. `git rev-parse --show-toplevel` — to anchor the operation; failure
   → throw `WorktreeError{ code: "GIT_NOT_AVAILABLE" }`.
3. `git worktree list --porcelain` — to detect a pre-existing worktree
   at the target path BEFORE attempting to add one. If a registered
   worktree already exists at the target path AND its HEAD matches the
   target branch, treat as `reused: true` and skip step 4.
4. `git worktree add -b <branchName> <worktreePath> main` — failure
   → throw `WorktreeError{ code: "WORKTREE_ADD_FAILED", gitStderr }`.

No `git fetch`, no `git pull`, no `git checkout` against the main
working copy. The main working copy is NEVER mutated.

## Event Schemas

No new events in this slice. Worktree create/merge audit events are
deferred to FEAT-062. The `auto-dispatch.jsonl` audit log is NOT written
to by `worktree-manager`.

The optional `result.worktree` payload returned by `startSlice` is a
return-shape addition, not an emitted event. The existing trajectory
writer (`recordStartTrajectory`) MAY include `worktreePath` in its
`slice_start` step payload for trace continuity, but this is additive
and best-effort — failures in trajectory write must not block slice
start (existing contract preserved).

## Data Contracts

### `workflow-state.json` — `currentRun.worktreePath`

Path: `.claude/state/crew/workflow-state.json`

New field on the existing `currentRun` object:

```jsonc
{
  "currentRun": {
    "title": "FEAT060 SLICE56",
    "goal": "…",
    // ... existing fields ...

    // SLICE-56: absolute path to the per-slice worktree, or null when
    // worktreeMode is off (the dominant case). Never present as the
    // empty string. Never relative.
    "worktreePath": null
  }
}
```

Field-level rules:

- Type: `string | null`. Optional on read — readers MUST treat missing
  and `null` identically.
- Write semantics: the field is written ONLY by `startSlice` when
  `ensureSliceWorktree` returns a non-null `WorktreeResult`. Other code
  paths (cost reports, brief writers, slice-progress refresh) MUST NOT
  touch this field.
- The field is preserved across the existing `currentRun → recentRuns[0]`
  rotation performed at slice-complete. No new rotation logic.
- When `worktreeMode` is off, this field is never written. Existing
  workflow-state files without the field remain valid.

### Slice frontmatter — `worktreePath`

Path: `.claude/artifacts/loop/ai-loop/slices/{pending,in-progress,done}/<SLICE>.md`

New optional frontmatter key:

```yaml
---
id: SLICE-56
status: pending
feature: FEAT-060
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
worktreePath: "/c/work/loop-worktrees/SLICE-56"  # absolute path, quoted
---
```

Field-level rules:

- Type: `string | null`. Absent key === `null`.
- Written via the existing slice-frontmatter write path used by
  `slice-linker` helpers (e.g. the same mechanism that records
  `started_at` on a FEAT). No new file-write primitive is introduced.
- The write is the SECOND mutation in the slice-start sequence
  (workflow-state first, frontmatter second). If the frontmatter write
  fails AFTER workflow-state was written, the helper MUST roll back the
  workflow-state write OR retry once. See "Failure atomicity" below.

### Branch naming convention

```
slice/<SLICE-ID>-<FEAT-ID>
```

Examples:

- `slice/SLICE-56-FEAT-060` — standard case (feature id known).
- `slice/SLICE-56` — fallback when `featureId` is null (orphan slice).

Constraints:

- Branch name uses literal slice + feature ids (uppercase preserved).
- Branched off `main` at the time of the `git worktree add` call.
- Existing branch with the SAME name → `WorktreeError{ code: "BRANCH_EXISTS" }`.
  The helper does NOT auto-suffix (`-2`, `-retry`) — operator decides.

### Worktree directory layout

```
<worktreeRoot>/<SLICE-ID>/
```

Examples (repoPath = `C:/work/mega/loop`, default worktreeRoot):

- `C:/work/mega/loop-worktrees/SLICE-56/`

Examples (custom worktreeRoot = `D:/scratch/wts`):

- `D:/scratch/wts/SLICE-56/`

Constraints:

- `<SLICE-ID>` is the literal slice id (uppercase preserved, no FEAT id).
- The directory MUST NOT pre-exist as a non-empty non-worktree dir;
  pre-existing dir matching a registered worktree at the same path
  → `reused: true` path.
- Worktree root parent must exist or be creatable; if `mkdir -p` fails
  → `WorktreeError{ code: "ROOT_NOT_WRITABLE" }`.

### Idempotency contract (re-entry behavior)

`ensureSliceWorktree(repoPath, sliceId, opts)` is idempotent under the
following observed states. The helper consults BOTH workflow-state AND
the on-disk worktree registry — neither source alone is authoritative.

| State observation                                                                                   | Helper behavior                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `worktreeMode === false`                                                                            | Returns `null`. No I/O beyond config read. No mutation.                                                                                      |
| Slice frontmatter has `worktreePath` AND `git worktree list` shows it registered AND directory exists | Returns `{ created: false, reused: true, … }`. No mutation. No `git worktree add`.                                                          |
| Slice frontmatter has `worktreePath` BUT `git worktree list` does NOT show it                       | Throws `WorktreeError{ code: "PATH_COLLISION" }`. Operator resolves manually — we do not silently re-create.                                  |
| No frontmatter `worktreePath` AND target path free AND branch free                                  | Performs full create. Returns `{ created: true, reused: false, … }`.                                                                         |
| No frontmatter `worktreePath` AND target path occupied by registered worktree (e.g. operator created it manually) | Returns `{ created: false, reused: true, … }`. Adopts the existing worktree.                                                                 |
| No frontmatter `worktreePath` AND branch already exists                                             | Throws `WorktreeError{ code: "BRANCH_EXISTS" }`.                                                                                              |

Re-entry guarantee: `await ensureSliceWorktree(); await ensureSliceWorktree();`
is safe and produces the same result twice. The second call hits the
`reused: true` path.

### Git-failure contract (no partial state)

When `worktreeMode === true` and any git command fails, the helper MUST
leave NO mutations behind:

1. The slice frontmatter must NOT have been updated.
2. `workflow-state.currentRun.worktreePath` must NOT have been written.
3. The target directory must NOT exist (if `git worktree add` was
   attempted and failed, git's own cleanup is relied on; the helper does
   NOT manually `rm -rf` to avoid destructive ops on operator-owned
   paths).
4. No new branch must exist locally.

To uphold (1) and (2), the write order is fixed:

```
ensureSliceWorktree (all git work + verification)
  ↓ success returns WorktreeResult
write workflow-state.currentRun.worktreePath
  ↓ success
write slice frontmatter worktreePath
```

If step "write workflow-state" succeeds and "write frontmatter" fails,
`startSlice` MUST roll back the workflow-state write OR mark the
currentRun as `worktreePath: null` again before re-throwing. The
implementation MAY do this either via:

(a) two-phase: stage frontmatter content first, validate, then write
both atomically; OR

(b) compensating write: on frontmatter-write failure, re-write
workflow-state with `worktreePath: null`.

Either approach satisfies the contract. Tests MUST cover the simulated
frontmatter-write-fail path and assert workflow-state is restored.

### Gated-off contract (zero-op when worktreeMode false)

When `loop.worktreeMode` is false, missing, or any non-true value:

- `ensureSliceWorktree` returns `null` immediately after the config read.
- No child process is spawned (no `git status`, no `git worktree list`).
- No mkdir, no file write.
- `startSlice` return shape is byte-identical to today: no `worktree`
  key, no `worktreePath` in trajectory step, no new top-level fields.
- Existing workflow-state files without `currentRun.worktreePath` remain
  valid; reading them must not coerce a missing field to anything other
  than `undefined` / `null`.

This is the dominant production path — performance and observability
budgets MUST treat the off-path as free.

### Migration / backfill

No backfill. Existing slices closed before SLICE-56 will not have
`worktreePath` in frontmatter; readers treat missing as `null`.
Existing `workflow-state.json` files without `currentRun.worktreePath`
are valid; the field appears only on runs started after `worktreeMode`
is flipped on.

No schema-version bump. The field is additive and optional everywhere.
