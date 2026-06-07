---
phase: "3"
feature: FEAT-071
---
# Run Brief: PHASE3 FEAT071 SLICE76

- Created: 2026-06-07T13:48:18.142Z
- Goal: Ship perf wins 6-10: hoisted regex, decisions/grade read memo, structuredClone over JSON round-trip, Map over object lookups, and telemetry batch flush. Each win must not regress `npm run bench` gate.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Win 6: Hoist regex literals from function bodies to module top-level constants — find `/pattern/` or `new RegExp(...)` inside hot-path functions and move to `const PATTERN = /pattern/` at module scope
- Win 7: Memo decisions/grade reads — cache the read of `decisions.jsonl` + grade dir scan per invocation in `src/scripts/lib/brief.mts` (use existing per-invocation boundary from `clearFrontmatterCache` pattern)
- Win 8: Replace `JSON.parse(JSON.stringify(obj))` with `structuredClone(obj)` — search all `.mts` files
- Win 9: Replace hot-path object literal lookups with `Map` where dynamic string keys are looked up multiple times per invocation (target: lookup tables built in loops)
- Win 10: Telemetry batch flush — in `src/scripts/lib/auto-dispatch.mts` audit log
  - batch `appendFileSync` cal
- Out Of Scope:
  - - Wins 1-5 (done in SLICE-75)
- Bench harness changes (done in SLICE-75)
- `noUncheckedIndexedAccess` (FEAT-074)
- Any tsconfig changes
- New npm dependencies
- Planned Files: -
- Next Step: Begin implementation

