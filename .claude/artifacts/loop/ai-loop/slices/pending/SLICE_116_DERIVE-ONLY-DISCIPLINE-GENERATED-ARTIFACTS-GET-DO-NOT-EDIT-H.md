---
id: SLICE-116
title: "Derive-only discipline: generated artifacts get do-not-edit headers + regen --check drift gate"
status: pending
feature: FEAT-183
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 251
github_url: "https://github.com/sergeymilashico/loop/issues/251"
---
# SLICE-116: Derive-only discipline: generated artifacts get do-not-edit headers + regen --check drift gate

Implements FEAT-183. See [feature file](../../../backlog/in-progress/FEAT-183.md) for product context.

## Objective

Adopt AgentOps derive-only contracts (generated files carry an explicit 'Auto-generated — do not edit; re-run <script>' header; CI runs generators with --check to fail on drift). Loop-generated artifacts (loop-snapshot.md, slice-progress.md, COMMANDS-style docs, auto-run summaries) currently accept silent hand-edits that diverge from reality until the next regen clobbers them.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: snapshot-memory generator stamps a do-not-edit header with regen command; src/scripts/pre-push-validate.mts gains --check-generated flag that runs generator in-memory and diffs output; exits non-zero listing drifted files; bun test + lint clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-183 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
