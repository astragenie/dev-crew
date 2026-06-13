---
id: SLICE-115
title: Per-skill cost attribution
status: completed
feature: FEAT-165
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 246
github_url: "https://github.com/sergeymilashico/loop/issues/246"
completed_at: 2026-06-13
---
# SLICE-115: Per-skill cost attribution

Implements FEAT-165. See [feature file](../../../backlog/in-progress/FEAT-165.md) for product context.

## Objective

Extend cost-advisor to bucket `auto-dispatch.jsonl` spend by `skill_name` and surface a top-N report mode with delta from 4-week baseline via `loop brief --cost-by-skill`.

## In scope

- Aggregator that reads `auto-dispatch.jsonl` and groups entries by `skill_name`
- Report mode: top-N skills by 4-week average USD + delta from baseline (current week vs 4-week avg)
- `--cost-by-skill` flag wired into `bun src/scripts/loop.mts brief`
- Unit tests: aggregator over synthetic jsonl, delta calculation, output formatter snapshot

## Out of scope

- Real-time cost alerts (next slice)
- Per-agent-role attribution (skill_name only for this slice)

## Acceptance criteria

- [ ] AC-1: `bun test src/tests/ --timeout 60000` passes and `bun run lint` is clean
- [ ] AC-2: `bun src/scripts/loop.mts brief --cost-by-skill` outputs a ranked list of skill names with their 4-week average spend and week-over-week delta (e.g. "crew:reviewer spent $X.XX last week, +Y% vs 4-week avg")
- [ ] AC-3: Aggregator handles missing/null `skill_name` entries in jsonl without throwing
- [ ] AC-4: Unit tests cover: aggregation from synthetic jsonl, delta calculation (positive/negative/zero), empty jsonl edge case
- [ ] AC-5: `bunx tsc --project tsconfig.json --noEmit` passes; ESLint cyclomatic complexity ≤ 15

## Done When

- all acceptance criteria PASS with evidence
- build / test commands per `.claude/loop.json` pass
- feature FEAT-165 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (aggregation logic, delta math, edge cases)
- Reviewer B: production-readiness, observability, security (no secrets in jsonl output)
