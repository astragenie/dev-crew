---
id: SLICE-118
title: Pause / resume conversation lifecycle for async waits
status: pending
feature: FEAT-128
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 256
github_url: "https://github.com/sergeymilashico/loop/issues/256"
---
# SLICE-118: Pause / resume conversation lifecycle for async waits

Implements FEAT-128. See [feature file](../../../backlog/in-progress/FEAT-128.md) for product context.

## Objective

Add a first-class `pausedForExternalEvent` halt-badge to the autonomous loop walker so operators can suspend the loop on an external wait (CI run, PR review, deploy gate) and resume cleanly without session-end-and-restart.

## Design

State storage: a new loop-owned file `.claude/state/loop/paused.json` (created by `/loop:pause`, deleted by `bun src/scripts/loop.mts resume`). The halt-badge fires when this file exists and is parseable. The walker stops; when the operator is ready, they run the CLI resume command which deletes the file and the next `stop-check` returns `shouldStop: false`.

Resume semantics: loop resumes from current backlog/workflow state — no checkpoint replay needed because slice artifacts ARE the state. The pause only suspends the auto-walker; all prior slice work remains intact.

No new external dependencies. Follows the `marathon-checkpoint.mts` module pattern.

## In scope

- `src/scripts/lib/paused-for-external-event.mts` — new module: `checkPausedForExternalEvent` reads `.claude/state/loop/paused.json`, returns signal or null
- `src/scripts/lib/stop-conditions.mts` — import + wire new badge into `gatherStopInputs`, `checkStopConditions`, `assembleStopResult`
- `src/scripts/loop.mts` — add `pause` and `resume` subcommands (see CLI shape below)
- `docs/halt-badges.md` — add `snapshot.pausedForExternalEvent` registry entry
- `src/tests/paused-for-external-event.test.mts` — tests (see ACs)

## Out of scope

- Interactive UI or notifications
- Integration with specific CI providers
- Modifying the `/loop:pause` command file (that's a separate doc-writer task)
- Retry-tracking or iterative refinement (FEAT-130)

## CLI shape

```
bun src/scripts/loop.mts pause --reason "waiting for CI" [--repo <path>]
  # writes .claude/state/loop/paused.json
  # exits 0

bun src/scripts/loop.mts resume [--repo <path>]
  # deletes .claude/state/loop/paused.json if present
  # exits 0 whether or not file existed (idempotent)
```

Pause file schema (`.claude/state/loop/paused.json`):
```json
{
  "triggered": true,
  "reason": "waiting for CI",
  "resumeHint": "Run: bun src/scripts/loop.mts resume --repo .",
  "pausedAt": "2026-06-13T12:00:00.000Z"
}
```

## Halt-badge shape (`snapshot.pausedForExternalEvent`)

```ts
{
  triggered: true;
  reason: string;
  resumeHint: string;
  pausedAt: string;
}
```

Null when `.claude/state/loop/paused.json` does not exist or is not parseable (fail-open).

## Acceptance criteria

- [ ] AC-1: `checkPausedForExternalEvent(repoPath)` returns `null` when `.claude/state/loop/paused.json` does not exist
- [ ] AC-2: `checkPausedForExternalEvent(repoPath)` returns the pause object when the file exists with valid JSON containing `triggered: true`
- [ ] AC-3: `checkPausedForExternalEvent(repoPath)` returns `null` (fail-open) when the file exists but is invalid JSON or missing `triggered`
- [ ] AC-4: `checkStopConditions` returns `shouldStop: true` with `"paused_for_external_event"` in reasons array when badge fires
- [ ] AC-5: `snapshot.pausedForExternalEvent` in stop-check output is populated when badge fires, null otherwise
- [ ] AC-6: `bun src/scripts/loop.mts pause --reason "…" --repo .` writes `.claude/state/loop/paused.json` and exits 0
- [ ] AC-7: `bun src/scripts/loop.mts resume --repo .` deletes the pause file (if present) and exits 0; idempotent when file absent
- [ ] AC-8: `docs/halt-badges.md` has `snapshot.pausedForExternalEvent` registry entry (Shape, Meaning, Fires when, Suggested operator action, Origin)
- [ ] AC-9: `bun test src/tests/ --parallel --timeout 60000` passes with ≥ 5 new tests in `paused-for-external-event.test.mts` covering ACs 1–5
- [ ] AC-10: `bunx tsc --project tsconfig.json --noEmit` + `bunx tsc --project tsconfig.test.json --noEmit` clean
- [ ] AC-11: `bun run lint` and `bun run format:check` clean

## Observability AC (for reviewer targeting)

- AC-12: The reasons string pushed when badge fires follows the pattern `"paused_for_external_event: <reason> (paused at <pausedAt>)"` — human-readable and parseable

## Done when

- All ACs PASS with evidence
- `.claude/state/loop/paused.json` is listed in `.gitignore` (operator-local state, must not be committed)
- `docs/halt-badges.md` updated in this same slice
- FEAT-128 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage — verify badge wires into stop-check, pause file r/w, tests cover all 5 signal cases
- Reviewer B: production-readiness + security — verify fail-open on malformed JSON, `.gitignore` entry, module exports, no process.exit from library, complexity within cap
