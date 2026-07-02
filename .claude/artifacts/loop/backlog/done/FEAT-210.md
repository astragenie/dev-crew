---
id: FEAT-210
status: done
priority: P2
category: evals
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [evals, telemetry]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.5
pm_effort_estimate: 0.52
pm_strategic_alignment: 0.55
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-07-02
autonomous_safe: false
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.6-0.8: new dependency surface (GEPA has literally never run against real data), a judge-model swap, and the FEAT explicitly requires an unrecorded architectural decision (ADR-C) before any live-generator flip -- 'unknowns needing a spike' territory, though capped below 0.9 since the harness itself is described as architecturally sound. P2/autonomousSafe:false matches the retrospective stub exactly: real strategic value ('unblocks the entire optimization program') but gated on governance not yet in place, and effort spans 4 sub-workstreams -- not a single clean unit for unattended dispatch."
completed_at: 2026-07-02
---
# FEAT-210: GEPA capture canary + judge/held-out prerequisites

## Problem

GEPA has never run against real data: zero trial JSONL in either repo's
history, candidate generator stubbed behind unset `GEPA_LIVE_GENERATOR`,
default judge `ollama llama3.2:latest` — a model class the evals/
harness rejected 2026-06-29 (groq+gemini triangulation adopted there
but not in gepa.config.json). Held-out sets are 2 (architect) / 3
(inspector) vs `detectEvalDrift` minSampleSize 5, so drift detection is
structurally inert.

## Acceptance hints

- Capture enabled for one low-stakes agent (e.g. frontend-dev); at
  least one real trial row lands under
  `.claude/artifacts/crew/gepa/trials/`.
- Judge default synced to groq+gemini triangulation (or judge_per_agent
  overrides per v1 target agent).
- Held-out sets grown to >=5 cases/agent; drift detection numerically
  active.
- Record ADR-C (optimize portable block, not whole file) BEFORE any
  GEPA_LIVE_GENERATOR enablement.

## Evidence

- Retrospective §0.2, top-10 #6, ADR-C (WP3);
  `gepa-core/src/validators/detect-eval-drift.ts:42-89`;
  dev-team `gepa.config.json` + `evals/agents/crew-fullstack-dev.yaml`
  (origin/main).
