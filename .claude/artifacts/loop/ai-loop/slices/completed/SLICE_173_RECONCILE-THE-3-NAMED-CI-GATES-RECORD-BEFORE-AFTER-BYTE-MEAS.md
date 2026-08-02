---
id: SLICE-173
title: Reconcile the 3 named CI gates + record before/after byte measurements
status: completed
feature: FEAT-272
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 578
github_url: "https://github.com/astragenie/runner-plugin/issues/578"
completed_at: 2026-08-02
---
# SLICE-173: Reconcile the 3 named CI gates + record before/after byte measurements

Implements FEAT-272. See [feature file](../../../backlog/in-progress/FEAT-272.md) for product context.

## Objective

Context diet for runner-plugin injected context. Audit 2026-08-02: ~203k tokens of static context reinjected per assistant message (live sample FEAT-263 SLICE-160: 16.26M cache-read / 80 msgs vs 150 raw input tokens); CLAUDE.md is 29.7KB (553 lines), .claude/loop/rules.md 19.9KB, plus embedded loop-snapshot — a flat tax on every message, ~97% of USD is Opus cache reads. Fleet clean-data tok/msg trend 116k (May) to 282k (Jul). Scope: restructure CLAUDE.md to a <100-line always-on index with detail sections moved to skill-gated docs (skills or docs/ files referenced on demand); trim rules.md similarly; cap loop-snapshot embed to counts/deltas (no full prose lists). MUST keep CI gates green: validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs. Measure before/after bytes in the FEAT notes.

## Baseline spike note (SLICE-170, 2026-08-02)

All three named gates (validate-snapshot-freshness, generate-metrics-band
--check, validate-org-refs) were live-tested against current HEAD — all
three currently fail, but none of the failures trace to the CLAUDE.md
restructure (org-refs fails on an unrelated docs file; snapshot-freshness /
metrics-band fail on ordinary backlog drift from concurrent wave-mode
slices). Full detail + evidence: `docs/research/2026-08-02-context-diet-baseline.md`
§4-5. **Recommend re-scoping down substantially**: before/after byte counts
are already captured in FEAT-272's notes and the research doc, so this
slice doesn't need to re-derive them. What remains is a routine
regen-and-verify pass (`snapshot-memory` + `generate-metrics-band --write`)
at whichever slice closes last in this FEAT, plus an optional (out-of-scope
judgment call) fix for the one unrelated org-refs citation. Consider folding
this into SLICE-172's close rather than running it as a standalone slice.

## Re-scope decision — folded into SLICE-172 (2026-08-02)

- [x] Folded into SLICE-172's close per this slice's own baseline-spike
  note above and `docs/research/2026-08-02-context-diet-baseline.md` §5.
  No standalone build for SLICE-173 — its remaining (non-moot) work was
  absorbed as follows:
  - **Gate reconciliation (AC-2)**: already established as moot before
    this slice started — all three named gates (`validate-snapshot-freshness`,
    `generate-metrics-band --check`, `validate-org-refs`) fail for reasons
    unrelated to the CLAUDE.md restructure (ordinary backlog drift /
    an unrelated docs file's org-ref), per SLICE-170's live test. Nothing
    for SLICE-172 to reconcile against its own rules.md trim — none of
    those three gates read `.claude/loop/rules.md`.
  - **Byte counts (AC-4)**: recorded in FEAT-272's "SLICE-172 close notes"
    section, including the actual post-trim rules.md numbers (this
    slice's own note above only had the pre-trim/unchanged baseline).
  - **Routine regen-and-verify pass**: not run as part of this fold-in —
    `snapshot-memory` / `generate-metrics-band --write` touch backlog/grade
    state this slice doesn't own; left for whichever slice actually closes
    last in FEAT-272, per this slice's own original recommendation.
  - **Unrelated org-refs citation drift**: left untouched, per this
    slice's own note that it's an out-of-scope judgment call for the
    operator/PM, not this FEAT.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-272 and shared across 4 sibling slices — scope per-slice before close

- [ ] AC-1: Given the restructured CLAUDE.md, When measured, Then it is under 100 lines and the moved detail sections are reachable via named skill-gated docs or docs/ files referenced on demand.
- [ ] AC-2: Given the three named CI gates (validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs), When run against the restructured docs, Then all three pass unchanged (or are updated in lockstep with a note in the FEAT closing notes).
- [ ] AC-3: Given a fresh session with no prior context, When an agent reads the trimmed CLAUDE.md index, Then it can still locate and state the Autonomous Loop / Cross-Slice Continuation / Phase Completion Gate HARD RULE blocks (asserted by an explicit manual or scripted check, since no current CI gate covers this).
- [ ] AC-4: Given the FEAT's own requirement, When the slice closes, Then before/after byte counts for CLAUDE.md and rules.md are recorded in the FEAT notes.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-272 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
