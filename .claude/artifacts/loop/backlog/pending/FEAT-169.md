---
id: FEAT-169
status: pending
priority: P3
category: tech-debt
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
---
# FEAT-169: Code-quality pivot leftovers — Result<T,E>, branded IDs, discriminated-union state + snapshot/memoization perf wins

## Description

The code-quality pivot (`docs/superpowers/plans/2026-06-07-code-quality-pivot.md`,
SPEC-004) shipped its tsconfig-tightening and dead-code phases (FEAT-069/070/
071/072/073/074, all `done`), but two chunks of the *stated scope of FEAT-070
and FEAT-071* were never implemented and those FEATs were closed as done anyway:

- **From FEAT-070 (type safety, plan §B6–B8):** no `Result<T,E>` type module,
  no branded ID types (`FeatId`/`SliceId`/`SpecId`/`DecId`/`GradeId`), no
  discriminated-union rewrite of state shape (stop-conditions, walker-gates,
  halt-badges). Confirmed absent: `src/scripts/lib/result.mts`,
  `src/scripts/lib/ids.mts` do not exist.
- **From FEAT-071 (perf, plan §C2–C3):** bench harness + lazy-load landed, but
  the snapshot + memoization wins did not — `backlog-snapshot.mts` and
  `parseFrontmatterCached` are absent; regex-hoist / per-process memo /
  structuredClone / Map-lookup / telemetry-batch wins (C3) not done.

This FEAT captures only those genuine leftovers so the "done" state of
FEAT-070/071 stops being misleading. The tsconfig flags (`noImplicitAny`,
`noUncheckedIndexedAccess`, etc.) are already on and typecheck is green — that
work is NOT in scope here.

## Acceptance hints

- `src/scripts/lib/result.mts` exports `Result<T,E>` (`ok`/`err` constructors +
  guards) with tests; at least the frontmatter/gate parsers return it.
- `src/scripts/lib/ids.mts` exports branded `FeatId`/`SliceId`/`SpecId`/`DecId`/
  `GradeId` constructors with validation + tests.
- Discriminated-union state shape applied to stop-conditions / walker-gates /
  halt-badges (or explicitly descoped with rationale if it churns too much).
- Perf: `backlog-snapshot.mts` + `parseFrontmatterCached` implemented; the
  bench harness (already present) shows no regression and ideally the targeted
  win on `brief`/`triage` p50.
- C3 perf wins (regex hoist, per-process memo, structuredClone, Map lookups,
  telemetry batch) — each landed or explicitly deferred with a note.
- Full suite green: `npm run typecheck && npm run lint && npm test`.

## Notes

- Source spec: `docs/superpowers/specs/2026-06-07-code-quality-pivot-design.md`
  + plan `docs/superpowers/plans/2026-06-07-code-quality-pivot.md` (§B6–B8, §C2–C3).
- Consider splitting: type-safety (Result + branded IDs) and perf wins are
  independent and could be two slices.
- Likely `autonomous_safe: true` — internal refactor, no external contract.
