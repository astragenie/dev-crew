# Feature lifecycle: end-of-feature simplify + per-slice workflow events

**Date:** 2026-06-08
**Status:** approved
**Author:** brainstorming session

---

## Problem

Two gaps in the current loop workflow:

1. Code quality drifts across slices — no cleanup pass runs after all slices of a feature complete.
2. Workflow state is opaque — no per-slice record captures gate transitions, agent actions, errors, or current phase in real-time.

---

## Scope

Two capabilities shipped together (shared `appendSliceEvent` primitive):

- **A.** End-of-feature simplify step
- **B.** Per-slice workflow events JSONL

---

## A. End-of-feature simplify step

### Trigger

`slice-complete` checks after ceremony write whether all slices for the parent FEAT have `status: done`. If yes, calls `feature simplify FEAT-NNN` automatically before returning.

### New CLI subcommand

```
node loop.mjs feature simplify FEAT-NNN
```

Can also be called manually (re-run, debug).

### File scope

Collect changed source files via `git log --name-only` from the first slice's `startedAt` timestamp to HEAD. Filter to `.mts`/`.mjs` source files. Deduplicate. Git diff is ground truth — slice plan/handoff artifacts are not reliable enough as file lists.

### Dispatch

`code-simplifier:code-simplifier` agent. Prompt supplies:
- Deduplicated file list
- Instruction: simplify only — no behavior changes, no new tests, no scope expansion beyond supplied files.

### Outputs

- `ceremonies/feature-end-FEAT-NNN.json` — `simplifyRan: true` (field already stubbed in `ceremonies.mts::featureEnd`)
- One entry appended to `auto-dispatch.jsonl` audit trail
- `agent_dispatched` + `agent_completed`/`agent_error` events written to last slice's `SLICE-NNN-events.jsonl`

### Skip conditions

- No slices with `startedAt` found in git history → `simplifyRan: false`, silent skip
- `--skip-simplify` CLI flag → same

### Review

No dedicated review gate. Simplifier produces style/clarity edits only — not behavior-changing. Reviewed opportunistically on next commit review.

---

## B. Per-slice workflow events JSONL

### File location

```
.claude/artifacts/loop/trajectories/SLICE-NNN-events.jsonl
```

Parallel to existing `SLICE-NNN-trajectory.jsonl`. One file per slice. Real-time append, one JSON line per event.

### New module

`src/scripts/lib/slice-events.mts`

Single export:

```typescript
appendSliceEvent(repoRoot: string, sliceId: string, event: SliceEvent): Promise<void>
```

Uses same batched-write pattern as `auto-dispatch.mts` (Win 10 I/O safe).

### Event schema

All events share base fields:

```typescript
{ type: SliceEventType, sliceId: string, featureId: string|null, timestamp: string }
```

Five event types:

```typescript
// State machine transition
{ type: 'workflow_state_changed',
  from: string|null,
  to: 'building'|'reviewing'|'validating'|'done'|'blocked' }

// Gate opens or resolves
{ type: 'gate_transition',
  gate: 'review'|'validation'|'deployment'|'blocked',
  from: string|null,
  to: 'open'|'passed'|'failed'|'skipped',
  reason?: string }

// Agent sent to work
{ type: 'agent_dispatched',
  agent: string,
  parentCommand: string }

// Agent returned
{ type: 'agent_completed',
  agent: string,
  status: 'ok'|'skipped'|'error',
  reason?: string,
  durationMs: number }

// Agent returned with error (explicit type for grep)
{ type: 'agent_error',
  agent: string,
  error: string,
  reason?: string }
```

### Write sites

| Call site | Events emitted |
|---|---|
| `slice-start` subcommand | `workflow_state_changed: null → building` |
| `auto-dispatch.mts::appendAuditLog` | `agent_dispatched` + `agent_completed` / `agent_error` |
| Gate-write helpers (review/validation/deployment) | `gate_transition` |
| `slice-complete` subcommand | `workflow_state_changed: building → done` |

### Readers

None required at this stage. File is grep/tail-friendly by design. Future readers (dashboard, briefing enrichment) can be added later.

---

## Pre-existing stubs (not new work)

`src/scripts/lib/slice-linker/complete-slice.mts` lines 136–155 already implement `isSimplifyBlocked`:
- Reads `ceremonies/feature-end-FEAT-NNN.json` via `readFeatureEndCeremony`
- Blocks feature completion if ceremony exists with `simplifyRan: false`
- If no ceremony exists → NOT blocked (simplify was never triggered)

The gate logic is wired; only the dispatch that writes the ceremony is missing.

---

## Files changed

| File | Change |
|---|---|
| `src/scripts/lib/slice-events.mts` | **New** — `appendSliceEvent` + type definitions |
| `src/scripts/loop.mts` | Add `feature simplify FEAT-NNN` subcommand |
| `src/scripts/lib/slice-linker/feature-lifecycle.mts` | Detect last-slice condition; dispatch `feature simplify`; emit `workflow_state_changed: done` |
| `src/scripts/lib/slice-linker/start-slice.mts` | Emit `workflow_state_changed: null → building` on slice start |
| `src/scripts/lib/slice-linker/complete-slice.mts` | Emit `gate_transition` when gate states are read/evaluated |
| `src/scripts/lib/auto-dispatch.mts` | Call `appendSliceEvent` for `agent_dispatched` / `agent_completed` / `agent_error` |
| `src/tests/*.test.mts` | Tests for `appendSliceEvent`, last-slice detection, simplify dispatch |

---

## Out of scope

- Dashboard / reader for events file
- Review gate on simplify output
- Simplify on individual slices (feature-close only)
- Repo-wide (non-per-slice) events aggregation
