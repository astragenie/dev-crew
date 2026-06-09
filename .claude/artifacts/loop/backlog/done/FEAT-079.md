---
id: FEAT-079
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: [SLICE-82]
derived_from: null
source_competitors: [Archon]
autonomous_safe: true
tags: [workflow, review]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.6
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.8
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
composite_score: 0.6525
triage_notes: Reviewer quality is loop-gating; extends existing reviewer-ladder.mts; pause-without-write SOP referenced; backward-compat default preserved.
started_at: 2026-06-08
github_issue: 32
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/32"
slices_complete: [SLICE-82]
completed_at: 2026-06-08
---
# FEAT-079: Parallel multi-dimensional reviewer fan-out

## Source

Competitor analysis 2026-06-08 — Archon `.archon/commands/maintainer-review-*.md` pattern. 6 narrow review-dimension commands (code-review, test-coverage, error-handling, docs-impact, comment-quality, synthesize) dispatched in parallel via DAG `depends_on`, results fed to `maintainer-review-synthesize.md` that produces final verdict.

Live demo run 2026-06-08 on commits HEAD~4..HEAD (perf A-1..A-4) using 3 ad-hoc `crew:reviewer` subagents (correctness, test-coverage, conventions) caught 2 IMPORTANT correctness issues + 4 test gaps that the current 2-dim A/B ladder would likely miss. Wall-clock ~140s (max of 3) vs ~300s sequential. Pattern validated.

References:
- Competitor analysis: `.claude/artifacts/crew/runs/competitor-archon-analysis.md` §5
- Demo correctness review: `.claude/artifacts/crew/reviews/20260608T223519Z-review-result-correctness-review-perf-a-1-through-a-4-parallelization.md`
- Demo conventions review: `.claude/artifacts/crew/reviews/20260608T223454Z-review-result-conventions-review-perf-a-1-a-4-parallel-i-o-batch.md`

## Description

Extend `reviewer-ladder.mts` to support a richer default ladder than `["A","B"]`. Add canonical multi-dim preset that splits review into orthogonal narrow dimensions:

- **correctness** — logic, behavior preservation, race conditions, error-propagation
- **test-coverage** — happy path + partial-failure + edge-case coverage assessment
- **conventions** — repo standards (ESM/.mts parity, line caps, complexity, comment hygiene)
- **production-readiness** (optional, opt-in) — observability, security, edge cases (current Reviewer B body)

Each dimension dispatches a separate `crew:reviewer` subagent in parallel with strict scope ("ONLY <dimension>; other dimensions out of scope"). Lead/parent collects verdicts; synthesizer aggregates into a single final review artifact.

## Acceptance criteria

- New canonical preset `reviewers.ladder.preset: "multidim"` selects `["correctness","test-coverage","conventions"]` (default remains `["A","B"]` for backward compat).
- `reviewers.focus.*` map extended with default copy for each new dimension (mirrors prior `DEFAULT_FOCUS`).
- Each generated prompt explicitly forbids out-of-dimension findings ("NOT in scope: X. Other agent owns it.") to prevent dimension overlap.
- Each prompt enforces hard tool/time budget (≤15 tool calls, ≤8 min) to prevent the pause-without-write pattern seen in demo run (per `docs/sop/specialist-pause-handling.md`).
- New synthesizer step (`reviewers.synthesizer: true` in config) — after all dimension reviews land artifacts under `.claude/artifacts/crew/reviews/`, parent dispatches one final `crew:reviewer` to merge into single verdict + cross-cite individual findings. Optional; default `false`.
- Existing 2-dim ladder continues to work unchanged when preset not set.
- Tests:
  - new preset resolves to correct ladder
  - per-dim prompts contain dimension scope-fence
  - synthesizer prompt cites all upstream artifacts
  - 3+ unit tests covering ladder expansion + override + synthesizer flag
- `commands/slice-review-ladder.md` updated to document `multidim` preset + when to pick it (large/risky diffs vs trivial fixups).
- CLAUDE.md `## Owned agents` / new section documents the new preset and when to use it.

## Implementation notes

- Wall-clock cost: max(dim) instead of sum(dim). 3-dim ~2x faster than sequential.
- Token cost: roughly 3x (or N x for N dims). Worth it for slices that touch >5 files; overkill for typo fixes. Document the tradeoff in slash-command body.
- Recommended trigger: opt-in via slice frontmatter `review_preset: multidim` rather than repo-wide default. Avoids cost regression on cheap slices.
- Pause-without-write SOP applies — `crew:reviewer` body should already obey ≤8min budget; new prompts MUST force inline output if artifact write times out (lesson from demo).
- Synthesizer artifact should preserve all upstream artifact paths so audit can trace any finding back to its dimension.

## Stretch (optional)

- Add `reviewers.parallelism: <number>` to cap concurrent reviewer dispatches (avoid LLM-rate-limit storms when ladder grows to 5+ dims).
- Wire `loop:review-fanout` skill as user-facing entry that auto-resolves the preset + emits the dispatch instructions.

## Consider rejecting because

_(Filled in during PM triage.)_
