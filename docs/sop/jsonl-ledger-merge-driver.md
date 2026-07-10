# SOP: JSONL ledger merge driver + collision-safe learnings ids

**Owner:** loop plugin lead role.
**Status:** Active. **Origin:** wave-1 item 5, 2026-07-10 (3 hand-union-merge
incidents on `grades.jsonl` / `learnings.jsonl` in one day, plus a
learnings.jsonl id collision — two branches independently allocated ids 15-24
for different insights, requiring manual renumbering to reconcile).

## Problem

`.claude/artifacts/loop/grades.jsonl` and `.claude/artifacts/loop/learnings.jsonl`
are append-only ledgers written from multiple branches and worktrees (wave
mode dispatches N slices into N worktrees; each can append to either ledger
via `writeGrade` / `logLearning`). Git's default line-based 3-way merge
treats concurrent appends to the same tail of the file as a conflicting
region and refuses to auto-resolve — every such merge needed a hand-union
resolution.

Separately, `learnings.mts` minted ids as `max(existing ids on disk) + 1`.
Two branches that each log a learning before seeing the other's write
compute the same "next" integer for two different insights. The collision is
invisible until merge time, and by then the only fix is manually renumbering
one side's ids.

## Fix

### 1. `merge=union` on both ledgers (`.gitattributes`)

```
.claude/artifacts/loop/grades.jsonl    merge=union
.claude/artifacts/loop/learnings.jsonl merge=union
```

`union` is one of git's built-in merge-driver variants (no `merge.union.driver`
registration needed) — for the conflicting region it takes the union of both
sides' lines instead of leaving conflict markers, and folds *exact* duplicate
lines within that region.

Empirically verified (scratch repo, three scenarios — see transcript in the
handoff for this change) on git 2.54:

- Two branches each appending a different line, merged in either order:
  no conflict, both lines present, no data loss.
- Two branches each appending the *same* literal line: no conflict, the line
  appears once (git's union dedup), not twice.

### 2. Collision-safe learnings ids (`learnings.mts::mintLearningId`)

Ids are no longer derived from existing store contents. Each call mints
`${isoTimestampWithDashes}-${3 random bytes as hex}` — the same shape as the
dispatch `runId` convention in `hierarchical-dispatch.mts` (e.g.
`2026-07-10T00-28-49-710Z-d11484`), so two branches/worktrees writing
concurrently can no longer land on the same id. Existing on-disk integer ids
are untouched — every reader (`deleteLearning`, `searchLearnings`,
`recentLearnings`, `listAllLearnings`, the CLI `learnings prune --id` flag)
accepts either shape; `deleteLearning` compares via `String(id)` so a legacy
numeric id and a new string id are never confused with each other.

`grades.jsonl` mints no id at all — rows are keyed by `sliceId` +
`recordedAt`/`ts`, so this ledger only needed the merge-driver fix.

## Residual risk — read before relying on ledger order

**Line order after a multi-branch merge reflects merge sequence, not
original authorship time.** In the verified scenarios above, whichever
branch was merged in second had its lines appended *after* the branch merged
first, regardless of which branch actually logged its entry earlier in wall
time. Concretely: `recentLearnings(repo, N)` (the "last N" feed-forward
digest read by `slice-linker/start-slice.mts` and `brief.mts`) takes a
positional tail slice of the file — right after a wave merges several
worktree branches, that tail can surface an entry that is chronologically
older than something already in `main`, once, until the next real append
naturally restores recency. No reader crashes or throws on this — it is a
cosmetic staleness window, not a correctness break — and it self-corrects on
the next write. `grades.jsonl` has no order-sensitive in-repo reader today
(nothing in `src/scripts` reads it back; it exists as the `M1` mirror /
webhook-fanout source of truth for external consumers), so this risk applies
to `learnings.jsonl` only.

If a future consumer needs true chronological ordering across merges, sort
by the entry's `timestamp` field instead of relying on file position — the
data is present, it just isn't what today's readers key off of.

## Verification transcript (abbreviated)

```
$ git merge --no-edit branch-a   # first merge (fast-forward)
Fast-forward
$ git merge --no-edit branch-b   # second merge (real 3-way on the tail)
Auto-merging .claude/artifacts/loop/learnings.jsonl
Merge made by the 'ort' strategy.
$ cat .claude/artifacts/loop/learnings.jsonl
{"id":1,"key":"base","insight":"base entry"}
{"id":2,"key":"from-a","insight":"insight added on branch A"}
{"id":2,"key":"from-b","insight":"insight added on branch B"}
```

Both lines present (despite the literal `id:2` collision in this
illustration — union merge does not deduplicate on `id`, only on exact whole
-line text), zero conflict markers, clean `git status`.
