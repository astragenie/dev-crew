---
id: FEAT-186
status: done
priority: P2
category: workflow
target_release: null
created: 2026-06-11
updated: 2026-06-11
depends_on: []
slices: [SLICE-94]
derived_from: 2026-06-11-slice-throughput-2x-design
autonomous_safe: true
pm_customer_impact: 0.5
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.7
pm_technical_risk: 0.3
pm_dependency_depth: 0.25
composite_score: 0.49
composite_priority: P2
triage_notes: Advisory hint wire-up; flag-gated; smaller realized impact than FEAT-184/185. Telemetry side depends on FEAT-184 hooks.
started_at: 2026-06-11
github_issue: 208
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/208"
slices_complete: [SLICE-94]
completed_at: 2026-06-11
---
# FEAT-186: Wire classify-slice-shape into slice ceremony (inline-path hint)

SLICE-94 (commit 6eb7154) shipped `classifySliceShape({ files })` library + `classify-slice-shape` CLI returning one of `doc-update | config-tweak | single-module-edit | test-only | none`. Nothing in the ceremony auto-invokes it. Orchestrators don't see the inline-path hint, so `dispatchLimits.preferInlineFor` (extended in the same slice) has no consumer for the 4 new shapes. `perf-report.inlinePathPct` stays at 0% indefinitely.

## Acceptance hints

- `/loop:slice start` (or `slice-from-feature`) calls `classify-slice-shape` against the slice's `## Files` section + git-diff numstat after builder lands.
- When the returned shape is in `loop.json.dispatchLimits.preferInlineFor`, emit an advisory `inline-path recommended (shape: <name>, rationale: <text>)` line into the dispatch instruction.
- Hint is ADVISORY — orchestrator can override with rationale logged to grade (matches design spec).
- Telemetry: set `shape.classified` + `shape.inline_path_used` in grade frontmatter (depends on FEAT-184 grade-writer hooks).
- Gated by `dispatchLimits.expandedInlineCriteria` flag (add to `.claude/loop.json`, default `true`). Flip to `false` disables the auto-classification hint.
- Tests: 2+ cases asserting hint emission on classifiable shape AND no-op on `shape: none`.

## Why P2

Telemetry-only enabler — unlocks AC-5 numerator but does not directly save wall-clock unless orchestrators act on the hint. Smaller realized impact than FEAT-184 / FEAT-185.

## Refs

- `docs/superpowers/specs/2026-06-11-slice-throughput-2x-design.md` § Lever 3
- `src/scripts/lib/classify-slice-shape.mts` — pure classifier (already shipped)
- `docs/sop/inline-criteria.md` — shape rules + guard list (already shipped)
- `commands/classify-slice-shape.md` — CLI doc
- `.claude/loop.json` — `dispatchLimits.preferInlineFor` array (already extended)
