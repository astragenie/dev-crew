---
id: SLICE-87
status: completed
feature: FEAT-170
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-10
updated: 2026-06-10
completed_at: 2026-06-10
github_issue: 194
github_url: "https://github.com/sergeymilashico/loop/issues/194"
---
# SLICE-87: Implement FEAT-170

Implements FEAT-170. See [feature file](../../../backlog/in-progress/FEAT-170.md) for product context.

## Objective

Add a small `featuresService` to the loop plugin: a simple set of named feature toggles, each `{ feature: <name>, enabled: <bool> }`, so behavior can be turned on/off by name instead of scattering magic constants and ad-hoc nullish-chaining across modules.

## In scope

- New module `src/scripts/lib/features-service.mts` exporting
  `isEnabled(feature: FeatureName, config: Record<string, any> | null): boolean`
  and a typed `FeatureName` union (seed with `"redundant-read-stop"`).
- Read a new `features` block from `.claude/loop.json`:
  `{ "features": { "<name>": { "enabled": <bool> } } }`.
- **Default policy: default-ON.** Missing `features` block, missing entry, or
  malformed entry → feature treated as enabled (preserves current behavior;
  disabling must be explicit). Document this choice in the module header.
- Wire `checkRedundantReadStop` (`src/scripts/lib/redundant-read-detector.mts`)
  to short-circuit to `null` when `isEnabled("redundant-read-stop", config)` is
  false — gate off regardless of `redundantReadCap`.
- Tests colocated at `src/tests/features-service.test.mts`.
- Debug log on every gate evaluation: feature name + resolved enabled/disabled state.
- Docs: note the `features` block in CLAUDE.md config surface; update
  `docs/halt-badges.md` if the redundant-read badge wording changes.
- Retire the temporary workaround: remove `redundantReadCap: 1000000` from
  `.claude/loop.json` and instead set `features.redundant-read-stop.enabled: false`.

## Out of scope

- Percentage rollouts, per-user/per-session targeting, any rules-engine behavior —
  this is a flat flag set, not a flag platform.
- Migrating other stop-conditions (cost-regression, session-drift, cost-alert) onto
  the service — future consumers, separate slices.
- New CLI subcommand to toggle flags — edit `.claude/loop.json` directly for now.

## Acceptance criteria

- [ ] AC-1: `npm run typecheck && npm run lint && npm test` all green.
- [ ] AC-2: Given a config with no `features` block, When `isEnabled("redundant-read-stop", config)` is called, Then it returns `true` (default-ON).
- [ ] AC-3: Given `features."redundant-read-stop".enabled = false`, When `isEnabled("redundant-read-stop", config)` is called, Then it returns `false`.
- [ ] AC-4: Given the redundant-read feature is disabled AND a session state file with a path read_count well above `redundantReadCap`, When `checkRedundantReadStop` runs, Then it returns `null` (gate skipped).
- [ ] AC-5: Given a malformed `features` entry (e.g. `"redundant-read-stop": "yes"` or `null`), When `isEnabled` is called, Then it returns the documented safe default (`true`) and does not throw.
- [ ] AC-6: When a gate evaluation occurs, Then a `debug`-level log line is emitted naming the feature and its resolved state.
- [ ] AC-7: After editing `.claude/loop.json` to disable `redundant-read-stop` and removing the `redundantReadCap: 1000000` override, `node scripts/loop.mjs auto --repo "$PWD" --dry-run` does NOT halt with `redundant_read_stop`.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-170 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A — correctness + AC coverage: default-policy resolution, malformed-input
  safety, the `checkRedundantReadStop` short-circuit, exhaustive `FeatureName` handling.
- Reviewer B — production-readiness + observability: debug-log line quality, fail-safe
  on bad config, no behavior change for non-toggled gates, docs/config-surface accuracy.
