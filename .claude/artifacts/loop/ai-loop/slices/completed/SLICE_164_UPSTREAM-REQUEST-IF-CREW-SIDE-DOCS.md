---
id: SLICE-164
title: Upstream-request (if crew-side) + docs
status: completed
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
github_issue: 560
github_url: "https://github.com/astragenie/runner-plugin/issues/560"
completed_at: 2026-08-02
---
# SLICE-164: Upstream-request (if crew-side) + docs

Implements FEAT-268. See [feature file](../../../backlog/in-progress/FEAT-268.md) for product context.

## Objective

Fix cost-report scan window never resetting: Window Start stays frozen for days (evidence 2026-08-02 audit: five FEAT-250/SLICE-153 reports all Window Start 2026-07-03, totals monotonic 1.823B-1.831B tokens, each ~$3,233 — cumulative re-reports of the same spend). Per-slice cost scans must reset the window to the slice's own session boundary and stamp the crew session/transcript id into report frontmatter so dedup can corroborate on id, not token equality. Investigate whether the window bug is loop-side (slice-linker/crew-bridge.mts invocation args) or crew-side (cost-slice scan); if crew-side, fix what is fixable from loop and file an upstream request under docs/upstream-requests/. Do NOT loosen the FEAT-204 dedup fingerprint to a tolerance band — adversarial review confirmed that would merge distinct cumulative snapshots and undercount real spend.

## Re-scope note (2026-08-02)

The root-cause spike (SLICE-161, `docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md`)
concluded the window-freeze bug was **loop-side**, not crew-side: crew's
own scan/rotation logic was confirmed correct (both in the `dev-team`
source checkout and the installed `crew@0.67.0` plugin cache). The fix
landed loop-side in SLICE-162 (per-slice cost-scan cursor +
loop-side session-id stamp) and the regression suite landed in SLICE-163.
That makes this slice's original "if crew-side, file an upstream request"
branch **moot** for the window-freeze bug itself — there is nothing
crew-side to file for it. The remaining honest deliverable for this slice
is a docs close-out: append a "Resolution" section to the FEAT-268 body
tying the four sibling slices together, and record the one adjacent
nice-to-have crew-side ask the spike surfaced (crew's cost-report
frontmatter has no native session/transcript field) as still-open and
not yet filed under `docs/upstream-requests/` — see the FEAT-268 body's
"Resolution" section for the full note, including why it must not be
conflated with the unrelated FEAT-273/SLICE-175 upstream ask (citylive
`sourceProject` slugification bug).

## In scope

- Re-scope this slice file (this note) and the AC-2 disposition below.
- Append a "Resolution" section to the FEAT-268 body (body prose only).

## Out of scope

- Filing any `docs/upstream-requests/` file (none is warranted for the
  window-freeze bug; the adjacent session-id-field ask is a separate,
  not-yet-filed nice-to-have, tracked in the FEAT-268 body note only).
- Any source-code or frontmatter edits.

## Acceptance criteria

> WARNING: ACs copied from FEAT-268 and shared across 4 sibling slices — scope per-slice before close. This slice (SLICE-164) is scoped to AC-2 only; AC-1/AC-3/AC-4 were satisfied by SLICE-162/SLICE-163 and are left unchecked here since they are not this slice's deliverable.

- [ ] AC-1: Given two consecutive `crew cost-slice` invocations against the same crew session issued a day apart, When each writes a cost report, Then the second report's Window Start advances past the first report's Window End (not frozen). _(satisfied by SLICE-162; not this slice's deliverable)_
- [x] AC-2 (re-scoped): Given the root-cause investigation, When it concluded the bug was loop-side (not crew-side) — per the spike's "AC-2 disposition" section — Then no upstream-request file is required for the window-freeze bug; this slice's deliverable is instead the docs close-out (FEAT-268 body "Resolution" section) documenting that disposition and the one adjacent open nice-to-have.
- [ ] AC-3: Given a cost report is written, When frontmatter is inspected, Then it carries the originating crew session/transcript id so dedup can corroborate reports by id rather than token-count equality alone. _(satisfied by SLICE-162; not this slice's deliverable)_
- [ ] AC-4: Given the FEAT-204 dedup fingerprint, When this fix lands, Then it is NOT loosened to a tolerance band -- the existing exact-match dedup behavior in resolveCostReportUsd/sliceKeyOf is preserved and asserted by a regression test. _(satisfied by SLICE-163; not this slice's deliverable)_

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
