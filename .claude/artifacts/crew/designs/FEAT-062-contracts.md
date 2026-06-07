---
feature: FEAT-062
slice: SLICE-64
title: Auto-merge slice branch on validation pass
created: 2026-06-06
status: draft
---

# FEAT-062 — Contract artifact

Scope: closing slice of the worktree-per-slice trilogy
(FEAT-060 creation, FEAT-061 ceremony-cwd isolation, FEAT-062 close + merge).
Introduces a new auto-merge stage at the end of
`node scripts/loop.mjs slice complete`. When `workflow-state.currentRun.worktreePath`
is set and the validation gate is satisfied, the loop rebases the slice
branch onto `origin/main`, squash-merges with a synthesized commit
message, then (optionally) pushes and cleans up the worktree + branch.
Failure surfaces a `merge_failed` halt-badge and preserves the worktree
so the operator can resume via `/crew:fix`.

This slice ONLY adds the merge stage. It does NOT:

- create or relocate worktrees (FEAT-060 / FEAT-061 own that)
- introduce cross-branch merges to anything other than `main`
- ever auto-`push --force`, even on conflict
- auto-merge legacy slices that ran without a worktree (no-op cleanly)

Module home: `src/scripts/lib/auto-merge.mts` (new). All exports below
live there unless otherwise noted. Reused: `validation-gate.mts`,
`halt-badges.mts`, `crew-bridge.mts::runCrew` for `mark-badge`.

## TypeScript Interfaces

### `AutoMergeOptions` — call-site input

```ts
// Inputs to runAutoMerge. Most fields are sourced from completeSlice's
// resolved context (no new reads from disk inside auto-merge except git).
export interface AutoMergeOptions {
  /** Main repo root (NOT the worktree path). Where `git -C` runs. */
  repoPath: string;
  /** Absolute worktree path from workflow-state.currentRun.worktreePath. */
  worktreePath: string;
  /** Branch name to rebase + merge. Created by FEAT-060 as `slice/<SLICE-NN>-<FEAT-NN>`. */
  branchName: string;
  /** Slice id (e.g. "SLICE-64"). Drives commit-message title + branch lookup. */
  sliceId: string;
  /** Slice title from frontmatter (e.g. "Auto-merge slice branch on validation pass"). */
  sliceTitle: string;
  /** Feature id (e.g. "FEAT-062") — included in commit body. Null for orphan slices. */
  featureId: string | null;
  /** Average grade score across the 7 dimensions, rounded 2dp. Null when grade missing. */
  gradeAvg: number | null;
  /**
   * Decision ids captured during the slice (e.g. ["DEC-023", "DEC-024"]).
   * Sourced from grade frontmatter — pass through verbatim.
   */
  decisionIds: string[];
  /** Resolved loop config from `resolveConfig(repoPath)`. Required (no fallback). */
  config: Record<string, any>;
  /** When true, print plan to stdout and return DryRunPlan — no git, no state writes. */
  dryRun?: boolean;
}
```

### `MergeResult` — success return

```ts
// Returned when validation gate satisfied AND rebase+merge succeeded.
// Cleanup outcomes (branch delete, worktree remove, state clear) are
// reported individually so partial-cleanup failures are inspectable.
export interface MergeResult {
  status: "merged";
  /** Sha of the squash-merge commit on main. */
  mergeCommitSha: string;
  /** Fully rendered commit message body that was passed to `git commit -m`. */
  commitMessage: string;
  /** True when `git push origin main` ran AND exited zero. */
  pushed: boolean;
  /** Reason push was skipped — only set when `pushed === false`. */
  pushSkippedReason: "config-disabled" | "no-merge-flag" | null;
  /** Per-step cleanup outcomes. Each entry is best-effort and isolated. */
  cleanup: {
    branchDeleted: boolean;
    branchDeleteError: string | null;
    worktreeRemoved: boolean;
    worktreeRemoveError: string | null;
    workflowStateCleared: boolean;
    workflowStateClearError: string | null;
  };
}
```

### `MergeError` — failure return (thrown OR returned)

```ts
// Surfaces on validation_failed, rebase conflict, merge error, OR push
// error AFTER successful merge. Preserves worktree + branch + state.
// completeSlice MUST set the `merge_failed` halt-badge (see Event Schemas)
// before propagating this to the CLI.
export class MergeError extends Error {
  /** Stable machine code for tests + the merge_failed badge `code` field. */
  code:
    | "VALIDATION_REQUIRED"   // no validation_passed/skipped badge AND no waiver
    | "VALIDATION_FAILED"     // workflow-state gate explicitly status: "failed"
    | "FETCH_FAILED"          // `git fetch origin` non-zero
    | "REBASE_CONFLICT"       // `git rebase origin/main` non-zero — operator action required
    | "MERGE_FAILED"          // `git merge --squash` OR follow-up `git commit` failed
    | "PUSH_FAILED"           // post-merge `git push origin main` failed (commit IS on main locally)
    | "BRANCH_MISSING"        // slice branch not found at merge time (state desync)
    | "DIRTY_MAIN"            // main worktree has uncommitted changes — refuse to merge
    | "WORKTREE_MISSING";     // worktreePath recorded but path does not exist
  /** Step at which the failure was detected — used by /crew:fix to resume. */
  failedStep:
    | "validation-gate"
    | "fetch"
    | "rebase"
    | "merge"
    | "push"
    | "preflight";
  /** Raw stderr from the failing git command, trimmed. Empty for non-git failures. */
  gitStderr: string;
  /** Human-readable next step pointing at `/crew:fix`. */
  fixHint: string;
  /** Preserved for the badge `attemptedBranch`. */
  attemptedBranch: string;
  /** Preserved for the badge `attemptedWorktree`. */
  attemptedWorktree: string;
}
```

### `DryRunPlan` — `--dry-run` output

```ts
// Returned from runAutoMerge when opts.dryRun === true. No git calls,
// no state writes. Pure derivation from inputs + a single
// `git rev-parse origin/main` read (allowed — non-mutating).
export interface DryRunPlan {
  status: "dry-run";
  /** What rebase target would be used. Resolved at plan time. */
  rebaseOnto: "origin/main";
  /** The full commit message that would be authored. Final, with footer. */
  commitMessage: string;
  /** Whether autoPushOnMerge would trigger a push. */
  wouldPush: boolean;
  /** Per-step plan, in execution order. Each is a string description. */
  plannedSteps: string[];
  /** True when validation gate is currently satisfied. */
  validationGateSatisfied: boolean;
  /** Echoed inputs for the operator to sanity-check. */
  inputs: {
    sliceId: string;
    featureId: string | null;
    branchName: string;
    worktreePath: string;
    gradeAvg: number | null;
    decisionIds: string[];
    autoPushOnMerge: boolean;
  };
}
```

### `MergeFailedBadge` — workflow-state shape

```ts
// Payload of `workflow-state.currentRun.gates.mergeFailed` AND the
// `snapshot.mergeFailed` halt-badge (see Event Schemas / docs/halt-badges.md).
// `status: "failed"` mirrors the existing validation gate shape so
// downstream renderers don't need a new branch.
export interface MergeFailedBadge {
  status: "failed";
  /** Stable code copied from MergeError.code. */
  code: MergeError["code"];
  /** Slice id at time of failure (for cross-slice debug). */
  slice: string;
  /** Feature id at time of failure. Null when orphan slice. */
  feature: string | null;
  /** Branch the merge attempted to land. */
  attemptedBranch: string;
  /** Worktree the slice ran in. */
  attemptedWorktree: string;
  /** Step at which the failure was detected. */
  failedStep: MergeError["failedStep"];
  /** Short note for the operator (1 sentence). Avoid raw stderr here. */
  note: string;
  /** ISO-8601 timestamp at the time the badge was written. */
  markedAt: string;
}
```

### `runAutoMerge` — exported entry point

```ts
/**
 * Drive validation-gate read → rebase → squash-merge → push? → cleanup.
 *
 * Returns MergeResult on success, DryRunPlan on dry-run, throws MergeError
 * on any failure path. NEVER swallows git errors silently. NEVER mutates
 * the slice branch destructively (no -D, no --force, no --force-with-lease).
 *
 * Idempotent under retry:
 *   - If branch already merged to main and worktree already removed →
 *     returns a MergeResult with cleanup.*Removed: true / *Error: null.
 *   - If the merge_failed badge is already present from a previous attempt,
 *     it is cleared on success (NOT auto-cleared on entry — operator must
 *     run /crew:fix or pass --no-merge to bypass).
 */
export function runAutoMerge(
  opts: AutoMergeOptions
): Promise<MergeResult | DryRunPlan>;
```

### `CompleteSliceOptions` — additive fields

The existing `completeSlice(repoPath, sliceId, opts)` accepts the additive
fields below. All optional; defaults preserve today's behavior when the
worktree path is absent.

```ts
// Additions only — existing fields (keepFeatureOpen, forceClose,
// skipValidationCheck, noDocWriter, drainFn, builderEvidence) unchanged.
interface CompleteSliceOptionsAdditions {
  /** When true, skip the auto-merge stage entirely. Worktree preserved. Default false. */
  noMerge?: boolean;
  /** When true, runAutoMerge returns DryRunPlan; no side effects. Default false. */
  dryRun?: boolean;
}
```

## API Contracts

### `.claude/loop.json` field addition

Added to the existing `loop` object alongside `worktreeMode` /
`worktreeRoot` from FEAT-060. Single new optional field. No schema-version
bump (additive, backward-compatible default-false).

```jsonc
{
  "loop": {
    // ... existing fields ...

    // SLICE-64: when true, runAutoMerge runs `git push origin main` after
    // a successful squash-merge. When false (default) or missing, the
    // operator pushes manually. Push failure surfaces MergeError{ code:
    // "PUSH_FAILED" } AND sets the merge_failed badge — the local main
    // already carries the commit, so the operator's recovery is `git push`,
    // not `/crew:fix`. The fixHint reflects this.
    "autoPushOnMerge": false
  }
}
```

Validation rules (enforced inline by `runAutoMerge`, not a schema layer):

- Coerced via `=== true`. Any non-true value (false, null, missing, the
  string `"true"`, integer 1) is treated as `false`. Matches the
  `loop.worktreeMode` / `loop.autoMode` pattern.
- No companion fields (no remote name override, no branch override).
  `origin` and `main` are constants in this slice. A future FEAT may
  generalize.

### CLI surface — `node scripts/loop.mjs slice complete`

Two new flags. No new exit codes. Existing flags
(`--keep-feature-open`, `--force-close`, `--skip-validation-check`,
`--no-doc-writer`) unchanged.

| Flag         | Type   | Default | Semantics                                                                                                                                                                |
| ------------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--no-merge` | bool   | false   | Skip auto-merge stage entirely. Worktree + branch preserved. Workflow-state `worktreePath` is NOT cleared. Existing close ceremony (move slice file, roll feature, etc.) still runs. Mutually exclusive with `--dry-run`. |
| `--dry-run`  | bool   | false   | Print planned actions (rebase target, commit message, push decision, cleanup steps) and exit. No git mutations, no state writes, no badge writes. Mutually exclusive with `--no-merge`. |

Flag wiring (in `src/scripts/loop.mts::SLICE_HANDLERS.complete`):

```ts
const out = await completeSlice(cwd, sliceId, {
  keepFeatureOpen: Boolean(flags.keepFeatureOpen),
  forceClose: Boolean(flags.forceClose),
  skipValidationCheck: flags.skipValidationCheck || null,
  noDocWriter: Boolean(flags.noDocWriter),
  // SLICE-64 additions:
  noMerge: Boolean(flags.noMerge),
  dryRun: Boolean(flags.dryRun)
});
```

If BOTH `--no-merge` and `--dry-run` are passed, `runSliceSubcommand`
throws before invoking `completeSlice`:

```
slice complete: --no-merge and --dry-run are mutually exclusive.
```

The auto-merge stage is invoked from `completeSlice` AFTER the existing
ceremony (slice file move, feature roll, spec reconciliation, handoff /
synthesis / cost / agent-report writes). Rationale: the ceremony
artifacts must exist on disk before the worktree is removed, otherwise
the next slice cannot find them.

Auto-merge stage skip conditions (any one short-circuits to a no-op
"merge skipped" return — completeSlice still returns success):

1. `opts.noMerge === true`.
2. `workflow-state.currentRun.worktreePath` is null / missing / "".
3. The slice frontmatter has no recorded `worktreePath`.
4. Worktree path on disk is missing (operator already cleaned up).
5. Slice branch is missing (operator already merged manually) — logs but
   still clears `workflow-state.currentRun.worktreePath` since the merge
   state is consistent.

Failure conditions (any one throws MergeError, marks `merge_failed`
badge, preserves worktree):

1. `opts.dryRun === false` AND validation gate not satisfied.
2. `git fetch origin` non-zero.
3. `git rebase origin/main` non-zero (conflict OR network error).
4. `git merge --squash <branch>` OR follow-up `git commit -m` non-zero.
5. `loop.autoPushOnMerge === true` AND `git push origin main` non-zero.
6. Main working tree at `repoPath` is dirty (tracked files). Untracked
   files are ignored (`status --porcelain -uno`, matching FEAT-060).

### Git command surface

`runAutoMerge` invokes git ONLY via the `execFile`-based helper pattern
already used by FEAT-060 (`worktree-manager.mts::git`). Commands run
against `repoPath` (the main repo), NOT the worktree. In execution order:

1. `git -C <repoPath> status --porcelain -uno` — dirty-check main. Non-empty → `MergeError{ code: "DIRTY_MAIN", failedStep: "preflight" }`.
2. `git -C <repoPath> rev-parse --verify <branchName>` — confirm branch exists. Non-zero → `MergeError{ code: "BRANCH_MISSING" }`.
3. `git -C <repoPath> fetch origin` — refresh remote refs. Non-zero → `MergeError{ code: "FETCH_FAILED", failedStep: "fetch" }`.
4. `git -C <worktreePath> rebase origin/main` — rebase slice branch in its own worktree (no checkout in main worktree). Non-zero → `git -C <worktreePath> rebase --abort` (best-effort, ignore errors), then throw `MergeError{ code: "REBASE_CONFLICT", failedStep: "rebase" }`.
5. `git -C <repoPath> checkout main` — switch main worktree onto main (already there in practice; defensive).
6. `git -C <repoPath> merge --squash <branchName>` — stage the squash. Non-zero → `MergeError{ code: "MERGE_FAILED", failedStep: "merge" }`.
7. `git -C <repoPath> commit -m "<commitMessage>"` — author the merge commit. Non-zero → `git -C <repoPath> reset --hard HEAD` (best-effort), then throw `MergeError{ code: "MERGE_FAILED", failedStep: "merge" }`.
8. Capture sha: `git -C <repoPath> rev-parse HEAD`.
9. If `loop.autoPushOnMerge === true`: `git -C <repoPath> push origin main`. Non-zero → throw `MergeError{ code: "PUSH_FAILED", failedStep: "push" }`. NOTE: the commit is already on local main; the badge `fixHint` is `Run 'git push origin main' manually`, NOT `/crew:fix`.
10. Cleanup (each best-effort, independently captured into `MergeResult.cleanup`):
    - `git -C <repoPath> branch -d <branchName>` — note the lowercase `-d` (safe delete; refuses if branch is not merged). NEVER `-D`.
    - `git -C <repoPath> worktree remove <worktreePath>` — refuses on uncommitted changes; that path is acceptable (operator decides).
    - Write `workflow-state.currentRun.worktreePath = null` via the existing crew-bridge currentRun-update path (NOT a direct state write).

Forbidden commands (architectural guarantee — encoded as tests in AC-9):

- `git push --force` / `--force-with-lease`
- `git branch -D` (forced delete)
- `git reset --hard` against main outside of the bounded merge-rollback path above
- `git checkout --force`
- Any push to a ref other than `main`
- Any rebase target other than `origin/main`

### Commit-message template

Stored as a module constant `AUTO_MERGE_COMMIT_TEMPLATE` in
`auto-merge.mts`. Multi-line string with placeholders. Footer line
matches the repo's existing co-author convention (see
`agents/crew/lead.md` and recent commit log).

```
<sliceTitle> (<sliceId>)

Closes <featureId>. Grade avg: <gradeAvg>. Decisions: <decisionList>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Placeholder rendering rules:

| Placeholder      | Source                                   | When missing                                     |
| ---------------- | ---------------------------------------- | ------------------------------------------------ |
| `<sliceTitle>`   | `AutoMergeOptions.sliceTitle`            | REQUIRED — throws before merge if empty.         |
| `<sliceId>`      | `AutoMergeOptions.sliceId`               | REQUIRED.                                        |
| `<featureId>`    | `AutoMergeOptions.featureId`             | Whole "Closes ... ." sentence omitted.           |
| `<gradeAvg>`     | `AutoMergeOptions.gradeAvg.toFixed(2)`   | Substring becomes `Grade avg: n/a`.              |
| `<decisionList>` | `decisionIds.join(", ")`                 | Substring becomes `Decisions: none`.             |

**Worked example** (this slice — SLICE-64):

Inputs:

- `sliceTitle = "Auto-merge slice branch on validation pass"`
- `sliceId = "SLICE-64"`
- `featureId = "FEAT-062"`
- `gradeAvg = 0.87`
- `decisionIds = ["DEC-023", "DEC-024"]`

Rendered commit message:

```
Auto-merge slice branch on validation pass (SLICE-64)

Closes FEAT-062. Grade avg: 0.87. Decisions: DEC-023, DEC-024.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

The body is passed to `git commit -m "<body>"` as a single argument (no
`-m` per paragraph). Line endings are `\n` (LF) regardless of platform —
git normalizes on commit. No trailing newline (git adds one).

## Event Schemas

### `merge_failed` halt-badge — new

Added to the registry documented in `docs/halt-badges.md` (per
SPEC-003 cross-plugin contract). Must update that doc in the same slice
under the existing `## Registry` section.

**Field location:** `snapshot.mergeFailed` in `node scripts/loop.mjs stop-check`
and `node scripts/loop.mjs brief` output. Also surfaced as
`currentRun.gates.mergeFailed` in `workflow-state.json` (parallel to
`gates.validation`).

**Shape** (matches `MergeFailedBadge` interface above):

```ts
{
  status: "failed";
  code: MergeError["code"];        // see MergeError above
  slice: string;                   // e.g. "SLICE-64"
  feature: string | null;          // e.g. "FEAT-062"
  attemptedBranch: string;         // e.g. "slice/SLICE-64-FEAT-062"
  attemptedWorktree: string;       // absolute path
  failedStep: MergeError["failedStep"];
  note: string;                    // 1-sentence operator-facing summary
  markedAt: string;                // ISO-8601
}
```

**Meaning:** the auto-merge stage detected validation_failed, a rebase
conflict, a merge error, or a push error. The worktree and slice branch
are preserved for `/crew:fix` to resume.

**Fires when:** `runAutoMerge` throws `MergeError` AND `opts.dryRun ===
false`. NEVER set on `--dry-run` (the AC-8 zero-side-effect guarantee).

**Cleared when:** the next successful `runAutoMerge` completes, OR the
operator runs `crew mark-badge --badge merge_failed --status cleared`
manually (out of scope for this slice — operator workflow).

**Suggested operator action:** run `/crew:fix` against the preserved
worktree (`code: "REBASE_CONFLICT" | "MERGE_FAILED"`), OR run
`git push origin main` manually (`code: "PUSH_FAILED"` — commit is on
local main), OR open the validation artifact to see what failed
(`code: "VALIDATION_FAILED" | "VALIDATION_REQUIRED"`).

**Origin:** FEAT-062 / SLICE-64. Source:
`src/scripts/lib/auto-merge.mts::runAutoMerge`. Snapshot builder:
`src/scripts/lib/stop-conditions.mts::buildMergeFailedSnapshotEntry`
(new, follows existing `buildSessionDriftSnapshotEntry` shape).

### Renderer registration in `halt-badges.mts`

Append one entry to the `HALT_BADGES` array exported from
`src/scripts/lib/halt-badges.mts`. Pattern matches the four existing
entries:

```ts
function renderMergeFailed(e: any): string[] {
  if (!e) return [];
  const fixHint =
    e.code === "PUSH_FAILED"
      ? `Run \`git push origin main\` manually — the commit is on local main.`
      : `Run \`/crew:fix\` against worktree \`${e.attemptedWorktree}\` to resume.`;
  return [
    `- Slice: ${e.slice}${e.feature ? ` / ${e.feature}` : ""}`,
    `- Failed step: ${e.failedStep} (code ${e.code})`,
    `- Branch: \`${e.attemptedBranch}\``,
    `- Worktree: \`${e.attemptedWorktree}\``,
    `- Suggested action: ${fixHint}`
  ];
}

// Appended to HALT_BADGES (order: after gradeTrend):
{ field: "mergeFailed", gateName: "Merge failed", render: renderMergeFailed }
```

The append site is exactly where the registry already places new badges
— no reordering of the existing four.

### Schema regression test extension

The existing `tests/halt-badges-schema.test.mjs` (FEAT-066 / SLICE-62)
iterates the `HALT_BADGES` registry and asserts a corresponding
`### snapshot.<field>` section is present in `docs/halt-badges.md`. The
SLICE-64 implementation extends the doc with a `### snapshot.mergeFailed`
section so the existing test passes without modification.

### Audit log entry

One `auto-dispatch.jsonl` entry per merge attempt (success OR failure),
written via the existing `appendAuditLog` helper. NEVER on `--dry-run`.

```jsonc
{
  "timestamp": "2026-06-07T12:34:56.000Z",
  "agent": "loop:auto-merge",
  "parentCommand": "slice-complete",
  "ok": true,                       // false on MergeError throw
  "skipped": false,                 // true when --no-merge or no worktreePath
  "skipReason": null,               // "no-merge-flag" | "no-worktree" | "branch-already-merged"
  "durationMs": 4123,
  "merge": {
    "branch": "slice/SLICE-64-FEAT-062",
    "worktree": "C:/work/loop-worktrees/SLICE-64",
    "mergeCommitSha": "<sha>" | null,
    "pushed": true | false,
    "failedStep": null | MergeError["failedStep"],
    "code": null | MergeError["code"]
  }
}
```

## Data Contracts

### `workflow-state.json` — `currentRun.gates.mergeFailed`

Path: `.claude/state/crew/workflow-state.json`

New optional field on the existing `currentRun.gates` object, parallel
to the existing `gates.validation` shape that
`src/scripts/lib/validation-gate.mts::readGateStatus` reads.

```jsonc
{
  "currentRun": {
    // ... existing fields (worktreePath added in FEAT-060) ...
    "gates": {
      "validation": { "status": "passed", "note": "..." },
      "blocked":     null,
      "escalation":  null,

      // SLICE-64: set by runAutoMerge ONLY on MergeError throw.
      // Cleared (set to null) at the START of the next successful merge.
      // Readers MUST treat missing key and explicit null identically.
      "mergeFailed": null
    }
  }
}
```

Field-level rules:

- Type: `MergeFailedBadge | null`. Optional on read.
- Write semantics: written ONLY by `runAutoMerge` via the existing crew
  CLI `mark-badge` invocation pattern used by
  `crew-bridge.mts::markValidationSkippedBadge`. NEVER via a direct
  state-file write. Concretely:

  ```
  crew mark-badge --repo <repoPath> --badge merge_failed \
    --note "<short note>" --json '<MergeFailedBadge JSON>'
  ```

  Crew's mark-badge writes to `currentRun.gates.<badge>` directly.
  (The `--json` payload-passing convention is followed; falls back to
  text-only `--note` when crew is missing — best-effort, matching
  the bridge's existing behavior.)
- The field is preserved across the existing `currentRun → recentRuns[0]`
  rotation. Failed merges remain visible in `recentRuns[0]` for
  one-slice retrospective lookup.
- When the auto-merge stage no-ops (no worktreePath), the field is
  not touched.

### `workflow-state.json` — `currentRun.worktreePath` clearing

On successful merge AND successful cleanup, the field is set to `null`
(NOT deleted) via the existing currentRun-update path. On `MergeError`,
the field is preserved verbatim so `/crew:fix` can find the worktree.

Behavior matrix:

| Outcome                                       | `worktreePath` after completeSlice |
| --------------------------------------------- | ---------------------------------- |
| Merge success + worktree removed              | `null`                             |
| Merge success + `worktree remove` failed      | preserved (recovery: manual `git worktree remove`) |
| `--no-merge` skip                             | preserved                          |
| `--dry-run`                                   | preserved (zero side effects)      |
| MergeError (any code)                         | preserved                          |
| No worktreePath at entry (legacy slice)       | unchanged (no-op)                  |

### `.claude/loop.json` — `autoPushOnMerge`

See API Contracts section above for the field shape. Reader rules:

- Single source of truth: `config.loop.autoPushOnMerge`. No env override
  in this slice (consistent with FEAT-060's `worktreeMode`).
- Cached via `resolveConfig(repoPath)` — `runAutoMerge` requires
  `opts.config` to be passed (no second read).
- Default `false`. Test matrix in AC-9(f) covers `true`, `false`,
  `missing`, and the string `"true"` (must coerce to false).

### Slice frontmatter — no new fields

The slice frontmatter `worktreePath` written by FEAT-060 is consumed
read-only. No new keys are added. After successful merge, the slice
file has already moved to `completed/` and stays there with its
`worktreePath` field intact — operator can audit which worktree the
slice ran in even after cleanup.

### Idempotency contract

`runAutoMerge` is safe to invoke twice for the same slice. Observed
states and resulting behavior:

| State observation                                                                    | Behavior                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Validation gate satisfied + branch exists + worktree exists                          | Full path: rebase → merge → push? → cleanup. Returns `MergeResult { status: "merged" }`.                                                  |
| Validation gate not satisfied                                                        | Throws `MergeError{ code: "VALIDATION_REQUIRED" }` (or `VALIDATION_FAILED` when the gate is explicitly `status: "failed"`).                |
| Branch missing, worktree path missing, `worktreePath` already cleared                | Returns `MergeResult { status: "merged", cleanup.*: true, mergeCommitSha: "" }` — idempotent re-entry; nothing to do.                       |
| Branch exists but `git merge-base --is-ancestor <branch> origin/main` returns true   | Treated as "already merged upstream": skip rebase + merge, run cleanup, return `MergeResult` with `mergeCommitSha: "<existing-main-sha>"`. |
| `merge_failed` badge already set from previous attempt + validation gate now passes  | Proceeds with full merge attempt. On success, badge cleared. On failure, badge updated in place (markedAt refreshed).                     |
| `--dry-run` over any of the above                                                    | Returns `DryRunPlan` reflecting what would happen. NEVER mutates state, NEVER touches the badge, NEVER writes the audit log.              |

Re-entry guarantee: `await runAutoMerge(opts); await runAutoMerge(opts);`
is safe and the second call is a no-op cleanup pass when the first
succeeded.

### Failure-atomicity contract

When `runAutoMerge` throws `MergeError`, the following MUST hold:

1. The slice branch still exists (no `-d`, no `-D`).
2. The worktree directory still exists at `worktreePath`.
3. `workflow-state.currentRun.worktreePath` is unchanged.
4. `main` is at the same sha as before the call, EXCEPT for `code:
   "PUSH_FAILED"` — in that case main carries the new squash commit
   locally (push failed, not merge). The badge `fixHint` reflects this.
5. The `merge_failed` badge is set (best-effort via crew CLI; if crew is
   missing, the badge write is skipped — log entry records this).
6. The audit log entry is written with `ok: false` and the failure code.

Tests (AC-9) must cover the rebase-conflict path explicitly and assert
all six invariants hold.

### Migration / backfill

No backfill. Existing closed slices without `worktreePath` are not
re-merged — they were already merged manually. Existing
`workflow-state.json` files without `currentRun.gates.mergeFailed` are
valid; the field appears only after the first auto-merge failure on a
worktree-mode slice.

No schema-version bump. All additions are optional and default-safe.
