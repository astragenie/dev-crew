---
id: FEAT-004
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: [FEAT-003]
slices: [SLICE-14, SLICE-15, SLICE-16, SLICE-17, SLICE-18, SLICE-19]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.65
pm_dependency_depth: 0.75
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: true
triage_notes: "8-point epic (mandatory decomposition, 2-point cap per runner#393) covering the full command/agent/skill/hook surface; technical_risk banded 0.65 (cross-module reach across the whole surface, but the individual changes are mostly mechanical rename/dedupe with clean git-revert rollback -- kept below the 0.9+ band since nothing here is a schema or cross-plugin contract change); autonomousSafe=false given the dependency chain (3 unresolved predecessor phases) and the already-measured day-one CI-red risk from the agent-cap row."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Command map application + dispatch-token rewrite
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Agent map merges (doc-writer/researcher/architect) + agent trims
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Skill dedupe (7 pairs) + manifest rename to devcrew
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: "Hooks merge + matcher-scoped consolidation, <=150ms gate"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: models.yaml/model-router single-source design merge
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-6
    title: "Greenfield spikes + full /devcrew:* ceremony smoke test"
    points: 1
    estimated_tokens: 60000
tags: ["stack:typescript", "area:plugin-surface", "concern:dispatch-routing"]
needs_contract: true
needs_ux: false
arch_attempt: 0
arch_status: approved
arch_review: approved
started_at: 2026-08-19
slices_complete: [SLICE-14, SLICE-15, SLICE-16, SLICE-18, SLICE-17, SLICE-19]
completed_at: 2026-08-19
---
## Description

P3 Surface merge: apply command map (54 parent commands -> 39 first-party /devcrew:* + 1 vendored; 11 crew commands dropped incl claims/approvals 7 and gepa-promotion 4), agent map (29 -> 26 owned, document-writer/researcher/architect merges), skill dedupe (7 verified pairs, dev-team superset wins, ~82 final); dispatch-token rewrite crew:X/runner:X -> devcrew:X; hooks merged + consolidated to matcher-scoped (exit gate measured <=150ms per Bash call); trim 4 over-cap agents to 300-line cap; models.yaml/model-router single-source design merge; manifest name devcrew. Includes greenfield candidates: prompt-based hooks spike, blank-page 39-command audit. Exit gates: validate-agent-refs green, every old token resolves per map, content-length green, one full slice ceremony under /devcrew:*. Full spec: unification-plan.md section 2 + P3 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the command map from unification-plan.md section 2 is applied, When `bun ./src/scripts/validate-agent-refs.mts` runs against the merged tree, Then it exits 0.
- AC-2: Given the dispatch-token rewrite table (crew:X -> devcrew:X, runner:X -> devcrew:X), When every .md file under commands/, agents/, skills/, CLAUDE.md, and AGENTS.md is grepped for `\bcrew:[a-z-]+\b|\brunner:[a-z-]+\b`, Then every match resolves to an entry in the section-2 map -- zero unmapped tokens.
- AC-3: Given 4 dev-team agents exceed the 300-line cap before trimming (architect 346, verifier 343, backend-dev 335, release-engineer 326 lines), When `bun ./src/scripts/validate-content-length.mts` runs after the trim slice, Then it exits 0 and each of the four files is <=300 lines.
- AC-4: Given hooks are consolidated to matcher-scoped registrations, When a representative Bash tool call is measured end-to-end through the hook pipeline, Then the measured overhead is <=150ms -- a measurement above 150ms fails this AC (targets the ~540ms/Bash-call regression named in the plan's risk register).
- AC-5: Given the merge completes, When one full slice ceremony runs end-to-end under the /devcrew:* namespace, Then it completes with a PASS badge and its artifacts contain zero references to the old /crew: or /runner: command namespaces.

## Proposed slices (PM decomposition)

- SLICE-1: Command map application + dispatch-token rewrite (2 pts)
- SLICE-2: Agent map merges (doc-writer/researcher/architect) + agent trims (2 pts)
- SLICE-3: Skill dedupe (7 pairs) + manifest rename to devcrew (2 pts)
- SLICE-4: Hooks merge + matcher-scoped consolidation, <=150ms gate (2 pts)
- SLICE-5: models.yaml/model-router single-source design merge (2 pts)
- SLICE-6: Greenfield spikes + full /devcrew:* ceremony smoke test (1 pts)
