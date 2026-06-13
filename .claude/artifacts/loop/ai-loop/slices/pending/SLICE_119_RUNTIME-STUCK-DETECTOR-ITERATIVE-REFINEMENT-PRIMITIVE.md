---
id: SLICE-119
title: Runtime stuck-detector halt-badge
status: pending
feature: FEAT-130
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 257
github_url: "https://github.com/sergeymilashico/loop/issues/257"
---
# SLICE-119: Runtime stuck-detector halt-badge

Implements FEAT-130. See [feature file](../../../backlog/in-progress/FEAT-130.md) for product context.

## Objective

Add a `stuckDetected` halt-badge to the stop-check pipeline so the autonomous walker
detects when a builder cycles without progress and emits a halt before cost accumulates.
Iterative refinement is out of scope for this slice.

## Design

### State file
`.claude/state/loop/stuck-detector.json` (operator-local, gitignored):
```json
{ "sliceId": "SLICE-NNN", "attempts": 3, "lastAttemptAt": "2026-06-13T12:00:00.000Z" }
```

### Signal interface
```typescript
export interface StuckDetectedSignal {
  sliceId: string;
  attempts: number;
  threshold: number;
  lastAttemptAt: string;
}
```

### Check function — `checkStuckDetector(repoPath): Promise<StuckDetectedSignal | null>`
1. Read `.claude/state/loop/stuck-detector.json` — return null if absent
2. Parse JSON — return null on error
3. Validate: object, non-null, `sliceId: string`, `attempts: number` — return null if invalid
4. Read `loop.stuckDetectorThreshold` from `.claude/loop.json` (default 3)
5. If `attempts >= threshold` → return signal; else return null

### CLI subcommands added to `loop.mts`

**`stuck-tick --slice SLICE-NNN [--repo <path>]`**
- Creates `.claude/state/loop/` dir (recursive)
- Reads existing file: if same sliceId, increments `attempts`; if absent or different sliceId, sets `attempts: 1`
- Writes `{ sliceId, attempts, lastAttemptAt: new Date().toISOString() }`
- Outputs `{ sliceId, attempts }` JSON
- Sets `process.exitCode = 0`

**`stuck-reset [--repo <path>]`**
- Deletes `.claude/state/loop/stuck-detector.json` if present (idempotent)
- Outputs `{ reset: true }` JSON
- Sets `process.exitCode = 0`

### Halt-badge (9th entry in HALT_BADGES registry)
```typescript
{ field: "stuckDetected", gateName: "Stuck detector", render: renderStuckDetected }
```
Render lines:
- `- Slice: ${e.sliceId}`
- `- Builder attempts without PASS: ${e.attempts} (threshold ${e.threshold})`
- `- Last attempt at: ${e.lastAttemptAt}`
- `- Suggested action: run \`bun src/scripts/loop.mts stuck-reset\` to clear the counter, then investigate builder failures. Consider narrowing scope or fixing root cause before re-dispatching.`

### stop-conditions.mts wiring
- Import `checkStuckDetector, StuckDetectedSignal` from `./stuck-detector.mjs`
- 14th element in `gatherStopInputs` Promise.all: `checkStuckDetector(repoPath)`
- `buildStuckDetectedSnapshotEntry(sig)` → returns sig or null
- `applyStuckDetectedSignal(sig, reasons, suggestions, blockers)`:
  - reason: `"stuck_detected: ${sig.sliceId} builder attempted ${sig.attempts} times without PASS"`
  - blocker category: `"stuck-detected"`
- Call after `applyPausedForExternalEventSignal` in `checkStopConditions`
- Snapshot: `stuckDetected: buildStuckDetectedSnapshotEntry(p.stuckDetectedSignal)`

## In scope
- `src/scripts/lib/stuck-detector.mts` (new module)
- `stop-conditions.mts` — 14th halt-badge wiring
- `halt-badges.mts` — 9th registry entry + renderer
- `loop.mts` — `stuck-tick` + `stuck-reset` subcommands
- `docs/halt-badges.md` — `snapshot.stuckDetected` section
- `.gitignore` — add `.claude/state/loop/stuck-detector.json`
- `src/tests/stuck-detector.test.mts` (new, ≥7 tests)
- `src/tests/explain-halts.test.mts` — update registry count 8→9 + fixture

## Out of scope
- Iterative refinement loop (higher-scope follow-on)
- Auto-increment from within loop orchestration
- "Same error in consecutive validator runs" detection

## Acceptance criteria

- [ ] AC-1: `checkStuckDetector` returns null when stuck-detector.json absent
- [ ] AC-2: Returns null on malformed JSON (fail-open)
- [ ] AC-3: Returns null when `attempts < threshold`
- [ ] AC-4: Returns signal `{ sliceId, attempts, threshold, lastAttemptAt }` when `attempts >= threshold`
- [ ] AC-5: `stuck-tick` creates file with `attempts: 1` if absent; increments if same sliceId; resets to 1 if different sliceId
- [ ] AC-6: `stuck-reset` deletes file if present; idempotent if absent (no error)
- [ ] AC-7: `gatherStopInputs` calls `checkStuckDetector` as 14th parallel call
- [ ] AC-8: `assembleStopResult` snapshot includes `stuckDetected` field
- [ ] AC-9: HALT_BADGES registry count test updated to 9; `stuckDetected` in expected array
- [ ] AC-10: `.claude/state/loop/stuck-detector.json` in `.gitignore`
- [ ] AC-11: `docs/halt-badges.md` has `snapshot.stuckDetected` section
- [ ] AC-12: `stuck-detector.test.mts` has ≥7 tests covering AC-1 through AC-6

## Done When

- all acceptance criteria PASS with evidence
- `bunx tsc --noEmit` (both tsconfigs) clean
- `bunx eslint` 0 errors
- `bunx prettier --check` clean on changed files
- `bun test src/tests/ --parallel` — ≤ 1 fail (pre-existing), same skip count

## Reviewer ladder

- Reviewer A: correctness + AC coverage — verify badge wires into stop-check, stuck-tick/reset r/w, tests cover all fail-open cases
- Reviewer B: production-readiness + security — verify fail-open contract, gitignore entry, no process.exit from library, complexity ≤ 15
