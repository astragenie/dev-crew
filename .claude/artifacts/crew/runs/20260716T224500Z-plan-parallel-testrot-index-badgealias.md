# Plan — parallelize items 3 / 6 / 8 in isolated worktrees (2026-07-16)

Scope: three stabilization tracks run concurrently, each agent in its own git worktree,
PR-only, review gate per PR. Items numbered from the session's fix list.

## Conflict analysis (why this parallelizes)

| Track | Repo | Files touched | Conflicts with |
|---|---|---|---|
| 3. test-suite rot | dev-team | `tests/**` (~147 files), possibly `scripts/test-shard.ts` | #243 (adds/edits tests) → **must land after #243 merges**; disjoint batches internally |
| 6. sync_events index | memory | 1 EF migration + regenerated `schema.sql` + deploy wiring | obs-wave builder (running) forbids migrations → no overlap |
| 8b. badge-alias deprecation | dev-team + runner-plugin | docs + DEC only (`workflow-state.ts` NOT edited in this phase) | none — test wave never touches docs |

Cross-track: 3 and 8b share the dev-team repo but zero file overlap (tests/** vs docs/**).
Each gets its own worktree so builds/installs don't collide.

## Phase 0 — gate (blocking, ~1 min)

- **Merge dev-team#243** (review + delta re-review both PASS; needs operator order).
  Test wave bases off post-merge main so batch rebases never fight the guard test.

## Phase 1 — parallel launch (3 agents, 3 worktrees)

### W1 — memory: sync_events index (item 6, memory#832)
- Worktree: `memory-worktrees/feat-sync-events-index` off origin/main.
- EF migration: `CREATE INDEX ix_sync_events_tenant_event_created ON astramemory.sync_events (tenant_id, event_type, created_at);`
- Satisfy both CI gates: "EF migrations schema.sql drift check" (regen schema.sql)
  and "Raw-SQL migrations wired into deploy (incident #657 gate)".
- Use `CREATE INDEX CONCURRENTLY` if repo's migration conventions support it
  (append-only high-volume table; check precedent migrations first, follow them).
- Deliverable: PR, closes #832. Risk: LOW. Est: S.

### W2 — badge-alias deprecation plan (item 8b)
- Read-only architect agent (no code edits): drafts the lockstep deprecation DEC for
  `escalated_to_lead` → `escalated_to_dispatcher` (dev-team `workflow-state.ts:290-301`
  defines; runner-plugin `docs/halt-badges.md` + `loop-discipline/SKILL.md` document).
- Contents: dual-emit/dual-read window, version gates (dev-team MIN version bump in
  runner-plugin `plugin-identity.mts::MIN_CREW_VERSION`), consumer inventory, rollout
  order, kill date for legacy alias.
- Deliverable: DEC doc PR in dev-team (`docs/decisions/…`) + mirrored note PR in
  runner-plugin (`docs/upstream-requests/` or DEC) — docs only, implementation is a
  later slice. Risk: LOW (no code). Est: S–M.

### W3 — dev-team test-rot scout (item 3, phase A)
- Read-only investigator in its own worktree (post-#243 main):
  1. Enumerate the exact files failing to LOAD under `bun test` (loader `NotImplementedError`
     bun#5090) vs files with REAL assertion failures. Expected ~147 pattern files / 117 fails.
  2. Validate the conversion recipe on 2–3 representative files (node:test loop-of-test()
     → bun:test describe/it, precedent: `tests/no-legacy-lead-wire-defaults.test.ts` rewrite
     + `tests/gepa/auto-merge-gate-five-conditions.test.ts`).
  3. Emit batch manifest: 4–5 disjoint file batches (~30 files each), balanced by size,
     grouped by directory so reviewers get coherent diffs.
- Deliverable: manifest artifact + validated recipe. Risk: LOW. Est: S.

## Phase 2 — test-rot conversion wave (item 3, phase B; after W3 manifest)

- 4–5 builder agents, one worktree each (`dev-team-wt-testrot-b1..b5`), one batch each.
- Rules per builder:
  - Mechanical conversion only; zero production-code edits; zero assertion-logic changes.
  - Gate per batch: every converted file loads AND its pre-existing pass/fail state is
    explained — a file that passes after conversion = done; a file that FAILS after
    conversion = real bug surfaced → add to `quarantine-manifest.md`, `it.skip` with a
    linked TODO, do NOT fix inline (scope discipline).
  - Full-suite fail/error counts must be ≤ previous batch's baseline (monotonic decrease).
- One PR per batch (disjoint files → independently mergeable). reviewer-lite per PR
  (mechanical tier), full reviewer on the final batch + quarantine manifest.
- Sequencing note: batches CAN merge in any order; each rebases trivially (disjoint).

## Phase 3 — integration close

- Full `bun test` on dev-team main after last batch: target = 0 loader errors;
  remaining fails all in quarantine manifest with linked issues.
- File follow-up FEAT for quarantined real failures (that's item 5's flake slice + new finds).
- Update handoff memory + session artifacts.

## Agent/worktree matrix

| Agent | Type | Worktree | Output |
|---|---|---|---|
| W1 idx | fullstack-dev | memory-worktrees/feat-sync-events-index | PR closes #832 |
| W2 dec | architect (read-only) + doc PRs | dev-team-wt-badge-dec (+ runner-plugin branch) | 2 doc PRs |
| W3 scout | investigator | dev-team-wt-testrot-scout | manifest + recipe |
| B1–B5 | fullstack-dev ×4–5 | dev-team-wt-testrot-b1..b5 | 4–5 PRs |
| reviewers | reviewer-lite ×N + reviewer ×1 | (read-only) | review artifacts |

Peak parallelism: 3 (phase 1) then 4–5 (phase 2). All PR-only; merges on operator order
except where a repo's auto-merge takes over after required checks (memory repo behavior).

## Risks

1. Conversion surfaces latent real failures in bulk → quarantine manifest absorbs them;
   do not let batch builders "fix" product code.
2. `scripts/test-shard.ts` may special-case node:test files — scout must check before wave.
3. memory index migration on huge table: if repo lacks CONCURRENTLY convention, a plain
   CREATE INDEX takes a lock — acceptable for dev instance; note for prod deploy evidence.
4. Badge-alias DEC touches cross-plugin contract — DEC is docs-only by design; no runtime
   change until both repos approve.
