---
id: FEAT-002
status: done
priority: P1
category: bugfix
target_release: null
created: 2026-05-27
updated: 2026-05-28
depends_on: []
slices: [SLICE-03]
derived_from: null
triage_notes: no fields needed inference
progress_notes: Part 2 (agent-report timestamp) completed via SLICE-03 (commit 850b69f). Part 1 (cost-report double prefix) is in hero-crew repo — out of scope for this repo.
completed_at: 2026-05-28
github_issue: 4
github_milestone: 1
phase: 1
---
## Description

Two crew-side naming bugs observed in Astra.Humanizer artifacts:

1. **cost-report-cost- double prefix** — crew CLI cost-slice command creates filenames like 20260527T...-cost-report-cost-phase-r1-... The second 'cost' comes from the title slug also containing 'cost'. Fix in hero-crew cost-slice command: strip redundant kind prefix from title before slugifying.

2. **Agent report missing timestamp** — agent-report files like phaser1-feat002-slice002-agent-report.md lack the leading YYYYMMDDTHHMMSSZ- prefix that all other crew artifacts have. Fix in loop's agent-report-writer.mjs or crew's artifact writer.

## Acceptance hints

- cost-report filenames: single 'cost' not double
- agent-report filenames: leading timestamp present
- All artifact filenames follow consistent TS-phase-feat-slice-kind.md pattern
