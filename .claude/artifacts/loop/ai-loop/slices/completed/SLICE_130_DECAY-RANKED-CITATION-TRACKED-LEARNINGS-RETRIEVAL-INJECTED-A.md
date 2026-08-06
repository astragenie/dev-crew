---
id: SLICE-130
title: "Decay-ranked, citation-tracked learnings retrieval injected at builder dispatch"
status: done
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

- `src/scripts/lib/learnings-decay.mts` — decay formula (`confidence * exp(-k * weeksElapsed)`, k=ln(2)/10 for ~10%/week half-life), applied on read, no daemon; extends existing learnings entry type with `confidence`, `utility_score`, `last_cited_at` fields
- `src/scripts/lib/learnings-citations.mts` — citation ledger: append one JSON line to `.claude/artifacts/loop/citations.jsonl` per retrieval (`sliceId`, `learningIds[]`, `retrievedAt`); update `utility_score` from grade outcome (+1 pass / -2 fail)
- `src/scripts/lib/learnings-ranker.mts` — rank learnings by `decay(confidence) * utility_score`; trim to ~1000 token budget (char-count proxy: 4 chars/token); optional `--query` text for relevance boost
- `src/scripts/loop.mts` — new `loop lessons rank [--query <text>] [--limit N]` subcommand
- Tests: `src/tests/learnings-decay.test.mts`, `src/tests/learnings-citations.test.mts`, `src/tests/learnings-ranker.test.mts`

## Out of scope

- Actual injection into `dispatchInstruction` at slice start (builder integrates ranking but does NOT auto-inject into builder prompt — that is a separate future FEAT)
- Semantic embedding / vector search

## Acceptance criteria

- [ ] AC-1: `decayConfidence(entry, nowMs)` returns `entry.confidence * exp(-k * weeks)` where `k = Math.LN2 / 10`; at exactly 10 weeks the result is ≈ 0.5 × initial confidence (±0.001). Test: ≥5 cases including 0-week (no decay), 10-week, 20-week, zero-confidence.
- [ ] AC-2: `appendCitation(sliceId, learningIds, artifactDir)` appends one JSON line to `citations.jsonl` with `{sliceId, learningIds, retrievedAt}`. File is created if absent. Test: 3 sequential appends produce 3 lines; file survives concurrent writes without corruption (use sequential not parallel in test).
- [ ] AC-3: `updateUtilityScore(learningId, outcome, store)` increments `utility_score` by +1 for `"pass"` and -2 for `"fail"`; score never goes below `0`. Test: ≥6 cases covering pass, fail, sequential pass+fail, floor at zero.
- [ ] AC-4: `rankLearnings(entries, opts?)` returns entries sorted descending by `decay * utility`, trimmed so the joined text stays ≤ 1000 tokens (approx `chars / 4 <= 1000`); if `opts.query` is provided, entries whose text includes any query word are boosted by +0.1 before ranking. Test: 10-entry set, verify order + token budget + query boost.
- [ ] AC-5: `loop lessons rank` CLI subcommand prints ranked learnings as JSON array to stdout; `--query <text>` and `--limit N` flags work; `--json` flag omits formatting. Exit 0 when store empty (empty array).
- [ ] AC-6: `bun test src/tests/` passes; `bun run lint` clean; cyclomatic complexity ≤ 15 per new module.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-179 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (decay math precision, citation ledger append semantics, ranker sort stability + token-cap)
- Reviewer B: production-readiness (file I/O error handling, concurrent append safety, CLI output format) + test adequacy
