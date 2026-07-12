# Loop State Contract (Schema v1)

## Purpose

The loop owns and manages the authoritative state of backlog, slices, grades, decisions, releases, and retrospectives. The state contract is one source of truth per repository. Validators (`src/scripts/lib/state-schemas.mts`), write-guards (`assertStatePath`), and the doctor tool (`loop doctor`) enforce this contract. The contract is owned by the loop repo and consumed by the crew plugin.

## Authoritative Roots

Loop state roots are resolved once in the CLI dispatcher (`src/scripts/loop.mts`) from two sources, in priority order:

1. **User override** — `.claude/loop.json` `loop.*` keys (example: `loop.backlogRoot`)
2. **Built-in defaults** — `src/scripts/lib/paths.mts` `PATH_DEFAULTS`

| Key | Default Path | Override Key | Purpose |
|---|---|---|---|
| artifactRoot | `.claude/artifacts/loop` | `loop.artifactRoot` | Parent directory for all loop artifacts |
| backlogRoot | `.claude/artifacts/loop/backlog` | `loop.backlogRoot` | FEAT files in pending/triaged/in-progress/done state |
| backlogPath | `.claude/artifacts/loop/ai-loop/backlog` | `loop.backlogPath` | Legacy backlog listing (deprecated) |
| slicesRoot | `.claude/artifacts/loop/ai-loop/slices` | `loop.slicesRoot` | Slice files by ID (SLICE-NN_*.md) |
| specsRoot | `.claude/artifacts/loop/specs` | `loop.specsRoot` | Formal SPEC files and SDD specifications |
| gradesRoot | `.claude/artifacts/loop/grades` | `loop.gradesRoot` | Quality grade reports per slice |
| decisionsRoot | `.claude/artifacts/loop/decisions` | `loop.decisionsRoot` | Architectural decisions (DEC files) |
| releasesRoot | `.claude/artifacts/loop/releases` | `loop.releasesRoot` | Release notes and version artifacts |
| retrospectivesRoot | `.claude/artifacts/loop/retrospectives` | `loop.retrospectivesRoot` | Retrospective summaries |
| snapshotPath | `.claude/artifacts/loop/loop-snapshot.md` | `loop.snapshotPath` | Memory snapshot (single file, not a directory) |
| phaseGateArtifactDir | `.claude/artifacts/crew/validations` | `loop.phaseGateArtifactDir` | Phase-gate validation results (written by crew) |

Once resolved at dispatcher startup, roots are threaded through all command handlers. Path resolution happens exactly once per invocation to avoid divergence.

## Schema v1 Field Tables

### FEAT Frontmatter

| Field | Constraint | Required |
|---|---|---|
| `id` | Regex: `^FEAT-\d{3,}$` | Yes |
| `status` | Enum: `pending`, `triaged`, `in-progress`, `done`, `wont_fix` | Yes |
| `created` | ISO-8601 date (YYYY-MM-DD) | Yes |
| `updated` | ISO-8601 date (YYYY-MM-DD) | No |
| `priority` | Enum: `P0`, `P1`, `P2`, `P3`, or null | No (null allowed) |
| `depends_on` | Array of `FEAT-NNN` strings | Yes (may be empty array) |
| `slices` | Array of `SLICE-NN` strings | Yes (may be empty array) |
| `schemaVersion` | Integer; only `1` accepted | No (absent ⇒ v1) |
| `proposed_slices` | Array of `{id_suffix, title, points, estimated_tokens?, acceptance_criteria?}` (see `proposed-slices.mts`) — `estimated_tokens` defaults from `points` via `pm-effort-mapper.mts::estimateTokensForPoints` when omitted, and any entry whose (explicit or defaulted) `estimated_tokens` exceeds the ~200k `TOKEN_SPLIT_THRESHOLD` is refused at parse time (runner#393 proposal 4) | No |
| `proposed_slices_shipped` | Array of `id_suffix` strings (runner-plugin#392) — stamped by the git-anchored reconcile pass when merged-commit evidence shows a proposed slice was already shipped through a path that never ran `sliceFromFeature`. Durable audit trail; not schema-enforced. | No |
| `proposed_slices_shipped_commits` | Array of commit SHAs, index-aligned with `proposed_slices_shipped` (runner-plugin#392) | No |

### Slice Frontmatter

| Field | Constraint | Required |
|---|---|---|
| `id` | Regex: `^SLICE-\d+$` | Yes |
| `status` | Non-empty string | Yes |
| `feature` | FEAT-NNN string or null | No (null allowed) |
| `requires_validation` | Boolean | No |
| `created` | ISO-8601 date (YYYY-MM-DD) | No |
| `effort_points` | Fibonacci value `1\|2\|3\|5\|8\|13`, propagated from the source `proposed_slices` entry (or the FEAT's own `effort_points` on the single-slice path) | No |
| `estimated_tokens` | Non-negative number, propagated from the source `proposed_slices` entry's (explicit or points-derived default) `estimated_tokens` (runner#393 proposal 4) | No |
| `schemaVersion` | Integer; only `1` accepted | No (absent ⇒ v1) |

### Grade Frontmatter

| Field | Constraint | Required |
|---|---|---|
| `slice` | Regex: `^SLICE-\d+$` | Yes |
| `schemaVersion` | Integer; only `1` accepted | No (absent ⇒ v1) |

### Decision Frontmatter

| Field | Constraint | Required |
|---|---|---|
| `id` | Regex: `^DEC-\d+$` | Yes |
| `title` | Non-empty string | Yes |
| `status` | Non-empty string | Yes |
| `schemaVersion` | Integer; only `1` accepted | No (absent ⇒ v1) |

### .claude/loop.json Configuration

| Field | Constraint | Required |
|---|---|---|
| `schemaVersion` | Integer; exactly `1` | Yes |
| `loop.*` (all path overrides) | String (absolute or relative path) | No |

Example:
```json
{
  "schemaVersion": 1,
  "loop": {
    "backlogRoot": ".custom/backlog",
    "artifactRoot": ".custom/artifacts"
  }
}
```

## Write-Guard Rule

All state writes pass through `assertStatePath(repoPath, config, targetPath)` in `src/scripts/lib/state-paths.mts` before `fs.writeFile`, `fs.rename`, or `fs.unlink`. The guard throws an error if the target is outside the resolved state roots. This prevents accidental forks of backlog trees or state escaping into user code.

| Function | File |
|---|---|
| `resolveStateRoots(repoPath, config)` | Computes all nine resolved roots, deduped |
| `assertStatePath(repoPath, config, target)` | Throws if `target` not inside a resolved root |

Consumers (e.g., `backlog-writer.mts`, `slice-plan.mts`) call `assertStatePath` before writing.

## Doctor Tool

`loop doctor [--check|--fix]` detects and repairs loop-state divergence.

### Commands

- **`loop doctor` (report only)** — Detects findings, writes report to `.claude/artifacts/loop/doctor/TIMESTAMP-report.md`, exits 0.
- **`loop doctor --check`** — Same as above, but exits 1 if any findings present (for CI).
- **`loop doctor --fix`** — Detects findings, writes report BEFORE mutations, then merges stray trees, resolves conflicts, and cleans up.

### Finding Kinds

| Kind | Meaning |
|---|---|
| `stray-tree` | Backlog tree exists outside the authoritative `backlogRoot` (e.g., legacy `docs/backlog/` or another override tree). |
| `id-collision` | Same FEAT ID exists in both authoritative and stray trees. |
| `state-contradiction` | Same FEAT ID in two trees has different state (pending vs triaged, etc.). |
| `schema-invalid` | FEAT file fails one or more frontmatter constraints. |
| `config-mismatch` | Authoritative root is empty but populated backlog exists in a legacy location. |

### Repair Semantics

#### Report First
Before any mutations, the doctor writes a timestamped report listing all findings in `.claude/artifacts/loop/doctor/`.

#### Conflict Resolution
When a FEAT ID exists in both trees (collision + possible state contradiction):

1. Compute `lastTouched` for each file:
   - Try `git log -1 --format=%cI -- <relativePath>` (git commit timestamp)
   - Fall back to filesystem `mtime` if not in git
2. The newer file wins and stays in authoritative root
3. The older file is moved to `.claude/artifacts/loop/doctor/conflicts/<ID>-<state>.md`

#### Cleanup
After moves:
- Remove the stray tree's `pending/`, `triaged/`, `in-progress/`, `done/` directories
- Try to remove the stray tree root itself
- **Non-FEAT files in the stray root are never deleted** — preserve them for manual inspection

#### Report Artifact
Timestamped report written to: `.claude/artifacts/loop/doctor/<ISO8601-stamp>-report.md`

## Versioning Policy

**Schema v1** is the current version. When a new constraint or field is introduced:

1. Bump `schemaVersion` in `state-schemas.mts`
2. Update this document with the new constraint
3. For one release cycle, validators accept **both** the old version (N−1) and the new version (N) to allow graceful rollout
4. In the following release, drop acceptance of N−1 and only accept N

**Absent `schemaVersion`** in a file or config → treated as v1 (backward-compatible default).

---

_Last updated: 2026-06-10 (schema v1 contract established)_
