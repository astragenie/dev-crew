---
id: FEAT-221
status: pending
priority: P2
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: [FEAT-220]
slices: []
derived_from: null
tags: [architecture, backend, memory, learning-loop, tooling]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested from continuous-learning-loop gap analysis (2026-07-06); corrected after architect-review. Turn per-event capture into batch learning: a FailureClassifier that clusters captured failures by failure_class, plus an operator-runnable mining job (pull failures -> cluster -> extract candidate lessons -> dated report). Consumes FEAT-220 schema; feeds FEAT-222. Read-mostly over real signal stores (grades/*.md, pause-events.jsonl, auto-dispatch.jsonl) + one new writer. Cross-cutting -> needs_contract, NOT autonomous_safe. Hold build until capture (issue #325 / dev-team FEAT-188) is flowing — otherwise it clusters over ~5 stale rows."
---
# FEAT-221: FailureClassifier + mining job

## Origin

Continuous-learning-loop gap analysis (2026-07-06), corrected by architect-review.
Capture today is **per-event** (fires on review-FAIL / validation-FAIL /
inline-return-warn / subagent-incomplete). No step **clusters** failures by type
or **mines** them on a cadence. This adds component 2 (FailureClassifier) + the
batch job. Depends on FEAT-220 (`failure_class` / `root_cause` are the cluster
keys).

## Scope

### A. FailureClassifier (pure, testable)

`src/scripts/lib/failure-classifier.mts`:

1. Reads recent failure signal from the stores that actually carry it (READ-ONLY):
   - **`grades/*.md`** (119 files) — the real lesson corpus, parsed today by
     `lessons-feed.mts::recentLessons` / `listGrades`. **This is the primary
     input, NOT `grades.jsonl`** (which holds ~1 row and is not the lesson
     signal — first-draft error, corrected).
   - **`pause-events.jsonl`** (46 rows, `outcome: "paused"` markers).
   - **`auto-dispatch.jsonl`** (179 rows, `ok:false` dispatch failures).
   - **`learnings.jsonl`** entries carrying a `failure_class` (FEAT-220).
2. Groups into clusters keyed on `failure_class` (+ optional secondary key on a
   normalized `root_cause`), producing `FailureCluster[]`:
   `{ failure_class, count, exemplar_ids[], first_seen, last_seen,
   representative_root_cause, representative_fix }`.
   - **`kind` is NOT a storage field** anywhere (it only exists as a synthesized
     display field on `memory-context.ContextLine`). Do not key on it —
     first-draft error, corrected. `failure_class` is the only real
     discriminator; for legacy rows lacking it, apply best-effort inference
     (map from `source`/`key`, else bucket to `other`).
3. Emits a deterministic ranking (frequency × recency) — top N clusters are the
   highest-value learning targets.

### B. Mining job (thin orchestration)

An operator-runnable command / CLI subcommand (e.g. `loop.mts mine-failures`):

1. Runs the classifier over a window (`--since`, default last N days).
2. For the top clusters, extracts 3–10 **candidate** lessons via `logLearning`
   (reuse FEAT-188 paths — NO parallel writer), each `status: candidate` with
   `failure_class` / `root_cause` / `recommended_fix` / `evidence[]` populated.
3. Writes a human-readable report under
   `.claude/artifacts/loop/mining/YYYY-MM-DD.md`.
4. Idempotent — re-running over the same window writes no duplicate candidate
   lessons (dedup on a stable cluster hash: `failure_class` + normalized
   `root_cause` signature, timestamp-independent).

Out of scope: generating eval cases (FEAT-222); any GEPA invocation. "Scheduled"
here = operator-runnable + pure; a real cron wrapper is a follow-up.

## Acceptance criteria

- AC-1: GIVEN a window (`grades/*.md` + `pause-events.jsonl` + `auto-dispatch.jsonl`
  + `learnings.jsonl`) with multiple failures of the same `failure_class`, WHEN
  the classifier runs, THEN it returns one cluster per class with correct
  `count`, `exemplar_ids`, and first/last-seen timestamps.
- AC-2: GIVEN clusters of differing frequency and recency, WHEN ranked, THEN a
  more-frequent-and-more-recent cluster sorts above a rarer/older one
  (deterministic, tie-broken by class name).
- AC-3: GIVEN the mining job runs, WHEN it completes, THEN it appends candidate
  lessons (`status: candidate`) via `logLearning` for the top clusters and never
  mutates any source store.
- AC-4: GIVEN the job runs twice over the same window, WHEN the second run
  completes, THEN no duplicate candidate lessons are written (idempotent on
  cluster hash).
- AC-5: GIVEN a window with zero failures, WHEN the job runs, THEN it exits
  cleanly, writes a "no clusters" report, writes no lessons, and never throws.
- AC-6: A dated cluster report is written under `.claude/artifacts/loop/mining/`.
- AC-7: Full suite green; typecheck + lint + format clean; snapshot-freshness
  passes; module under the 400-line split guideline and biome cognitive-complexity
  cap (extract helpers).

## Blocked by (external)

- Same capture-flow gate as FEAT-220: with `learnings.jsonl` stale, the classifier
  clusters over ~5 rows. `grades/*.md` / `pause-events.jsonl` / `auto-dispatch.jsonl`
  carry live signal today, so partial value exists pre-capture — but full value
  needs issue #325 / dev-team FEAT-188 landed. Prefer to build AFTER capture flows.

## Risks / open questions

- Legacy-row `failure_class` inference must be defined in the contract (map rule
  + `other` fallback).
- Dedup hash must survive cross-day reruns without suppressing genuinely new
  recurrences — hash on class + window-independent root-cause signature.

## Refs

- `src/scripts/lib/lessons-feed.mts` (`recentLessons`/`listGrades` — grades/*.md reader).
- `src/scripts/lib/learnings.mts` (`logLearning`, reader).
- `src/scripts/lib/learnings-ranker.mts` (frequency/recency ranking prior art).
- `.claude/artifacts/loop/{grades/*.md,pause-events.jsonl,auto-dispatch.jsonl,learnings.jsonl}`.
- FEAT-220 (enriched schema — hard dependency). FEAT-222 (downstream consumer).
- Architect-review: this session (2026-07-06).
