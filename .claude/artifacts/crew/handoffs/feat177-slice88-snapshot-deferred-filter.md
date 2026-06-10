# Builder handoff — SLICE-88 / FEAT-177: exclude deferred FEATs from snapshot Top-triaged

**Status:** complete, self-verify PASS. Implemented inline by the parent loop (single-file edit — in `.claude/loop.json` `dispatchLimits.preferInlineFor`; specialist layer paused 3× earlier this session).

## What shipped

- `src/scripts/lib/memory-snapshot.mts` (+ emitted `.mjs`): `triagedTop` now applies `.filter((f) => f.frontmatter.deferred !== true)` before `.sort(comparePickOrder).slice(0,5)`. Mirrors the auto walker's pre-branch filter (`walker-gates.mts:181` → `entry.frontmatter.deferred === true` → skip). Deferred items remain counted in `Triaged: N`; only the next-to-slice candidate list drops them.
- `src/tests/memory-snapshot-telemetry.test.mts`: 2 new tests (AC-2, AC-3) + a `topTriagedIds` section-extraction helper.

## Evidence (per AC)

| AC | Result | Evidence |
|----|--------|----------|
| AC-1 filter before slice | PASS | code: `.filter(f => f.frontmatter.deferred !== true)` at memory-snapshot.mts ~238 |
| AC-2 deferred excluded, 5 non-deferred shown | PASS | new test green (1 deferred + 5 live → top length 5, deferred id absent) |
| AC-3 no padding when <5 non-deferred | PASS | new test green (1 deferred + 2 live → exactly the 2 live ids) |
| AC-4 counts still include deferred | PASS | `Triaged: N` unchanged (filter scoped to triagedTop only); live snapshot still counts FEAT-176 |
| AC-5 tests in src/tests | PASS | memory-snapshot-telemetry.test.mts extended |
| AC-6 suite green | PASS | typecheck=0, lint=0, `npm test` → pass 1145, fail 0, 1 skip |

**Live proof:** regenerated the real repo snapshot — FEAT-176 (`deferred: true`) dropped from "Top triaged", FEAT-085 took the 5th slot. Snapshot ↔ walker now consistent (the exact bug FEAT-177 reported).

Build sync: `npm run build && npm run build:tests`; emitted `scripts/lib/memory-snapshot.mjs` regenerated (commit with source at close).
