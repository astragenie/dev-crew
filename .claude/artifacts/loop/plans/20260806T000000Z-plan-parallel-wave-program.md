# Plan — parallel-wave execution of the 10-item P0/P1 slate

- **Created:** 2026-08-06
- **Base commit:** `bcc769b8`
- **Runner:** wave mode (`loop.marathonRunner: "wave"`), `maxSubagentsPerSlice: 4`
- **Status:** in progress

## Objective

Land the 10-item slate (FEAT-281, 287, 290, 292, 295, 296, 297, 298, 299 plus
SLICE-191/193) using parallel worktree dispatch instead of sequential slice
ceremonies, in four merge waves determined by file-level conflict analysis.

## Why waves are shaped this way

`src/scripts/lib/backlog-store/slice-store.mts` is wanted by four separate
items at four distinct line regions:

| line | symbol | item |
|---|---|---|
| `:69` | `extractAcceptanceCriteriaDetailed` | FEAT-297 |
| `:251` | `frontmatter.touches_files` | FEAT-292 |
| `:281` | `clampSliceTitle` | FEAT-299 |
| `:312-320` | `usingOwnAc` | FEAT-290 |

Git could auto-merge the distinct hunks, but FEAT-290 rewrites the region
FEAT-297 feeds, so the two must serialize on merit regardless of what the
merge driver can do. That one file sets the wave count.

## Precondition — touches_files must be hand-declared

Wave mode packs parallel slots by non-conflicting `touches_files`. Measured
2026-08-05: **0 of 28 pending slices and 0 FEAT `proposed_slices` entries
declare the field** (FEAT-292). The planner therefore returns
`missing_touches_files_solo_only` for every candidate and the wave degrades to
sequential dispatch — the exact FEAT-276 failure mode.

Mitigation available today: hand-declare `touches_files` in each new slice's
frontmatter. SLICE-203 (commit `1b3eab6e`) taught `wave/touches-files.mts` to
parse the writer's inline-array output, so a declared array now reads back
`confidence: "declared"`. Without this step the program does not run in
parallel.

## Waves

### Wave A — 4 parallel, zero file overlap

| slot | item | owns |
|---|---|---|
| A1 | FEAT-295 | `lib/validation-gate.mts` |
| A2 | FEAT-287 | `validate-backlog-writes.mts`, `scripts/lib/github-sync.mjs` |
| A3 | FEAT-281 | new `src/scripts/validate-*.mts` |
| A4 | SLICE-191 | `slice-linker/feature-lifecycle.mts` |

### Wave B — 4 parallel

| slot | item | owns | gate |
|---|---|---|---|
| B1 | FEAT-297 | `slice-store.mts:69-99` | — |
| B2 | FEAT-299 | `proposed-slices.mts`, `slice-title.mts` | — |
| B3 | FEAT-296 | slice artifact data + doctor | — |
| B4 | SLICE-193 | `loop.mts`, `feature-lifecycle.mts` | after A4 merges |

### Wave C — 2 parallel

| slot | item | gate |
|---|---|---|
| C1 | FEAT-290 | after B1 — same file, supersedes its region |
| C2 | FEAT-298 | after B2 (uniqueness gate) + B3 (clean data to count against) |

### Wave D — 1

FEAT-292. Last because it collides with FEAT-290 on both `slice-store.mts:251`
and `agents/pm.md`. Landing it last is also correct on merit: it is what makes
every future wave pack automatically rather than by hand.

~26 points serial, 4 merge points.

## Operational constraints

1. **Create all slices serially, before any dispatch.** Slice-id allocation is
   fetch-scan max+1 with a known residual race (FEAT-257 / DEC-079). Twelve
   parallel creates will collide, and FEAT-298 records five ids already reused
   from exactly this mechanism. The swarm must never allocate.
2. **Regenerate CI gates 13 and 18 once per wave**, not per item — parallel
   `snapshot-memory` runs write one file and conflict with each other.
3. **Merge in wave order**, not opportunistically, wherever two items share a
   file across waves.
4. `maxSubagentsPerSlice: 4` already matches wave widths A and B. No config
   change required.

## Worktree state at plan time

Six pre-existing worktrees. Prune was considered and **cancelled** — five carry
work that exists nowhere else:

| worktree | state |
|---|---|
| `backfill` | clean, 0 unmerged — safe to remove |
| `feat-reconcile` | 5 unmerged commits |
| `fix-427-close-ceremony` | 1 unmerged |
| `fix-481-tdz` | 1 unmerged |
| `fix-format` | 1 unmerged |
| `release-073` | dirty working tree + 2 unmerged |

Pruning was optional rather than required: wave worktrees take distinct branch
names, so there is no placement collision. `release-073`'s uncommitted change is
flagged as separately worth review.

## Prerequisite

FEAT-291 through FEAT-299 are `priority: null` in `pending/`. An unscored FEAT
cannot be sliced. `/runner:intake --deep` scores and classifies all nine; nothing
past Wave A slot A2 can start until it completes.
