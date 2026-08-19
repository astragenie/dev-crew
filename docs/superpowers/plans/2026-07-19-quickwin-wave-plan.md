# Quick-win wave plan — 2026-07-19

Goal: land 8 quick wins in 2 parallel waves + serial close-out, max parallelism
via isolated worktrees, zero same-file overlap inside a wave.

## Conflict analysis (drives packing)

| Item | Touch surface | Conflicts with |
|---|---|---|
| FEAT-236 cleanups | `src/scripts/lib/*` (dead exports), `.github/workflows/ci.yml`, `CLAUDE.md` | 237 (CLAUDE.md), 246 (lib sweep may touch provider modules) |
| FEAT-237 template/command-ref reconcile | install templates, `src/scripts/validate-agent-refs.mts`, `CLAUDE.md` | 236 (CLAUDE.md) |
| FEAT-249 wave-run dirty-tree fix | `src/scripts/lib/wave*.mts` + test | none |
| README comparison table (audit §6 #7) | `README.md` only | metrics band gate #18 — band section must stay untouched |
| dev-team preset-path repoint (upstream 2026-07-06) | `dev-team` repo, `orchestrate-slice.md` | none — different repo |
| FEAT-246 tracker-as-queue glue | watcher/provider modules | 236 dead-export sweep |
| FEAT-262 backlog-store split | `src/scripts/lib/backlog-store.mts`, `validate-backlog-writes.mts` | none in wave 2 |

## Wave 0 — prep (main checkout, sequential, ~10 min, no worktrees)

1. `/devcrew:intake` over pending — scores FEAT-236/237/249/262 into `triaged/`
   (all sit in `pending/` today; loop cannot pick them). PM inline spec
   (FEAT-277) stamps `touches_files` — required by the wave planner and CI
   gate #11.
2. Same intake pass: file **comparison-table FEAT** (body = audit §6 item 7)
   so it rides the ceremony instead of an untracked README edit.
3. Regen `loop-snapshot` + commit wave-0 prep on a fresh branch
   (`chore/wave0-intake`). New branch+PR per batch — auto-merge-window-trap.
4. Check marathon checkpoint pressure (`snapshot.marathonCheckpoint`) — a hard
   stop mid-wave wastes the whole dispatch; run `/devcrew:retrospective` first
   if `level` is near hard.

## Wave 1 — 4 parallel lanes (worktrees)

| Lane | Item | Worktree | Files |
|---|---|---|---|
| A | FEAT-236 cleanups | `runner-plugin` wt | lib sweep + ci.yml + CLAUDE.md |
| B | FEAT-249 dirty-tree fix | `runner-plugin` wt | `wave*.mts` + test |
| C | comparison-table FEAT | `runner-plugin` wt | README.md (not the metrics band) |
| D | dev-team preset-path repoint | `dev-team` wt | `commands/orchestrate-slice.md` Step 2.5 |

Zero file overlap. Dispatch all four in ONE parallel Agent block
(`/devcrew:parallel` for A–C; lane D is a separate `devcrew:build` against dev-team).
Merge order after all PASS: A → B → C (priority order), D independent PR on
dev-team.

## Wave 2 — 3 parallel lanes (after wave-1 merge)

| Lane | Item | Files |
|---|---|---|
| A | FEAT-237 reconcile | templates + validate-agent-refs + CLAUDE.md (now free) |
| B | FEAT-262 backlog-store split | backlog-store.mts + validator |
| C | FEAT-246 tracker-as-queue glue | provider/watcher modules (post-236 sweep) |

## Wave 3 — serial close-out (main checkout)

1. `/devcrew:close` per finished slice (PR merge alone strands FEATs in
   pending — reconcile via ceremony, known trap).
2. Regen snapshot + `generate-metrics-band.mts --write` (gates #13/#18).
3. CHANGELOG + single release PR for the batch; version bump if warranted.

## Rules in force

- One owner per lane; lane scope = its file list, escalate instead of reaching
  across.
- Reviewer ladder `["A"]` per repo config; validation satisfied-by-review.
- Learnings capture: resolve astramem writes to git common-dir (worktree
  pruning trap).
- Biome format --check before any worktree push (CI fast-gate trap).
- No release tags without operator approval.

## Not in this batch

- FEAT-230 (P1, task-driven skill selection) — needs operator in review loop;
  next program after quick wins.
- Install wizard UX (audit #3) — file as FEAT during wave 0, schedule
  separately (M effort, not a quick win).
- Bake-tail measurements — calendar-gated ~2026-07-25.
