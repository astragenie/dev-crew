---
id: FEAT-268
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-161, SLICE-162, SLICE-163, SLICE-164]
derived_from: null
tags: [be, docs, test]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.65
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-02
autonomous_safe: false
triage_notes: "P1: demonstrated, actively-corrupting-telemetry bug (loop-snapshot's own cost-trajectory line feeds cost-alert/cost-ceiling gates) with real audit evidence, but capped below P0 since there's no active incident/outage -- this is degraded observability accuracy, not a broken build. technical_risk banded 0.6-0.8 (cross-module reach into an external plugin's scan logic, root cause location unconfirmed)."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Root-cause spike: loop-side vs crew-side window reset (isolated landmine)"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Fix + stamp session/transcript id into report frontmatter
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: "Regression test: repeated same-session scan advances window"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Upstream-request (if crew-side) + docs
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-02
github_issue: 559
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/559"
---
## Description

Fix cost-report scan window never resetting: Window Start stays frozen for days (evidence 2026-08-02 audit: five FEAT-250/SLICE-153 reports all Window Start 2026-07-03, totals monotonic 1.823B-1.831B tokens, each ~$3,233 — cumulative re-reports of the same spend). Per-slice cost scans must reset the window to the slice's own session boundary and stamp the crew session/transcript id into report frontmatter so dedup can corroborate on id, not token equality. Investigate whether the window bug is loop-side (slice-linker/crew-bridge.mts invocation args) or crew-side (cost-slice scan); if crew-side, fix what is fixable from loop and file an upstream request under docs/upstream-requests/. Do NOT loosen the FEAT-204 dedup fingerprint to a tolerance band — adversarial review confirmed that would merge distinct cumulative snapshots and undercount real spend.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given two consecutive `crew cost-slice` invocations against the same crew session issued a day apart, When each writes a cost report, Then the second report's Window Start advances past the first report's Window End (not frozen).
- AC-2: Given the root-cause investigation, When it concludes the bug is crew-side, Then a new file lands under docs/upstream-requests/ describing the reproduction and the exact scan-window behavior expected.
- AC-3: Given a cost report is written, When frontmatter is inspected, Then it carries the originating crew session/transcript id so dedup can corroborate reports by id rather than token-count equality alone.
- AC-4: Given the FEAT-204 dedup fingerprint, When this fix lands, Then it is NOT loosened to a tolerance band -- the existing exact-match dedup behavior in resolveCostReportUsd/sliceKeyOf is preserved and asserted by a regression test.

## Proposed slices (PM decomposition)

- SLICE-1: Root-cause spike: loop-side vs crew-side window reset (isolated landmine) (2 pts)
- SLICE-2: Fix + stamp session/transcript id into report frontmatter (2 pts)
- SLICE-3: Regression test: repeated same-session scan advances window (2 pts)
- SLICE-4: Upstream-request (if crew-side) + docs (2 pts)
