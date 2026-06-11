---
id: FEAT-184
status: done
completed_at: 2026-06-11
slices_complete: [SLICE-92]
priority: P1
category: observability
target_release: null
created: 2026-06-11
updated: 2026-06-11
depends_on: []
slices: [SLICE-92]
derived_from: 2026-06-11-slice-throughput-2x-design
autonomous_safe: true
pm_customer_impact: 0.8
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.95
pm_technical_risk: 0.35
pm_dependency_depth: 0.85
composite_score: 0.68
composite_priority: P1
triage_notes: Gates AC-1/AC-5 measurability; single-module write to grade-writer.mts; addresses observability weak-dim (0.74). FEAT-185/186 telemetry depend on this landing first.
started_at: 2026-06-11
github_issue: 204
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/204"
---
# FEAT-184: Telemetry writer — populate grade.timing.* + grade.shape.* fields

SLICE-91 (commit fd6fc6b) seeded the grade frontmatter schema with `timing:` and `shape:` blocks, and shipped the `perf-report` CLI to aggregate them. No code writes the fields. `perf-report --window N` returns `medianWallClockSeconds: null`, `phaseGateParallelPct: 0`, `serialReviewerWarningPct: 0`, `inlinePathPct: 0` indefinitely. AC-1 (50% wall-clock reduction) and AC-5 (≥30% inline adoption) from the throughput-2x design are unmeasurable until this lands.

## Acceptance hints

- Hook `writeGrade()` in `src/scripts/lib/grade-writer.mts` (or `grade-write` CLI handler) to:
  - Compute `timing.wall_clock_seconds` from `.claude/logs/loop.jsonl` events: span between latest `slice start` and current `slice grade-write` for the same `sliceId`.
  - Read latest phase-gate validation artifact for the slice; set `timing.phase_gate_parallel: true` when the artifact's `parallel` field is true.
  - Re-run `detectSerialReviewer` (from `reviewer-timing.mts`) and write `timing.reviewer_span_ms` + `timing.serial_reviewer_warning` to the grade frontmatter (badge already lands on slice frontmatter — this is the grade-side persistence per spec).
  - Set `timing.post_builder_fanout` from the fanout-marker artifact once FEAT-185 wires the ceremony. Until then default `null`.
  - Set `shape.classified` + `shape.inline_path_used` from the slice-start classifier hint once FEAT-186 lands. Until then default `null`.
- Idempotent: re-running grade-write must produce identical frontmatter.
- `perf-report` returns non-null `medianWallClockSeconds` within 1 slice of merge.
- Tests: 3+ cases covering wall-clock derivation, phase-gate parallel flag, serial-reviewer span population.

## Why P1

Telemetry is the user-visible verification surface for the throughput-2x design. Without it the shipped levers are invisible.

## Refs

- `docs/superpowers/specs/2026-06-11-slice-throughput-2x-design.md` § Telemetry
- `src/scripts/lib/perf-report.mts` — consumer waiting for data
- `templates/grades/grade-template.md` — schema (already shipped)
- `src/scripts/lib/telemetry.mts` — event source
