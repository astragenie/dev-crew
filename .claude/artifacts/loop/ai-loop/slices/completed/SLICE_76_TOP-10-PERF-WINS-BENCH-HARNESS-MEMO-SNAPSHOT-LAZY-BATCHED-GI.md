---
id: SLICE-76
status: completed
feature: FEAT-071
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: true
created: 2026-06-07
updated: 2026-06-07
tags: [test, refactor, infra]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
github_issue: 152
github_url: "https://github.com/sergeymilashico/loop/issues/152"
---
# SLICE-76: Phase C — perf wins 6-10

Implements FEAT-071 C3. Builds on SLICE-75 (bench harness + wins 1-5 done).

## Objective

Ship perf wins 6-10: hoisted regex, decisions/grade read memo, structuredClone over JSON round-trip,
Map over object lookups, and telemetry batch flush. Each win must not regress `npm run bench` gate.

## In scope

- Win 6: Hoist regex literals from function bodies to module top-level constants — find `/pattern/` or `new RegExp(...)` inside hot-path functions and move to `const PATTERN = /pattern/` at module scope
- Win 7: Memo decisions/grade reads — cache the read of `decisions.jsonl` + grade dir scan per invocation in `src/scripts/lib/brief.mts` (use existing per-invocation boundary from `clearFrontmatterCache` pattern)
- Win 8: Replace `JSON.parse(JSON.stringify(obj))` with `structuredClone(obj)` — search all `.mts` files
- Win 9: Replace hot-path object literal lookups with `Map` where dynamic string keys are looked up multiple times per invocation (target: lookup tables built in loops)
- Win 10: Telemetry batch flush — in `src/scripts/lib/auto-dispatch.mts` audit log, batch `appendFileSync` calls into one write at command end

## Out of scope

- Wins 1-5 (done in SLICE-75)
- Bench harness changes (done in SLICE-75)
- `noUncheckedIndexedAccess` (FEAT-074)
- Any tsconfig changes
- New npm dependencies

## Acceptance criteria

- [ ] AC-1: `npm test` — ≥ 912 pass, 0 fail
- [ ] AC-2: `npm run lint` — 0 warnings, 0 errors
- [ ] AC-3: `npm run typecheck` — exits 0
- [ ] AC-4: `npm run bench` — exits 0 (p50 ≤ baseline × 1.10 on brief and triage)
- [ ] AC-5: Win 6 — at least 1 regex hoisted, no hot-path function contains an inline regex literal after fix
- [ ] AC-6: Win 8 — `grep -r "JSON.parse(JSON.stringify" src/scripts/` returns 0 matches
- [ ] AC-7: Win 10 — audit log batch write: single `writeFileSync` (or `appendFileSync` once) per invocation instead of per-line appends

## Escape hatch

If any of wins 7, 9 have no applicable call sites (grep confirms), skip and document in handoff. Win 6, 8, and 10 are mandatory.

## Done When

- all ACs PASS with evidence
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run bench` all pass
- feature FEAT-071 moves to `done/` (no `--keep-feature-open`)
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: structuredClone correctness (no circular references in cloned objects)
- Reviewer B: telemetry batch flush atomicity (partial invocations still write to log)
