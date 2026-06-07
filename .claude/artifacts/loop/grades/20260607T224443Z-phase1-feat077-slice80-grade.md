---
id: GRADE-SLICE-80
slice: SLICE-80
feature: FEAT-077
phase: 1
target_release: v0.28.2
graded_at: 2026-06-07
duration_hours: 2
scores: null
decisions: [DEC-031, DEC-032]
---
# SLICE-80: Triage wire + post-release backfill — Grade

**Phase:** 1 · **Feature:** FEAT-077 · **Slice:** SLICE-80

## Scores

- architecture_quality: 0.80
- reliability: 0.85
- observability: 0.75
- production_readiness: 0.80
- security: 0.90
- test_confidence: 0.85
- product_completeness: 0.80

## Lessons

- Post-release follow-ups should be batched into a single named slice rather than dribbled out as `chore` commits. Tracking them as FEAT-077 with explicit AC made the v0.28.2 release notes coherent.
- The `/loop:triage` skill body had promised pending → triaged promotion since the skill landed, but the CLI silently dropped that promise. Skill-body claims should ship with CLI tests that enforce them — caught only because I exercised the path manually.
- Filing upstream-requests proactively (the `csharp-pro` / `a11y-advisory` / `vue-engineering` doc) costs almost nothing and prevents cross-plugin confusion later.

## Decisions

### DEC-031: writePmScores auto-moves pending FEATs to triaged

**Rationale**: The `/loop:triage` skill body specifies "Write PM scores → then move pending → triaged" as a single atomic step. CLI was leaving the move to the caller. Making `writePmScores` move the file when the source path was under `pending/` matches the contract and closes the silent gap.

**Consequences**:
- positive: Skill body simplifies — single CLI call writes scores + promotes.
- positive: Operator running `backlog pm-write` manually no longer leaves orphan pending files.
- negative: `writePmScores` now has a side effect (file move) that its v0.28.1 name does not advertise. Mitigated by JSDoc + CHANGELOG note.
- negative: Triaged FEATs that get re-scored stay in place (no second move). Documented in the function's JSDoc.

### DEC-032: Reserve --strict for future use but surface its no-op-ness immediately

**Rationale**: `--strict` is registered in the CLI for forward-compat with a future skill-ID registry. Silently doing nothing when the operator passes it is a footgun — they assume strict mode is on, file a bug later when nothing changes. Cheapest honest behavior is a stderr warn: "reserved, no-op today."

**Consequences**:
- positive: Operators see immediately that `--strict` is reserved. No bug-filing required.
- positive: When upstream ships the registry, `--strict` gains real behavior and the warn becomes a real assertion. The transition is non-breaking.
- negative: stderr noise on every `--strict` invocation. Acceptable — the flag exists exactly to surface a future capability.

## Surprises

- `validateAllPresets` failure-path test file was easier to write than expected. 5 distinct paths in under 100 lines. Should have authored in SLICE-78 alongside the implementation.
- Diagnostic IDE noise about `node:test` / `node:os` etc. keeps appearing on test-file edits even though `npm run typecheck` is clean. CI vs IDE discrepancy that affects nobody but the editor surface.

## Followups

- When upstream hero-crew ships `csharp-pro`, `a11y-advisory`, `vue-engineering`, revisit `--strict` to make it a hard validation gate and mark the upstream-request doc resolved.
- Wire researcher / document-writer dispatchers when their slash flows acquire inline dispatch calls.
- Author retrospective slice ceremonies upfront (not retroactively as SLICE-80 was authored) to keep grade-trend signal accurate.

## What went well

The "tighten + backfill" pairing was the right scoping decision. v0.28.1 was a focused 2-file change (skill body + CLAUDE.md); v0.28.2 bundled five distinct cleanups behind a single release. Test count grew from 958 to 964 — every change paid in coverage.

## What went wrong

4 existing pm-write tests needed updates because `writePmScores` return value changed semantics (filePath now points to triaged location, not original pending). Caught immediately by test run, but it's a class of breakage that ripples — anyone calling `writePmScores` from a plugin would also need an update.

## What I would do differently next time

Author the negative-path test for `validateAllPresets` at the time the implementation lands, not as a follow-up two releases later. Cost was 10 minutes; value was real regression-prevention.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_80_TRIAGE-WIRE-AND-POST-RELEASE-BACKFILL.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-077.md`
- upstream-request: `docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md`
- release tags: `v0.28.1` (commit `2e21697`), `v0.28.2` (commit `733e27b`)
