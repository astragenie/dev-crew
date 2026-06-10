---
id: SLICE-42
status: completed
feature: FEAT-042
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
github_issue: 93
github_url: "https://github.com/sergeymilashico/loop/issues/93"
---
# SLICE-42: Walker composite-score scale normalization

Implements FEAT-042. See [feature file](../../../backlog/in-progress/FEAT-042.md) for product context.

## Objective

Clamp out-of-range composite scores in the walker so legacy raw 0-9 scores cannot outrank current 0.0-1.0 PM formula scores.

Walker numeric-sort breaks when legacy raw 0-9 composite scores coexist with current 0.0-1.0 PM formula scores. FEAT-020 had composite_score: 6 (raw) which sorted above all current-formula FEATs (max 1.0). Discovered when FEAT-020 (score 6) ranked above FEAT-040 (score 0.41) despite FEAT-040 being higher priority. Fix: clamp any score > 1.0 to 1.0 in `compareWalkerOrder` before sort — any score > 1.0 is definitionally off-scale for the current formula. Alternatives considered: re-normalize legacy scale by dividing by 9, or treat out-of-range as 0; clamping is safest.

## In scope

- Clamp `composite_score` to `[0, 1]` in `compareWalkerOrder` before numeric sort
- Add test: FEAT with score 6 sorts below FEAT with score 0.9
- Add test: mixed legacy/current score set sorted correctly

## Out of scope

- Re-normalizing legacy scores in backlog files
- Backfill or migration of stored composite_score values

## Acceptance criteria

- [ ] AC-1: composite_score > 1.0 clamped to 1.0 in compareWalkerOrder before sort
- [ ] AC-2: FEAT with score 6 (P2) clamps to 1.0 and loses priority tiebreak to FEAT with score 1.0 (P1)
- [ ] AC-3: FEAT with score 0 sorts below FEAT with score 0.5 (existing in-range behavior unchanged)
- [ ] AC-4: FEAT with score 1.1 clamps to 1.0 — same sort position as score 1.0, tiebreak by priority
- [ ] AC-5: existing sort behavior unchanged for scores in 0.0-1.0 range
- [ ] AC-6: all existing tests pass; lint/typecheck/format/manifests/content-length clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-042 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
