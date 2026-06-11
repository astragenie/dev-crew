---
id: FEAT-185
status: done
priority: P1
category: workflow
target_release: null
created: 2026-06-11
updated: 2026-06-11
depends_on: []
slices: [SLICE-93]
derived_from: 2026-06-11-slice-throughput-2x-design
autonomous_safe: false
pm_customer_impact: 0.85
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.95
pm_technical_risk: 0.7
pm_dependency_depth: 0.4
composite_score: 0.71
composite_priority: P1
triage_notes: "Largest throughput-2x saving (~5min/slice); cross-plugin orchestration risk (crew:lead) — autonomous_safe false preserved. Pre-mortem: bad fanout payload halts every slice."
started_at: 2026-06-11
github_issue: 206
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/206"
slices_complete: [SLICE-93]
completed_at: 2026-06-11
---
# FEAT-185: Wire post-builder-fanout into slice ceremony

SLICE-95 (commit 62541ce + fixup af77628) shipped `buildPostBuilderFanout` library + CLI subcommand emitting a 3-task parallel payload (reviewer-A ∥ reviewer-B ∥ validator) after builder PASS. The actual slice ceremony (`/loop:slice complete` flow + `crew:lead` orchestrator) still dispatches reviewers and validator serially. The largest claimed throughput-2x saving (~5 min/slice) is unrealized today, and `commands/slice-complete.md` misrepresents runtime by documenting fanout as the default.

## Acceptance hints

- After builder PASS, the orchestrator (`crew:lead` or `/loop:slice complete` flow) emits ONE message containing 3 parallel Agent calls produced by `slice post-builder-fanout --id <slice-id>`.
- Aggregation enforced: any reviewer FAIL halts slice (validator result preserved informationally); validator FAIL halts slice; all PASS continues to grade.
- Gated by `slice.postBuilderFanout` flag in `.claude/loop.json` (already shipped, default `true`). Flip to `false` reverts to serial ladder.
- Validator continues to run independently — no reviewer artifact reads in the validator prompt (already enforced by `post-builder-fanout.mts` test).
- Telemetry hook: set `timing.post_builder_fanout: true` when this path runs (depends on FEAT-184 grade-writer hooks).
- Smoke test: run an actual slice through the new path end-to-end. Compare wall-clock vs serial baseline. Expect ≥3 min saving on PASS path.
- Cross-plugin coordination: `crew:lead` orchestrator lives in hero-crew. May require upstream-request to hero-crew for prompt-level dispatch change. File alongside if needed.

## Why P1

Realizes the single largest throughput-2x saving identified in the design (5 min/slice). Without this, lever 5 ships dormant.

## Why autonomous_safe: false

Touches the live slice-ceremony orchestration. A bad wire-up halts every slice. Manual review of dispatched-message format + end-to-end verification before merge.

## Risk

Validator dispatched on every fanout run, including slices that will reviewer-FAIL. Wasted-dispatch cost ~$1-2 per FAIL slice. Acceptable per design spec (historical FAIL rate ~10% → ~$0.20/slice average waste vs ~5 min saving on PASS slices).

## Refs

- `docs/superpowers/specs/2026-06-11-slice-throughput-2x-design.md` § Lever 5
- `src/scripts/lib/post-builder-fanout.mts` — payload builder (already shipped)
- `commands/slice-post-builder-fanout.md` — CLI doc
- `commands/slice-complete.md` § Aggregation (post-builder fanout) — currently aspirational; this FEAT realizes it
- `.claude/loop.json` — `slice.postBuilderFanout: true` flag (already shipped)
