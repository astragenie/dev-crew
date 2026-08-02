---
id: SLICE-161
title: "Root-cause spike: loop-side vs crew-side window reset (isolated landmine)"
status: pending
feature: FEAT-268
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 554
github_url: "https://github.com/astragenie/runner-plugin/issues/554"
---
# SLICE-161: Root-cause spike: loop-side vs crew-side window reset (isolated landmine)

Implements FEAT-268. See [feature file](../../../backlog/in-progress/FEAT-268.md) for product context.

## Objective

Fix cost-report scan window never resetting: Window Start stays frozen for days (evidence 2026-08-02 audit: five FEAT-250/SLICE-153 reports all Window Start 2026-07-03, totals monotonic 1.823B-1.831B tokens, each ~$3,233 — cumulative re-reports of the same spend). Per-slice cost scans must reset the window to the slice's own session boundary and stamp the crew session/transcript id into report frontmatter so dedup can corroborate on id, not token equality. Investigate whether the window bug is loop-side (slice-linker/crew-bridge.mts invocation args) or crew-side (cost-slice scan); if crew-side, fix what is fixable from loop and file an upstream request under docs/upstream-requests/. Do NOT loosen the FEAT-204 dedup fingerprint to a tolerance band — adversarial review confirmed that would merge distinct cumulative snapshots and undercount real spend.

## In scope

- Determine whether the frozen cost-report scan window originates
  loop-side (`crew-bridge.mts` invocation args) or crew-side (cost-slice
  scan), with file:line evidence.
- Reproduce the frozen-window symptom against real on-disk cost-report
  artifacts (not just theoretical code reading).
- Write a spike artifact stating the root cause and scoping guidance for
  SLICE-162/163/164.

## Out of scope

- Implementing the fix (SLICE-162).
- Writing the regression test (SLICE-163).
- Filing an upstream request (only applies if the conclusion is
  crew-side; this spike concluded loop-side — see spike artifact).

## Acceptance criteria

> WARNING: ACs copied from FEAT-268 and shared across 4 sibling slices — scope per-slice before close

- [x] AC-1: Given two consecutive `crew cost-slice` invocations against the same crew session issued a day apart, When each writes a cost report, Then the second report's Window Start advances past the first report's Window End (not frozen). **Spike scope**: reproduced and root-caused (loop never passes `--started-at`, so crew falls back to a `currentRun.startedAt` that's only rotated at slice start); actual behavior fix is SLICE-162's deliverable.
- [x] AC-2: Given the root-cause investigation, When it concludes the bug is crew-side, Then a new file lands under docs/upstream-requests/ describing the reproduction and the exact scan-window behavior expected. **N/A for this slice** — investigation concluded loop-side, so the upstream-request file is not created (condition not met). See "AC-2 disposition" in the spike artifact.
- [ ] AC-3: Given a cost report is written, When frontmatter is inspected, Then it carries the originating crew session/transcript id so dedup can corroborate reports by id rather than token-count equality alone. **Deferred to SLICE-162** — scoping notes in the spike artifact.
- [ ] AC-4: Given the FEAT-204 dedup fingerprint, When this fix lands, Then it is NOT loosened to a tolerance band -- the existing exact-match dedup behavior in resolveCostReportUsd/sliceKeyOf is preserved and asserted by a regression test. **Deferred to SLICE-163** — location confirmed (`src/scripts/lib/memory-snapshot.mts:124,157`) for that slice's regression test.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-268 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
