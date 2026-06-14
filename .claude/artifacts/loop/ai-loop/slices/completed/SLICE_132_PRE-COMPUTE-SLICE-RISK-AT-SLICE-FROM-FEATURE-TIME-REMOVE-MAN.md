---
id: SLICE-132
title: Pre-compute slice risk at `slice from-feature` time — remove manual classification from lead
status: done
feature: FEAT-200
phase: null
priority: P2
target_release: 0.50.1
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
completed_at: 2026-06-13
github_issue: 275
github_url: "https://github.com/sergeymilashico/loop/issues/275"
---
# SLICE-132: Pre-compute slice risk at `slice from-feature` time — remove manual classification from lead

Implements FEAT-200. See [feature file](../../../backlog/in-progress/FEAT-200.md) for product context.

## Objective

Crew:lead's Golden Path step 2 ("Classify risk") asks lead to read FEAT tags + heuristics and assign `risk: low | medium | high`. That risk tier drives dispatch budget, artifact set, and gate ladder.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: <replace with a concrete, testable acceptance criterion>

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-200 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
