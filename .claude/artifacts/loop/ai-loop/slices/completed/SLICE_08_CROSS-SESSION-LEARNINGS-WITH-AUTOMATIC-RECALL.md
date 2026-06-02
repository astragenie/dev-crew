---
id: SLICE-08
status: completed
feature: FEAT-011
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-05-28
updated: 2026-05-28
completed_at: 2026-05-28
github_issue: 17
---
# SLICE-08: Cross-session learnings with automatic recall

Implements FEAT-011. See [feature file](../../../backlog/in-progress/FEAT-011.md) for product context.

## Objective

Add a persistent JSONL operational learnings store and surface the top 3 most-recent entries automatically at `/loop:start`, so the agent inherits session-to-session observations without manual recall.

## Files

- `scripts/lib/learnings.mjs` (new) — `logLearning`, `recentLearnings`, `searchLearnings`; store at `.claude/artifacts/loop/learnings.jsonl` under the repo
- `scripts/loop.mjs` — add `learnings log` and `learnings recent` sub-commands
- `scripts/lib/slice-linker/start-slice.mjs` — call `recentLearnings(3)` and include digest in `startSlice` return
- `commands/learn.md` (new) — `/loop:learn` command: log a new learning during a session
- `skills/loop-discipline/SKILL.md` — add session-start step: read auto-surfaced learnings block
- `src/scripts/lib/learnings.mts` (new) — TypeScript source for learnings.mjs
- `src/tests/learnings.test.mts` (new) — unit tests for logLearning + recentLearnings

## In scope

- JSONL store at `.claude/artifacts/loop/learnings.jsonl` (repo-local, committed so learnings travel with the repo)
- Each entry: `{ id, timestamp, key, insight, confidence, source, sliceId?, tags? }`
- `logLearning(repoPath, entry)` — appends to JSONL; assigns monotonic ID
- `recentLearnings(repoPath, n)` — returns last N entries as array + markdown digest
- `startSlice` return includes `learningsDigest` field (null when store empty)
- `/loop:learn` command documents how to log a learning mid-session
- `loop:start` skill updated to surface learnings digest when present
- `loop.mjs learnings log --key K --insight I [--confidence 0-1] [--slice SLICE-NN]` CLI
- `loop.mjs learnings recent [--limit N]` CLI

## Out of scope

- Semantic search / embedding-based recall (plain recency only for now)
- Pruning / archiving old entries
- Cross-repo learnings aggregation
- Modifying crew plugin

## Acceptance criteria

- [ ] AC-1: `node scripts/loop.mjs learnings log --key "test-key" --insight "test insight" --confidence 0.8` writes a JSON line to `.claude/artifacts/loop/learnings.jsonl` with correct shape `{ id, timestamp, key, insight, confidence, source }`
- [ ] AC-2: `node scripts/loop.mjs learnings recent --limit 3` returns JSON with `{ count, items, digest }` where `digest` is a markdown string
- [ ] AC-3: `startSlice` return object includes `learningsDigest` — a non-null string when learnings.jsonl has entries, null when file absent/empty
- [ ] AC-4: `skills/loop-discipline/SKILL.md` has a `<HARD-GATE>` or `<EXTREMELY-IMPORTANT>` block instructing the agent to read the `learningsDigest` from `startSlice` output when non-null
- [ ] AC-5: `npm test` passes with ≥10 new tests covering logLearning (append, ID increment, malformed-entry guard) and recentLearnings (empty store, n > count, digest format)
- [ ] AC-6: `npm run lint` clean; `npm run typecheck` clean

## Done When

- all acceptance criteria PASS with evidence
- `npm test` ≥ 436 passing
- feature FEAT-011 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: A
- Reviewer B: B
