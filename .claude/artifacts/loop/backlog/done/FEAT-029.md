---
id: FEAT-029
status: done
priority: P1
category: infrastructure
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-24]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-24]
completed_at: 2026-06-04
github_issue: 61
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/61"
---
# FEAT-029: Pattern alerts — skip decomposition warn for DONE features

## Description

`decomposition` pattern alert fires when a feature has ≥3 linked
slices. The alert is useful for active features (pending / triaged /
in-progress) — it surfaces scope creep early. For DONE features it is
pure noise: shipped work cannot be re-decomposed and the alert
blocks the marathon loop from progressing to unrelated work.

State-gate the alert: emit `warn` for active features (current
behavior preserved), emit `info` for done features (observability
signal preserved, but does not gate `stop-check`).

## Motivation

FEAT-024, FEAT-025, FEAT-026 each shipped with 3 slices. All are
done. The warns block marathon loop from running FEAT-028 SLICE-B
even though there is no actionable scope decision to make for
shipped work.

## Goals

- `pattern-alerts.mts::detectDecompositionAlerts` returns
  `severity: "info"` for done features with ≥3 slices, `severity:
  "warn"` for active features with ≥3 slices.
- `stop-check` no longer halts on done-feature decomposition history.
- `brief` / `memory-snapshot` continue to surface the info line so
  history is visible.
- Marathon loop can pick up FEAT-028 SLICE-B without manual override.

## Design decision (resolved up front)

- **No new config keys.** Keep loop.json clean. State-gate the alert
  in code; correct default is "don't gate on history".
- **Info severity, not silent drop.** Preserves retrospective signal.
  Retrospective skill + `brief` see it; stop-check ignores it.
- **One slice, ~15 LOC + ~30 LOC tests.** No multi-slice plan.

## Slices

- **SLICE-A — state-gate decomposition alert** (~30 min)
  - Edit `src/scripts/lib/pattern-alerts.mts` to branch on
    `feat.state` when emitting decomposition alert
  - Update `src/tests/pattern-alerts.test.mts` to assert the new
    contract (warn for pending/in-progress, info for done)
  - Verify `stop-check` returns no `decomposition` blocker after build
  - Verify `npm test`, lint, typecheck, format clean
  - No other files touched

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new pattern-alerts cases)
- [ ] AC-2: `npm run lint`, `npm run typecheck`,
      `npm run format:check` all clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: After rebuild, `node scripts/loop.mjs stop-check
      --repo "$PWD"` returns no entry in `blockers` with
      `category: "decomposition"` referencing FEAT-024/025/026
- [ ] AC-5: After rebuild, the same stop-check still surfaces
      `decomposition` entries in the `snapshot.totalAlerts` count
      (proves info-severity preserved)
- [ ] AC-6: Test asserts: active 3-slice FEAT → `severity: "warn"`
- [ ] AC-7: Test asserts: done 3-slice FEAT → `severity: "info"`
- [ ] AC-8: No new exports, no signature changes — pure behavior
      change inside the helper

## Out of scope

- Retrospective SPEC authoring for the 3 affected DONE FEATs
- `loop.json` config additions (`alertIgnorePatterns` etc.)
- Other pattern alert categories (`score-trend`, `spec-flow`,
  `backlog-flow`, `in-progress-orphan`)
- Changes to `stop-conditions.mts` — it already filters by severity
  correctly; downgrade to `info` makes it ignore done-feature alerts
  automatically.

## Risks

- **Over-suppression**: a real "this should have been 2 features"
  signal gets lost on done features. Mitigation: info severity
  preserves the line in `brief` + `snapshot`; retro skill can still
  surface it.
- **Consumer assumption flip**: some consumer filters by
  `category` and assumes `warn`. Mitigation: only consumers are
  tests + the alert generators themselves (verified via Grep).
- **Cached `listBacklog` returns stale state**: existing tests use
  fresh `tmpRepo` per test, cache key includes `repoPath` — no
  cross-test leak.
