---
id: SLICE-115
title: "Review verdict schema: not_checked[] field + author/judge separation"
status: completed
feature: FEAT-180
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 248
github_url: "https://github.com/sergeymilashico/loop/issues/248"
completed_at: 2026-06-13
---
# SLICE-115: Review verdict schema: not_checked[] field + author/judge separation

Implements FEAT-180. See [feature file](../../../backlog/in-progress/FEAT-180.md) for product context.

## Objective

Adopt two AgentOps verdict-schema ideas (schemas/verdict.v1.schema.json, claim-bind levels in C:/work/mega/agentops): (1) review artifacts carry an explicit not_checked[] list — what the reviewer deliberately did NOT cover — killing false confidence from silent scope gaps; (2) evidence/approval records carry separate author_id and judge_id so self-approval is structurally visible.

## In scope

- Update `commands/slice-review-ladder.md`: both Reviewer A and B prompts require a `## Not checked` section with ≥2 example items
- Create `docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md` following existing upstream-request pattern
- Upstream request proposes: `--not-checked []` flag for write-review-result, `author_id` and `judge_id` fields

## Out of scope

- hero-crew implementation (upstream-request only)
- Pattern alert for empty not_checked (optional stretch goal)
- Changes to artifact readers (backward-compatible by design)

## Acceptance criteria

- [ ] AC-1: `bun ./src/scripts/validate-manifests.mts` passes
- [ ] AC-2: `commands/slice-review-ladder.md` Reviewer A and Reviewer B prompts both contain a `## Not checked` section with at least 2 example items describing what the reviewer explicitly did NOT cover
- [ ] AC-3: `docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md` exists and follows the format of existing upstream-request files (status field, proposal section, links to prior art)
- [ ] AC-4: `bun ./src/scripts/validate-content-length.mts` passes (line caps maintained)
- [ ] AC-5: No existing loop artifact readers break (backward-compatible — missing fields tolerated)

## Done When

- all acceptance criteria PASS with evidence
- feature FEAT-180 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- requires_validation: false (docs-only — no runnable behavior change in loop code)

## Reviewer ladder

- Reviewer A: correctness + AC coverage (not_checked section present in both reviewer prompts, upstream-request doc complete)
- Reviewer B: content quality, backward-compat, consistency with existing upstream-request pattern
