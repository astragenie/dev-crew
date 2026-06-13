---
id: SLICE-130
title: "Decay-ranked, citation-tracked learnings retrieval injected at builder dispatch"
status: pending
feature: FEAT-179
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 271
github_url: "https://github.com/sergeymilashico/loop/issues/271"
---
# SLICE-130: Decay-ranked, citation-tracked learnings retrieval injected at builder dispatch

Implements FEAT-179. See [feature file](../../../backlog/in-progress/FEAT-179.md) for product context.

## Objective

Adopt AgentOps decay-ranked retrieval (schemas/learning.v1.schema.json, docs/wiki-for-agents.md in C:/work/mega/agentops): learning confidence decays ~10%/week at READ time (timestamp multiplier, no daemon); every retrieval is appended to a citations ledger (citations.jsonl); utility scores update from outcomes (+1 when the consuming slice's review/validation passes, -2 on fail). Retrieval returns the top items trimmed to ~1000 tokens.

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
- feature FEAT-179 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
