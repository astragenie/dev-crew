---
id: FEAT-170
status: done
priority: P3
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: [SLICE-87]
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.2
pm_dependency_depth: 0
composite_score: 0.64
autonomous_safe: true
triage_notes: "via=pm | Small focused ops-tooling. Effort 0.3 (single-session, calibrated vs SLICE-84), risk 0.2 (known config-gate pattern, git-revert rollback, no external contract), dep 0.0. AC concrete+testable, observability (weak dim 0.66) covered by debug-log AC. Composite -> P3. autonomous_safe=true."
started_at: 2026-06-10
slices_complete: [SLICE-87]
completed_at: 2026-06-10
github_issue: 193
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/193"
---
## Description

Add a small `featuresService` to the loop plugin: a simple set of named feature toggles, each `{ feature: <name>, enabled: <bool> }`, so behavior can be turned on/off by name instead of scattering magic constants and ad-hoc nullish-chaining across modules.

Today there is **no central toggle abstraction**. Config is a flat `.claude/loop.json` read directly via `config?.loop?.<key>` at each call site (e.g. `loop.redundantReadCap`, `loop.costStopThreshold`). To disable a behavior right now you must know the exact key and set a magic value — e.g. the redundant-read stop gate has no off-switch, so disabling it means setting `loop.redundantReadCap` to an absurd integer (1000000). That is the issue motivating this FEAT.

## Goal

A guard a module can call to decide whether a feature is active:

```ts
import { isEnabled } from './lib/features-service.mjs';
if (isEnabled('redundant-read-stop', config)) { /* run the gate */ }
```

Toggles live under a new `features` block in `.claude/loop.json`:

```json
{
  "features": {
    "redundant-read-stop": { "enabled": false },
    "cost-regression-stop": { "enabled": true }
  }
}
```

First consumer: the redundant-read stop condition (`src/scripts/lib/redundant-read-detector.mts` / `stop-conditions.mts`). When `redundant-read-stop` is disabled, `checkRedundantReadStop` should short-circuit to `null` (gate off) regardless of `redundantReadCap`. This lets us turn the gate off cleanly instead of inflating the cap.

## Acceptance hints

- New module `src/scripts/lib/features-service.mts` exporting `isEnabled(feature: string, config): boolean` and a typed `FeatureName` union. Unknown feature name → default policy (documented: default-on or default-off — pick one and test it).
- Reads the `features` block from `.claude/loop.json`; missing block or missing entry falls back to the documented default; malformed entry fails safe.
- `checkRedundantReadStop` wrapped: returns `null` immediately when `isEnabled('redundant-read-stop')` is false. Existing `redundantReadCap` behavior preserved when enabled.
- Tests: enabled→gate runs, disabled→gate skipped, missing block→default, malformed→safe default. Colocated in `src/tests/features-service.test.mts`.
- Observability: debug log when a feature gate is evaluated (name + resolved state).
- Docs: note the `features` block in CLAUDE.md config surface + `docs/halt-badges.md` if it affects a halt badge.
- Full suite green: `npm run typecheck && npm run lint && npm test`.

## Notes

- Keep it dead simple — a flag set, not a rules engine. No percentage rollouts, no per-user targeting.
- Once shipped, revert the temporary `redundantReadCap: 1000000` override in loop.json and instead set `features.redundant-read-stop.enabled: false`.
- Future consumers: any stop-condition or experimental code path that wants a clean kill-switch.