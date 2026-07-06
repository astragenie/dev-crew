---
id: FEAT-229
status: pending
priority: P1
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [architecture, backend, memory, learning-loop, tooling]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested 2026-07-06 (post-v0.62.0). The continuous-learning-loop components all shipped this session (FEAT-220 schema, FEAT-221 classifier+mine-failures, FEAT-222 EvalGenerator, FEAT-228 grade-mining) but NOTHING orchestrates or schedules them — mine-failures is operator-run only and eval-generator has no caller. This FEAT wires them into one pipeline + a cadence so the loop actually runs. Highest ROI: activates everything already built. Adds a scheduled surface + cross-plugin write into crew evals -> needs_contract, NOT autonomous_safe."
---
# FEAT-229: wire + schedule the continuous-learning loop

## Origin

Operator request, 2026-07-06, immediately after v0.62.0. The full learning loop
was assembled this session but is **idle** — every component exists, nothing
fires them:

- **FEAT-220** — enriched `learnings.jsonl` write-shape (failure_class / status /
  scope / evidence / …).
- **FEAT-221** — `failure-classifier.mts` + `failure-mining.mts` + the
  `loop.mts mine-failures` CLI (clusters real failure signal → candidate lessons
  + a dated report). **Operator-runnable only; nothing schedules it.**
- **FEAT-222** — `eval-generator.mts` (a `FailureCluster` → a manufactured crew
  eval-spec appended into `<loop.crewRepoPath>/evals/agents/crew-<agent>.yaml`).
  **Has no caller.**
- **FEAT-228** — grade Surprises/Followups feed the classifier.

The pieces form a loop on paper (capture → classify → mine → manufacture eval)
but there is no orchestrator chaining them and no cadence running the chain. This
FEAT closes that gap. It builds NO new analysis capability — it only wires and
schedules the existing ones.

## Scope

### A. Orchestrator (one pipeline)
A `runLearningCycle(repoPath, config)` in a new
`src/scripts/lib/learning-cycle.mts` that chains the existing calls, each
fire-and-forget / fail-silent (a failure in one stage never aborts the cycle or
the caller):

1. Run the classifier / `mineFailures` over a window → clusters + candidate
   lessons (reuse FEAT-221; do NOT reimplement).
2. Feed the top-ranked clusters to `generateEvalsForClusters` (FEAT-222) →
   manufactured eval-specs written to the crew repo (only when
   `loop.crewRepoPath` is configured + reachable; else skip with a logged
   reason, per FEAT-222's contract).
3. Write a single cycle report under
   `.claude/artifacts/loop/learning-runs/YYYY-MM-DD.md`: clusters found, candidate
   lessons emitted, eval-specs manufactured (+ skips with reasons).

Idempotency is inherited — mine-failures dedups on cluster hash, eval-generator
dedups on provenance hash — so re-running a cycle over the same window is safe.

### B. Entry point + cadence
- A `loop.mts learn` (or `learning-cycle`) subcommand that runs `runLearningCycle`
  once (operator-invocable).
- A cadence to run it automatically. Pick ONE in the contract step:
  - **(a)** integrate into the existing marathon-checkpoint / retrospective flow
    (run a cycle when a checkpoint/retro fires — no new scheduler), OR
  - **(b)** a `CronCreate`-registered scheduled agent invoking `loop.mts learn`, OR
  - **(c)** a post-slice-close hook (run a lightweight cycle on `runner:close`).
  Recommend (a) — it reuses an existing cadence surface, needs no new
  infrastructure, and aligns cycles with the reflection points the loop already
  has.

### C. Config
`loop.learningLoop`:
- `enabled` (default `false` — opt-in, like memory-sink).
- `cadence` (which trigger from B).
- `maxClustersPerRun`, `maxSpecsPerRun` — volume caps so a noisy failure window
  can't flood the crew eval corpus (mirrors FEAT-222's volume-control risk note).
- `windowDays` for the classifier.

## Acceptance criteria

- AC-1: GIVEN `loop.learningLoop.enabled: true` + a window with clustered
  failures, WHEN `runLearningCycle` runs, THEN it produces candidate lessons AND
  (when `loop.crewRepoPath` is set) manufactured eval-specs, AND writes one dated
  cycle report — with zero operator action beyond the trigger.
- AC-2: GIVEN a stage throws (classifier / eval-generator / a bad crew repo),
  WHEN the cycle runs, THEN the cycle completes the other stages, logs the
  failure, and NEVER propagates the error into the caller (fire-and-forget).
- AC-3: GIVEN `loop.learningLoop.enabled: false` (default) OR absent config, WHEN
  any trigger fires, THEN the cycle is a no-op (byte-identical behavior to today —
  opt-in, no surprise cross-plugin writes).
- AC-4: GIVEN the same window is processed twice, WHEN the cycle re-runs, THEN no
  duplicate candidate lessons and no duplicate eval-specs are written (idempotency
  inherited from FEAT-221/222).
- AC-5: GIVEN `maxClustersPerRun` / `maxSpecsPerRun` caps, WHEN a window exceeds
  them, THEN the cycle processes only up to the cap and the report records what
  was dropped (no silent truncation).
- AC-6: A DEC-* records the cadence choice (B-a/b/c) with rationale.
- AC-7: Full suite green; typecheck + lint + format clean; snapshot-freshness
  passes. Tests use a temp crew-repo fixture — never write into real dev-team.

## Risks / open questions

- **Cadence choice** is the one real design decision (B). Recommend (a)
  marathon-checkpoint/retro integration; confirm in the contract step.
- **Cross-plugin write cadence** — manufactured eval-specs land in the crew repo.
  The volume caps (AC-5) + the `manufactured` marker + human-review-before-gating
  (FEAT-222/220 lifecycle) keep a noisy window from polluting crew's corpus.
- **Opt-in default** — `enabled: false` so no repo starts writing to a crew clone
  without explicit configuration (same posture as memory-sink / DEC-065).

## Refs

- `src/scripts/lib/failure-mining.mts` (`mineFailures`) + `failure-classifier.mts`
  (FEAT-221 — stage 1).
- `src/scripts/lib/eval-generator.mts` (`generateEvalsForClusters`, FEAT-222 —
  stage 2; `loop.crewRepoPath` + skip-path contract in DEC-068).
- Marathon-checkpoint / retrospective flow (cadence option a).
- DEC-067/068/069 (the loop's transport + eval-spec + preset decisions).
