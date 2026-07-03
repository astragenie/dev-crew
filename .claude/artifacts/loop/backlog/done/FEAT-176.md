---
id: FEAT-176
status: done
priority: P1
category: tech-debt
target_release: null
created: 2026-06-10
updated: 2026-07-02
depends_on: []
slices: [SLICE-134]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.05
pm_strategic_alignment: 0.9
pm_technical_risk: 0.1
pm_dependency_depth: 1
composite_score: 0.795
autonomous_safe: false
deferred: false
deferred_reason: "Unblocked 2026-07-02: AC-2 satisfied via front-loaded-stub fallback (crew FEAT-161 scaffold contract, extended to aiplugin-dev via dev-team PR #150). Remaining ACs are loop-side."
triage_notes: "via=pm | P1 visibility (root cause of cost spike) but dependency_depth=1.0 (100% blocked on upstream). autonomous_safe=false: external blocker, no builder. Monitor hero-crew issue; re-triage next iteration."
github_issue: 196
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/196"
started_at: 2026-07-02
slices_complete: [SLICE-134]
completed_at: 2026-07-02
---
## Description

Tracking FEAT for the upstream-request `docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md`. This FEAT does NOT implement a fix — the fix lives in hero-crew (the agent-dispatch loop / specialist agent prompts). This entry keeps the open request visible in loop triage/snapshot until hero-crew ships it and loop re-pins the crew version.

## Problem being tracked

`crew:builder` / `crew:reviewer` / `crew:validator` dispatches regularly pause on a tool-less narration turn and return BEFORE their mandatory `write-*` artifact step, leaving the gate unresolved. Structural (agent loop exits on a message with no tool call), not fixable by loop-side prompt instructions — proven on SLICE-87 where the explicit 'last call must be write' rule still paused all 3 dispatches. Pattern persists past the SOP's 5-slice threshold (≥9 slices across 2026-06-06 and 2026-06-10).

## Acceptance criteria

- [ ] AC-1: hero-crew issue/PR opened against `sergeymilashico/hero-crew` referencing the upstream-request doc.
- [ ] AC-2: upstream merges harness completion-enforcement (re-prompt once on artifact-less exit; else return `incomplete: true`) OR front-loaded-stub fallback.
- [ ] AC-3: loop `MIN_CREW_VERSION` (`scripts/lib/plugin-identity.mjs`) bumped to the crew version that ships the fix.
- [ ] AC-4: `docs/sop/specialist-pause-handling.md` §2 manual-fallback marked retired/optional once the harness self-heals.
- [ ] AC-5: upstream-request doc `status:` updated to merged + tracking table closed.

## Notes

- Mirrors how FEAT-058 tracked the redundant-read hook upstream-request.
- Blocked on upstream — not autonomous-implementable in this repo. Expect P3/low priority, deferred until the upstream issue moves.
- Evidence: SLICE-87 cost $43.49 (184% over median), ~150k tokens burned on 3 dead dispatches.