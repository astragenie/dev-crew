# Lead Dispatch Visibility — Design

**Status**: draft (awaiting implementation FEAT)
**Date**: 2026-06-04
**Origin**: SLICE-35 / FEAT-037 surfaced workflow ambiguity — parent (orchestrator) was surprised when crew:lead chose single-session inline mode for a 3-test slice instead of dispatching crew:fullstack-dev. Lead followed the v0.7.2 `dispatchInstruction` prompt correctly ("Prefer inline for test-fix"); the surprise was a visibility gap, not a misbehavior.

## Goal

Give the parent orchestrator early visibility into crew:lead's chosen mode and per-AC progress, so that parent can cleanly interrupt or let the run proceed without surprise. Preserve lead's discretion to choose inline vs team-run per workflow rules.

## Non-goals

- Forcing crew:lead to dispatch crew:fullstack-dev for every code-bearing slice (HARD RULES vs v0.7.2 prompt reconciliation is a separate FEAT).
- Cross-plugin changes to `crew/agents/lead.md`. This FEAT is loop-side only.
- Enforcement: if lead omits the conventions below, parent degrades gracefully — no retry, no error.

## Architecture

Single-file edit to `src/scripts/lib/slice-linker/start-slice.mts::buildDispatchInstruction`. Inject a new `## Progress signals` block into the lead's prompt. Convention is advisory; parent can grep the lead's output stream for the new line-tags but does not block close-out on their absence.

## Format spec

Two new line-tags lead is instructed to emit.

### `[MODE]` — first response only

```
[MODE] <single-session|assisted-single-session|team-run> [— optional free-form note]
```

- Emitted exactly once, in lead's first turn after dispatch.
- One of three values, mirrors the crew lead workflow mode taxonomy.
- Free-form note may follow `—`, e.g. `[MODE] team-run — delegating crew:fullstack-dev for src/foo/`.

### `[CHECKPOINT]` — once per AC

```
[CHECKPOINT] AC-<N>: <pass|fail|skip> — <≤80 char note>
```

- One emitted per AC in the slice, AFTER the AC is verified.
- Status is one of `pass` / `fail` / `skip`.
- Status `fail` is the parent's interrupt signal — parent may pivot to `/crew:fix` rather than wait for the close ceremony.
- Status `skip` carries a reason in the note (e.g., `skipped — issue addressed in earlier slice`).

## Error handling

Conventions are advisory:

- Lead omits `[MODE]` → parent loses surprise prevention but no error. Falls back to current behavior.
- Lead omits `[CHECKPOINT]` → parent has no mid-run visibility. Close ceremony still works.
- Malformed line → parent ignores. Doesn't block close.

Future tightening (separate FEAT, conditional on observed drift):

- Parser hook in `/loop:slice complete` that warns if the number of `[CHECKPOINT]` lines in the trajectory differs from the slice's AC count.
- Retry-with-reminder pattern if `[MODE]` missing from lead's first turn.

## Testing

- **Unit test** in `src/tests/slice-start.test.mts` (or similar): assert `buildDispatchInstruction({ slice, ... })` returns a string containing both convention blocks. Use regex tokens: `/\[MODE\] <single-session/`, `/\[CHECKPOINT\] AC-<N>/`.
- **Behavioral observation** in next 2-3 live lead dispatches:
  - Does lead emit `[MODE]` in first response? Target: 100%.
  - Does lead emit one `[CHECKPOINT]` per AC? Target: ≥ 80% per dispatch (one missing line is acceptable noise).
- If observed adoption is below 80% after 5 dispatches, file follow-up FEAT for either prompt tightening or enforcement layer.

## References

- Trigger event: SLICE-35 (commit `70bd72d`, grade `0.897`) — lead dispatched, chose inline mode, was about to write artifacts when parent stopped it.
- v0.7.2 release: `chore(release): v0.7.2 — slice dispatch routes to crew:lead + FEAT-034 marker drain + auditLogPath` (commit `3b0683b`). Established `buildDispatchInstruction` emitting `Dispatch crew:lead subagent...`.
- HARD RULES: `.claude/loop/rules.md` — currently says "never implement inline except trivial single-line fixups". Reconciliation with v0.7.2 lead prompt is a separate FEAT (already noted in GRADE-SLICE-35 Followups).
