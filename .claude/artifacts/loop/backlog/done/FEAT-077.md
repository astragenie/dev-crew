---
id: FEAT-077
status: done
priority: P3
category: chore
target_release: v0.28.2
created: 2026-06-07
updated: 2026-06-07
started_at: 2026-06-07
completed_at: 2026-06-07
depends_on: [FEAT-075]
slices: [SLICE-80]
derived_from: null
priority_band: hygiene
pm_customer_impact: 0.2
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.45
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
composite_score: 0.48
composite_priority: P3
autonomous_safe: true
tags: [chore, workflow]
triage_notes: "Retroactive FEAT bundling v0.28.1 + v0.28.2 — wire /loop:triage PM dispatch to resolver and close post-release follow-ups from v0.27.0 final review. Filed retroactively for ceremony linkage on 2026-06-07."
github_issue: 162
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/162"
---
# FEAT-077 — Post-Phase-1 triage tighten + review backfill

## Context

After loop v0.28.0 shipped role-agent skill activation, two gaps surfaced:

1. The `/loop:triage` skill body dispatched `loop:pm` without injecting the resolved skills block — only the architect path (via `/loop:backlog-enrich`) had been wired in v0.28.0. Asymmetric.
2. The v0.27.0 final review flagged five Minor/Important items deferred as follow-up: `--strict` silent no-op, `presetRaw`/`overrideRaw` should be `unknown`, no negative-path test for `validateAllPresets`, no upstream-request filed for forward-declared skill IDs (`csharp-pro`, `a11y-advisory`, `vue-engineering`, etc.), and the `/loop:triage` skill body promised pending→triaged promotion but the CLI silently left files under `pending/`.

## Outcome

- **v0.28.1** wired `/loop:triage` skill body to call `resolve-skills --variant pm` and prepend the block to the `loop:pm` dispatch prompt. Mirrors the architect wiring in `/loop:backlog-enrich`. CLAUDE.md updated to mark which flows are wired.
- **v0.28.2** tightened `backlog pm-write` to auto-move pending→triaged when called on a pending FEAT (closes the triage-skill contract gap); `resolve-skills --strict` now emits stderr warn (no-op honesty); `resolveSkills` inputs narrowed to `unknown`; 5 new failure-path tests for `validateAllPresets`; upstream-request filed for forward-declared skill IDs.

## Linkage

- Parent feature: FEAT-075 (role-agent activation)
- Slice: SLICE-80
- Releases: loop v0.28.1 (commit `2e21697`) + loop v0.28.2 (commit `733e27b`)
- Upstream-request filed: `docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md` (status: pending-upstream-author)

## Acceptance criteria

- Triage skill body resolves PM skills and prepends block to `loop:pm` dispatch (v0.28.1).
- `backlog pm-write` auto-promotes pending FEATs to triaged in one CLI call (v0.28.2).
- `--strict` flag emits visible warn instead of silently doing nothing.
- `presetRaw` / `overrideRaw` typed `unknown` with explicit cast at `deepMerge` boundary.
- 5 new tests for `validateAllPresets` failure paths.
- Upstream-request doc exists and enumerates 3 priority skill IDs for hero-crew to author.
- All tests pass at v0.28.2 (964/964); lint + format + manifest gates clean.

## Status note

Filed and closed retroactively. Implementation already on `main` at v0.28.2 (commit `733e27b`).
