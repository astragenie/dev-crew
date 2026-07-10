---
id: FEAT-257
status: done
priority: null
category: tooling
target_release: null
created: 2026-07-10
updated: 2026-07-10
depends_on: []
slices: [SLICE-159]
derived_from: null
autonomous_safe: null
pm_reviewed: null
triage_notes: "Filed 2026-07-10 from SLICE-149 grade followup. FEAT-244's spawn slice was numbered SLICE-147 locally while a parallel wave session closed FEAT-247's SLICE-147 on origin/main — the collision was only caught at close/push time and required a manual renumber to SLICE-149 across 19 artifact files (slice file, trajectories, shape-marker, plan, grades, handoffs, syntheses, agent/cost reports) plus commit messages that now permanently reference the old id."
started_at: 2026-07-10
slices_complete: [SLICE-159]
completed_at: 2026-07-10
---
# FEAT-257: collision-proof slice-ID allocation across concurrent sessions

## Problem

Slice IDs are allocated locally (max existing + 1) with no awareness of
concurrent sessions or unpushed remote state. Two sessions slicing at the
same time both mint the same `SLICE-NNN`. The 2026-07-10 collision
(FEAT-244 vs FEAT-247, both minting SLICE-147; FEAT-250's wave then minted
SLICE-150/151/154 minutes after SLICE-149 was pushed) shows this is the
steady state under wave/parallel operation, not a freak event.

## Proposed direction

At `runner:start` / slice-creation time:

1. `git fetch origin` (best-effort, non-fatal offline) before numbering.
2. Scan slice IDs across local AND `origin/main` state: `slices/{pending,completed}`,
   trajectories, shape-markers, grades — take max + 1.
3. Optionally add a session-salt reservation (e.g. write the shape-marker
   first, push-check on conflict) or renumber-at-close tooling so a late
   collision is a mechanical rename, not a 19-file manual sed.

## Acceptance criteria

- [ ] Given two sessions creating slices concurrently from the same base,
      When the second one fetches before numbering, Then it does not reuse
      an id visible on origin/main.
- [ ] Given an unavoidable late collision (both numbered before either
      pushed), When the loser rebases, Then a CLI subcommand (e.g.
      `slice renumber --from SLICE-A --to SLICE-B`) renames all artifact
      files + internal references atomically.
- [ ] Offline / no-remote repos still allocate (fetch failure degrades to
      local scan, warning logged).
