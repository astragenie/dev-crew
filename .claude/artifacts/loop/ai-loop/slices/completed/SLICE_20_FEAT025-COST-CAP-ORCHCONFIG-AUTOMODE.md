---
id: SLICE-20
status: completed
feature: FEAT-025
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
github_issue: 52
github_url: "https://github.com/sergeymilashico/loop/issues/52"
---
# SLICE-20: FEAT-025 SLICE-C — cost cap + orchConfig + autoMode CLI wiring

Implements FEAT-025 SLICE-C (final).

## Objective

Wire cost cap enforcement into runAutoWalker, add orchConfig hints in return,
add --auto-mode CLI flag, update commands/auto.md to reflect all 3 slices.

## Deliverables

1. `src/scripts/lib/auto-walker.mts`:
   - `costStopThreshold` enforcement (plan-count proxy for cost)
   - `orchConfig: { costStopThreshold, escalationThreshold: 3, autoMode }` in return
   - `resolveConfig` integration (reads loop.json costStopThreshold if not in options)
2. `src/scripts/loop.mts`:
   - `"--auto-mode"` flag in FLAG_SPEC + `autoMode: false` in init
   - `auto` handler passes `autoMode` + `config` to `runAutoWalker`
3. `commands/auto.md` — updated to reflect all 3 slices shipped
4. `src/tests/auto-walker.test.mts` — 4 new SLICE-C tests

## Acceptance criteria

- [x] AC1: costStopThreshold=1 → halts after 1 plan (stopReason: cost_cap) — PASS
- [x] AC2: orchConfig in return with escalationThreshold:3 + autoMode + costStopThreshold — PASS
- [x] AC3: --auto-mode flag wired in loop.mts CLI — PASS
- [x] AC4: Config costStopThreshold from loop.json applied — PASS
- [x] AC5: 544 tests pass, lint clean — PASS

## Evidence

- `npm test`: 544/544 pass (baseline 540, +4)
- `npm run lint`: clean
- Review: APPROVED
- `requires_validation: false` — library + CLI flag, test suite validates
