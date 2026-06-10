# Builder handoff — SLICE-87 / FEAT-170: featuresService

**Status:** implementation complete, self-verify PASS. Ready for reviewer + validator.

> Note: the slice builder dispatches paused twice without writing a handoff
> (recurring specialist-pause pattern, see `docs/sop/specialist-pause-handling.md`).
> The parent loop completed two precise fixups inline (config-path bug, stdout→stderr
> log sink) and authored this artifact. All evidence below is from real command runs.

## What shipped

- **New** `src/scripts/lib/features-service.mts` (+ emitted `.mjs`): `isEnabled(feature: FeatureName, config)` with **default-ON** policy (missing block / missing entry / malformed → `true`). Seeds `FeatureName = "redundant-read-stop"`. Emits a diagnostic line on **stderr** per evaluation.
- **Wired** `src/scripts/lib/redundant-read-detector.mts`: `checkRedundantReadStop` short-circuits to `null` when `isEnabled("redundant-read-stop", config)` is false — gate off regardless of `redundantReadCap`.
- **`.claude/loop.json`**: `features` block added at **top-level** (sibling of `loop`); `redundantReadCap` restored to `5`; temporary `1000000` override removed. `redundant-read-stop` set `enabled: false`.
- **Tests**: `src/tests/features-service.test.mts` (AC-2/3/5/6 unit) + AC-4 integration test in `src/tests/redundant-read-detector.test.mts` (disabled→null, enabled→signal fires).

## Evidence (per AC)

| AC | Result | Evidence |
|----|--------|----------|
| AC-1 typecheck/lint/test green | PASS | `npm run typecheck` =0; `npm run lint` =0; `npm test` → tests 1141, **pass 1140, fail 0**, 1 skip, exit 0 |
| AC-2 no features block → ON | PASS | unit test green |
| AC-3 explicit false → off | PASS | unit test green |
| AC-4 disabled → `checkRedundantReadStop` null | PASS | integration test green (+ positive control: enabled → signal fires) |
| AC-5 malformed → safe default (no throw) | PASS | unit tests (string/null/number/non-object) green |
| AC-6 diagnostic emitted | PASS | stderr line `[features] <name>: <state>` (moved off stdout to keep CLI JSON clean) |
| AC-7 auto dry-run no `redundant_read_stop` | PASS | `node scripts/loop.mjs auto --dry-run` → `stopReason: cost_cap…`, stdout parses as clean JSON |

Build sync: `npm run build && npm run build:tests` then emitted `scripts/*.mjs` / `tests/*.mjs` regenerated (commit alongside source at slice close).

## Two defects caught + fixed during self-verify (review focus)

1. **Config-path bug**: first build read top-level `config.features` but placed the block under `loop.features`; unit tests were green because they encoded the wrong (top-level) shape and no integration test existed → AC-7 silently failed. Fixed by moving the block to top-level (matches how the full parsed config is passed) **and** adding the AC-4 integration test that would have caught it.
2. **stdout pollution**: `console.debug` writes to stdout in Node, corrupting the `auto` command's JSON output. Moved to `process.stderr.write` (repo convention per `dispatch-trace.mts`).

## Known gap for reviewer

- **Docs**: slice "In scope" called for a `features`-block note in CLAUDE.md config surface (and `docs/halt-badges.md` if badge wording changed). Not yet added. Low-risk; recommend reviewer confirm and the loop adds a short note before close.
