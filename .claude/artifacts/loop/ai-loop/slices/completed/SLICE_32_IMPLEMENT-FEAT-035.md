---
id: SLICE-32
status: completed
feature: FEAT-035
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 75
github_url: "https://github.com/sergeymilashico/loop/issues/75"
---
# SLICE-32: cost-report sourceProject — current slug + legacy aliases

Implements FEAT-035 (SPEC-002 Theme B, Issue #4). Cost reports for SLICE-23 through SLICE-28 all show `usd: 0` because `.claude/loop.json::costProject` is set to the legacy slug `C--work-mega-hero-crew-autonomous-loop` instead of the current path slug `C--work-mega-loop`.

## Objective

Two-part fix:

1. **Config update**: change `.claude/loop.json::costProject` from the legacy slug to the current slug. This restores cost-trend signal going forward.
2. **Code change**: add `costProjectAliases: string[]` config support in `detectCostMode` + `tryWriteCostReport`. When set, the cost CLI invocation includes the primary AND each alias as separate `--source-project` flags so historical data under either slug stays accessible.

## Behavior contract

In `src/scripts/lib/slice-linker/crew-bridge.mts`:

1. `detectCostMode(repoPath, config)` unchanged — already returns `"scoped"` when `costProject` is set.
2. `tryWriteCostReport(repoPath, sliceOrInfo, config)`:
   - When mode is `scoped`, push `--source-project <primary>` for the primary `costProject`.
   - If `config?.loop?.costProjectAliases` is a non-empty string array, push `--source-project <alias>` for each.
   - Crew's `cost-slice` CLI is assumed to accept multiple `--source-project` flags (additive aggregation). If it only honors the last one, fallback: emit a single primary + log warn (defer behavior change to follow-on FEAT).

3. Config schema:
   ```json
   {
     "loop": {
       "costProject": "C--work-mega-loop",
       "costProjectAliases": ["C--work-mega-hero-crew-autonomous-loop"]
     }
   }
   ```

## In scope

- `src/scripts/lib/slice-linker/crew-bridge.mts` — extend `tryWriteCostReport` scoped branch to honor `costProjectAliases`. Pure additive change to the argv array; preserves existing behavior when key is absent.
- `.claude/loop.json` — update `costProject` to `C--work-mega-loop`, add `costProjectAliases: ["C--work-mega-hero-crew-autonomous-loop"]`.
- `src/tests/crew-bridge.test.mts` (or a new test file if cleaner) — assert that `tryWriteCostReport` constructs the expected argv with alias flags when config has them.

## Out of scope

- Re-running cost detector against the historical SLICE-23..SLICE-28 window to recompute `usd` (manual / follow-up; the fix unblocks the lookup going forward + for next snapshot).
- Sniffing the crew CLI to confirm it accepts multiple `--source-project` flags (assume additive; if proven false at smoke time, file a separate FEAT for crew).
- Auto-migration of stale `costProject` values in other repos.

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new alias tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `.claude/loop.json` updated: `costProject: "C--work-mega-loop"`, `costProjectAliases: ["C--work-mega-hero-crew-autonomous-loop"]`
- [ ] AC-5: Unit test: `tryWriteCostReport` with `costProjectAliases` produces argv containing `--source-project C--work-mega-loop --source-project C--work-mega-hero-crew-autonomous-loop` (or equivalent). Mock the crew CLI execution; assert argv shape.
- [ ] AC-6: Unit test: `tryWriteCostReport` without `costProjectAliases` produces only ONE `--source-project` flag (existing behavior preserved).
- [ ] AC-7: Live smoke: run `/loop:slice complete` for any current slice (or invoke `tryWriteCostReport` directly via a one-shot). Confirm cost-report artifact shows `usd > 0` for the slice. If still `0`, the multi-`--source-project` assumption was wrong — surface in synthesis and switch to a fallback (primary only).
- [ ] AC-8: Pre-existing crew-bridge tests stay green (regression guard).

## Done When

- All ACs PASS
- FEAT-035 moves to `done/`
- Crew `final-synthesis` written
- Grade written
- `requires_validation: false` — covered by unit tests + live smoke

## Reviewer ladder

- **Reviewer A** — Engineering pass: argv construction is correct (no double-quoting issues, flag order doesn't break crew CLI), back-compat when `costProjectAliases` is absent, test covers both shapes, no behavior change to `aggregate` mode (only scoped branch touched).
- **Reviewer B** — Production-readiness pass: crew CLI behavior when given multiple `--source-project` flags (verify via documentation or one quick smoke). If crew only honors first/last, this slice should land EITHER as warn-and-fallback OR with explicit documentation that aliases require crew >= some version.

## Risks

- **Crew CLI doesn't support multiple `--source-project`**: most likely outcome is it accepts only one (last one wins, or first). Mitigation: live smoke during this slice; if fails, document constraint, ship primary-only behavior, file follow-up FEAT against crew.
- **Wrong slug for "current"**: `C--work-mega-loop` is the slugified path. If the cost-slice CLI uses a different slugification (e.g. case-folding, additional substitutions), historical data won't match. Mitigation: live smoke confirms the slug matches by producing `usd > 0` on a new slice.
- **Config file already shipped to users**: changing `costProject` in this repo's `loop.json` is local; templates and `loop install` writes the same value into other repos. Verify `templates/loop.json` is not the source of the legacy slug (it shouldn't be — that key was hand-edited or scaffolded).

## Open questions

- Q1: Does the crew `cost-slice` CLI accept multiple `--source-project` flags? Will probe via live smoke or by reading the crew script briefly during DISCOVER.
