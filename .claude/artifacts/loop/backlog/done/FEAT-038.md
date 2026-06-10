---
id: FEAT-038
status: done
priority: P2
category: infra-feature
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-40]
derived_from: null
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=null → false"
started_at: 2026-06-04
slices_complete: [SLICE-40]
completed_at: 2026-06-04
github_issue: 80
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/80"
---
## Description

Add two advisory line-tag conventions to the lead-dispatch prompt so the parent orchestrator has early visibility into crew:lead's chosen mode + per-AC progress. Triggered by SLICE-35 surprise (commit `70bd72d`, GRADE-SLICE-35).

Design: `docs/superpowers/specs/2026-06-04-lead-dispatch-visibility-design.md`.

## Scope

Single-file edit:
- `src/scripts/lib/slice-linker/start-slice.mts::buildDispatchInstruction` — inject `## Progress signals` block into the prompt template.

Lead instructed to emit:
- `[MODE] <single-session|assisted-single-session|team-run>` exactly once, first turn after dispatch.
- `[CHECKPOINT] AC-<N>: <pass|fail|skip> — <≤80 char note>` after each AC.

Advisory contract — no enforcement layer. Parent degrades gracefully on absence.

## Out of scope

- Cross-plugin changes to `crew/agents/lead.md`.
- Reconciliation of HARD RULES ("never implement inline") with v0.7.2 lead-prompt ("prefer inline for test-fix"). Separate FEAT.
- Parser hook in `/loop:slice complete` that validates checkpoint count vs AC count. Deferred to a future FEAT if drift observed.

## Acceptance hints

- Unit test in `src/tests/slice-start.test.mts` (or similar) asserts `buildDispatchInstruction` output contains both convention blocks via regex tokens.
- Behavioral observation over next 2-3 live lead dispatches: target ≥ 80% adoption per dispatch.
- autonomous_safe: true — prompt-template edit only, no production behavior change.

## Derived from

GRADE-SLICE-35 Followups + SLICE-35 surprise event.
