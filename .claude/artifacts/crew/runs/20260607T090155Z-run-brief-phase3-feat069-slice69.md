---
phase: "3"
feature: FEAT-069
---
# Run Brief: PHASE3 FEAT069 SLICE69

- Created: 2026-06-07T09:01:55.925Z
- Goal: Delete `src/scripts/lib/marker-drain.mts` plus its paired test `src/tests/marker-drain.test.mts`, and remove the unused import / type alias inside `src/scripts/lib/slice-linker/complete-slice.mts`. The marker-queue dispatch path was deprecated by DEC-011; this slice clears the first of several dead-code targets.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Delete `src/scripts/lib/marker-drain.mts`
- Delete `src/tests/marker-drain.test.mts`
- Delete the matching compiled artifacts under `scripts/` and `tests/`
- Remove the `DrainOpts`
  - `DrainResult`
  - and `DrainFn` references in
  `src/scripts/lib/slice-linker/complete-slice.mts`
- Update any other caller surfaced by `grep -rn "marker-drain\|drainPendingDispatchMarkers"`
- Keep CI green: `npm run typecheck`
  - `npm run lint`
  - `npm test`
- Out Of Scope:
  - - Marker-write path inside `auto-dispatch.mts` (covered by SLICE-A2)
- One-shot migration modules (covered by SLICE-A3)
- Any tsconfig flag change or type tightening (Phase B)
- Any perf work (Phase C)
- Planned Files: -
- Next Step: Begin implementation

