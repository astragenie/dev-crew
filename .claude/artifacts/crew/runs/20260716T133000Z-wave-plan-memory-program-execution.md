# Wave plan — memory-program execution (T-slice + Phase 3b), parallel worktrees

- **Date:** 2026-07-16 · **Base:** main @ 942ef250
- **Source plans:** `20260716T120000Z-plan-extraction-quality-templates-validity.md` (v2, dual-reviewed) + `20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md` (Phase 3b)
- **Mode:** parallel builders in isolated git worktrees → parallel reviewers in isolated worktrees → fix wave if needed → merge train + one integration PR.
- **Out of scope:** dev-team repo work (3c — different repo, own session), upstream astramem-local E-work (proposal-only).

## File-ownership decomposition (why 3 builders, not 4)

T2 (structured `--learnings` at close) and Phase 3b (close-time batch credit + agentType threading) both modify the slice-close path (`complete-slice.mts`, `memory-gepa.mts`) → constitution forbids shared ownership → fused into one builder (B2).

| Agent | Scope | Owns (exclusive) |
|---|---|---|
| B1 | T1 marker rewrite + T5 digest fold-in + `validate-dispatch-markers.mts` + CI gate entry | `src/scripts/lib/slice-linker/dispatch.mts`, `src/scripts/lib/slice-linker/start-slice.mts`, `src/scripts/validate-dispatch-markers.mts` (new) + its test, `.github/workflows/*` (validator entry), CLAUDE.md CI-gate list |
| B2 | T2 structured learnings capture + 3b outcome-weighted close credit + agentType threading + usefulness telemetry in snapshot | `src/scripts/lib/memory-gepa.mts`, `src/scripts/lib/slice-linker/complete-slice.mts`, `src/scripts/lib/grade-writer*`, snapshot lib (usefulness line), `commands/close.md`, their tests |
| B3 | T3 reviewer-dispatch template split (durable findings vs run evidence) | `src/scripts/lib/post-builder-fanout.mts` + its test |
| R0 | (read-only researcher, no worktree) echo-origin attribution of the 30 audited todo atoms (T1 ceiling check) + `promote_memory` dormancy check (feeds #374 E7) | none — findings artifact only |

Shared-file bans (all builders): `loop-snapshot.md` (lead regenerates at merge), `memory-sink.mts` / `memory-transport.mts` / `memory-noise-guard.mts` (just shipped in #517 — consume, don't edit), backlog, agents/*.md near the 300-line cap.

## Waves

1. **Wave 1 — build (3 worktree builders + 1 researcher, parallel).** Each builder commits locally on its worktree branch; runs full gates incl. `biome format --check` (pre-push hook skips worktree pushes — known trap).
2. **Wave 2 — review (parallel reviewers, isolated worktrees pointed at each builder branch).** Reviewer per diff; verdicts gate wave 3.
3. **Wave 3 — fix (only if needs_fix)** — re-dispatch the affected builder into its own worktree; re-review delta.
4. **Wave 4 — merge train (lead, sequential):** integration branch off main → merge B3 → B1 → B2 (smallest first) → regen snapshot → full gates → one PR → live e2e suite run → merge on green.

## Invariants carried

Ceremony-neutral (no new gates/steps; fail-silent, bounded, `memory.enabled: never` kill-switch on every new touchpoint); credit calls batched at close via the shared astramem-client seam (never per-call cold spawns — astramem-local#343); learnings capture through memory-sink (inherits tagging/scope/noise-guard from #515/#517).
