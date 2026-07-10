---
id: SLICE-159
title: collision-proof slice-ID allocation across concurrent sessions
status: completed
feature: FEAT-257
phase: null
priority: null
target_release: null
requires_validation: true
risk: medium
created: 2026-07-10
updated: 2026-07-10
completed_at: 2026-07-10
---
# SLICE-159: collision-proof slice-ID allocation across concurrent sessions

Implements FEAT-257 per design DEC-079 (Option C: fetch-scan allocator + renumber CLI). See [feature file](../../../backlog/done/FEAT-257.md).

## Objective

Slice IDs were allocated purely local (max existing + 1), with no awareness of
concurrent sessions or unpushed `origin/main` state — so two wave/parallel
worktrees both minted the same `SLICE-NNN` (real 2026-07-10 SLICE-147 incident,
19-file manual renumber). Close the common case with a remote-aware fetch-scan
allocator, and make the residual race a mechanical CLI fix instead of a manual sed.

## In scope

- SLICE-A: `slice-id-allocator.mts` — best-effort `git fetch origin main` +
  `git ls-tree origin/main` remote scan, `max(local, remote) + 1`; `createSlice`
  routes allocation through it. Offline degrades to local-only + warning.
- SLICE-B: `slice-renumber.mts` + `backlog slice-renumber --from --to [--dry-run]`
  CLI — state-dir-aware slice rename, KIND_REGISTRY-driven artifact rename +
  bespoke families (trajectory/events/shape-marker), FEAT `slices:` rewrite,
  append-only ledger events, refuse-on-toId-exists, partial-failure reporting.

## Out of scope

- SLICE-C (runner:start-time collision-detection wiring + `slice-id-allocation.md`
  doc) — deferred followup per DEC-079 (optional; ACs are met without it).
- Lease-file reservation (Option B) — the residual both-numbered-before-push
  race is an accepted trade-off; renumber CLI remediates it.

## Acceptance criteria

- [x] Given two sessions creating slices concurrently from the same base, when
      the second fetches before numbering, then it does not reuse an id already
      committed on `origin/main`. Evidence: `slice-id-allocator.test.mts`
      remote-max-wins test (commits SLICE-10 to origin/main, local at SLICE-03,
      allocates 11). Reviewer PASS 20260710T182948Z.
- [x] Given an unavoidable late collision, when the loser runs
      `bun loop.mts backlog slice-renumber --from SLICE-A --to SLICE-B`, then it
      renames every artifact + frontmatter/ledger reference atomically, or
      refuses cleanly if `--to` exists. Evidence: `slice-renumber.test.mts`
      (15 tests: per-state-dir rename, KIND_REGISTRY artifacts, bespoke families,
      FEAT slices: update, append-not-mutate ledgers, toId-exists refusal,
      adjacent-id no-over-match, partial-failure diagnostics). Reviewer
      CHANGES-REQUESTED → 3 findings fixed → verified.
- [x] Offline / no-remote repos still allocate: fetch failure degrades to
      local-only scan, warning logged, no exception. Evidence:
      `slice-id-allocator.test.mts` offline + missing-origin/main tests
      (assert local fallback + warning, no throw).

## Done When

- all acceptance criteria PASS with evidence — DONE
- build / test commands pass — DONE (tsc x2 clean, biome lint/format clean on
  touched files, full suite 2744 pass / 0 fail, validate-imports/backlog-writes/
  manifests OK)
- feature FEAT-257 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (SLICE-A): crew:reviewer — PASS, no findings (20260710T182948Z).
- Reviewer B (SLICE-B): crew:reviewer — CHANGES-REQUESTED (1 HIGH partial-failure
  rollback, 2 MEDIUM sole-writer ledgers + adjacent-id test) → all fixed →
  re-verified green (20260710T185119Z).
