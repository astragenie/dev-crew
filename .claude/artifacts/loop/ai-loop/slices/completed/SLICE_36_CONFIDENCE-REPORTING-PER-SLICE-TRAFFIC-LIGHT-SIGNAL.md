---
id: SLICE-36
status: completed
feature: FEAT-010
phase: 2
priority: P2
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-36: static confidence signal at slice-start (FEAT-010 SLICE-A)

Implements **SLICE-A** of FEAT-010. Computes a `confidence` traffic-light value at slice-start time from existing frontmatter signals + recent grade trend. Surfaces it in the `slice start` CLI return + the slice-progress dashboard. Mid-execution updates are out of scope for this slice (defer to SLICE-B).

## Objective

Add a `confidence: "green" | "yellow" | "red"` field to the `slice start` ceremony output. Computed deterministically from already-available signals — NO LLM call. Helps the user (and downstream tooling like LoopObserver) see whether the loop is on solid ground before dispatching the builder.

## Confidence heuristic

Input signals (all already accessible at slice-start):

- `slice.frontmatter.requires_validation` (true/false)
- `feature.frontmatter.autonomous_safe` (true/false/null)
- AC count in slice body (`detectAcceptanceCriteria` helper from FEAT-033 — reuse)
- Recent grade trend average (last 3 grades; `checkGradeTrend` helper exists)
- Feature `depends_on` length (0 = independent, >0 = chained)

Mapping (first match wins):

- **red** if: `autonomous_safe === false` AND (AC count < 2 OR recent grade avg < 0.80 OR `depends_on` non-empty)
- **red** if: AC count === 0
- **yellow** if: `autonomous_safe === false` (catch-all for needs-review) OR recent grade avg < 0.85
- **green** otherwise (autonomous_safe true, AC ≥ 3, healthy grade trend, no deps)

Include a one-line `confidenceReason` string explaining the verdict.

## In scope

- New module `src/scripts/lib/confidence-signal.mts`:
  - `computeConfidence(opts: { sliceFm, featureFm, sliceBody, recentGradeAvg }): { confidence: "green"|"yellow"|"red", reason: string }`
  - Pure function, no IO, fully unit-testable
- Wire into `src/scripts/lib/slice-linker/start-slice.mts`:
  - Load FEAT frontmatter (already available via slice's `feature` field)
  - Load AC count via `detectAcceptanceCriteria` (from backlog-triage helpers, reused)
  - Load `recentGradeAvg` from `checkGradeTrend` (already called)
  - Call `computeConfidence` + include result in start-slice return
- Wire into slice-progress dashboard (`src/scripts/lib/slice-linker/slice-progress.mts`):
  - Show confidence emoji + reason in the active-slice header row
- `src/tests/confidence-signal.mts` (new) — unit tests for the heuristic:
  - autonomous_safe + 3 AC + grade 0.92 → green
  - autonomous_safe + 1 AC + grade 0.92 → yellow (AC threshold)
  - autonomous_safe false + 5 AC + grade 0.92 → yellow (auto-safe false catch-all)
  - autonomous_safe false + 1 AC → red (compound risk)
  - AC count 0 → red regardless of other signals
  - autonomous_safe true + 3 AC + grade 0.78 → yellow (grade trend)
  - confidence reason string contains key signals

## Out of scope

- Mid-execution confidence updates (SLICE-B, future)
- LLM-driven confidence (always deterministic this slice)
- CLI flag to override / suppress confidence (always emitted)
- Confidence persistence in grade artifacts (orthogonal; could be follow-up)
- Visual emoji vs text rendering choices in LoopObserver (consumer-side concern)

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new confidence-signal tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `slice start` return contains `confidence: "green"|"yellow"|"red"` and `confidenceReason: string`
- [ ] AC-5: slice-progress dashboard renders confidence in the active-slice header (emoji + reason)
- [ ] AC-6: Unit test asserts each of the 6 heuristic branches (green / yellow×3 / red×2)
- [ ] AC-7: `computeConfidence` is pure (no IO), exported for direct unit testing
- [ ] AC-8: Live smoke: `node scripts/loop.mjs slice start --id SLICE-36` returns a non-null `confidence` value in JSON output

## Done When

- All ACs PASS
- FEAT-010 stays in-progress (SLICE-B remains for mid-execution updates)
- Crew final-synthesis written
- Grade written

## Reviewer ladder

- **Reviewer A** — Engineering pass: heuristic branches correct, helper reuse from `backlog-triage-helpers` + `grade-trend`, pure function design, no IO leak, test coverage per branch.
- **Reviewer B** — Production-readiness pass: heuristic doesn't fire false-positive red on first slices (when grade history is empty, treat as green/neutral, not red), confidence reason is human-readable, no information leak in reason string.

## Risks

- **First-slice problem**: when grade history is empty, `recentGradeAvg` is null. Heuristic must NOT treat null as "low" — treat as neutral (skip the grade-trend check).
- **Heuristic too pessimistic**: marking too many slices yellow/red erodes signal value. Calibrate against current backlog — if all 8 active items would be red, the threshold is wrong.
- **Heuristic too optimistic**: green on slices that fail validates the criticism that confidence is noise. Mitigation: emit reason string so user can audit.

## Open questions

(none — heuristic is concrete and testable; tune later if needed)
