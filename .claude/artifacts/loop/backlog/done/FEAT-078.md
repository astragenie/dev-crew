---
id: FEAT-078
status: done
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-09
depends_on: []
slices: [SLICE-83]
derived_from: null
source_competitors: [Archon]
autonomous_safe: true
tags: [workflow, governance]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.45
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
composite_score: 0.6175
triage_notes: Internal governance refinement; well-understood validator pattern; self-contained; autonomous-safe.
started_at: 2026-06-09
github_issue: 34
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/34"
slices_complete: [SLICE-83]
completed_at: 2026-06-09
---
# FEAT-078: Clause-citation discipline for scope decisions

## Source

Competitor analysis 2026-06-08 — Archon `.archon/maintainer-standup/direction.md` pattern. Every P4 polite-decline cites an explicit clause from policy doc (e.g. "single-developer-tool clause"). Loop's `loop:pm` currently emits free-text reasoning that drifts across sessions and is not auditable against policy.

See `.claude/artifacts/crew/runs/competitor-archon-analysis.md` §5 "Gaps in loop".

## Description

Number every governing clause in `CLAUDE.md` (and optionally `docs/code-conventions.md`, `.claude/loop/rules.md`) with stable anchors. Wire `loop:pm` so that any FEAT classified as `composite_priority: P4` (or rejected) MUST emit a `declined_per` frontmatter field citing one or more clause IDs. Reviewer agent (or a lint script) audits triage outputs to ensure every decline carries a citation; cite-less declines are surfaced as drift.

## Scoring

- Impact: 0.55 (raises triage consistency; no end-user effect)
- Effort: 0.35 (clause numbering + one prompt-template change + one validator)
- Fit: 0.75 (aligns with existing HARD RULE / direction-as-policy stance)
- Composite: (PM to score)

## Acceptance criteria

- `CLAUDE.md` H2/H3 sections carry explicit clause IDs (e.g. `<!-- clause: commit-discipline -->` or `## §commit-discipline — Commit Discipline`).
- `loop:pm` skill body instructs the agent: "if `composite_priority: P4` OR `decision: decline`, emit `declined_per: [<clause-id>, ...]` in FEAT frontmatter; missing citation = invalid PM output."
- New validator (`scripts/validate-decline-citations.mjs` or extension to existing manifest validator) walks `triaged/` + `done/` looking for `composite_priority: P4` without `declined_per`; non-zero exit on violation.
- CI gate added to `.github/workflows/*.yml` invoking the new validator.
- Backfill: run validator across current backlog; either add citations to existing P4 entries or document why historical entries are exempt.
- Test coverage: 3+ tests for the validator (cite-present passes, cite-missing fails, malformed clause-id fails).

## Implementation notes

- Clause IDs should be stable across CLAUDE.md edits — rename invalidates outstanding citations and forces re-triage (intentional pressure point).
- Consider including `policy_revision: <git-short-sha-of-CLAUDE.md>` alongside `declined_per` so audit can detect citations against superseded clause versions.
- `loop:architect` may also benefit — when proposing scope rejection in an ADR, cite a clause.

## References

- Archon `direction.md`: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/maintainer-standup/direction.md
- Standup command (shows clause-citation in action): https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/commands/maintainer-standup.md
- Competitor analysis artifact: `.claude/artifacts/crew/runs/competitor-archon-analysis.md`

## Consider rejecting because

_(Filled in during PM triage.)_
