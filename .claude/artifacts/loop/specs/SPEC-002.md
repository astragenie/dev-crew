---
id: SPEC-002
type: prd
title: Reliability Hardening from Grade Followups
status: satisfied
priority: P1
target_release: null
created: 2026-06-04
updated: 2026-06-04
owner: null
derived_features: [FEAT-034, FEAT-035, FEAT-036]
---
## Objective

Close nine operational gaps surfaced from the `## Followups` sections of recent slice grades. Drive the `production_readiness` grade dimension from its current average of 0.825 up to **≥ 0.90** across the slices this SPEC produces.

## Why

Sixteen graded slices show a clear pattern: ship quality is good (avg 0.886, security 0.934, test_confidence 0.909) but `production_readiness` lags every other dimension at 0.825. Reading the `## Followups` and `## Surprises` blocks across SLICE-22..28 surfaces nine concrete operational gaps. They are not detection problems (so pattern-alerts integration is deferred), they are durability + observability + defensive-code gaps that block the autonomous loop from running fully unattended over longer horizons.

## In scope — nine issues

Grouped into three themes:

### Theme A — Marker hygiene + builder mid-cleanup stop (P1, autonomous_safe: false)

1. Pending-dispatch marker files accumulate at `.claude/artifacts/loop/pending-dispatch/` with no cleanup consumer. Surfaced in SLICE-23 grade Followups, recurred in SLICE-27 grade and SLICE-28 grade. Touches FEAT-028 SLICE-A dispatch machinery.
2. Builder agent stops mid-cleanup recurring across SLICE-23, SLICE-25, SLICE-26, SLICE-27. SLICE-27 grade explicitly flags it as worth a separate investigation: "crew:builder turn budget or context window is hitting a ceiling during final synthesis writes."
3. `auto-dispatch.jsonl` path is hardcoded to `<repoRoot>/.claude/artifacts/loop/auto-dispatch.jsonl` (SLICE-23 grade Followup). Blocks multi-workspace scenarios. Should become configurable via `loop.json`.

### Theme B — Cost telemetry project-name mismatch (P2, autonomous_safe: true)

4. Cost reports for SLICE-23 through SLICE-28 all show `usd: 0` because the cost detector resolves `sourceProject` to `C--work-mega-hero-crew-autonomous-loop` (legacy path) instead of `C--work-mega-loop`. Until this is fixed every cost-reduction or cost-trend conclusion is unreliable for the most recent slices.

### Theme C — Defensive parsers + test coverage gaps (P3, autonomous_safe: true)

5. SLICE-27 skipped a regression test for the doc-writer dispatch happy path because the fixture didn't satisfy `findFeatureById` + `feature_complete` invariants. Test is currently `test.skip` in `src/tests/slice-complete-docwriter.test.mts`.
6. FEAT-009 SLICE-22 PR autofix loop has no test for the `gh_unavailable` path (`ghExec throws`). Defensive gap.
7. FEAT-009 SLICE-22 `fetchPrStatus` parses `gh` JSON output with no schema validation. Could be hardened with a runtime check.
8. FEAT-028 SLICE-C architect output parser is fragile: it parses semicolon-separated titles. A future architect agent that returns structured prose would break it — SLICE-26 grade Surprises explicitly flags this.
9. `subagent_stop` payloads loading with null `agent_type` produced "unknown" rows in the SLICE-27 probe (SLICE-28 grade Followups). Surfaced as a side effect during the FEAT-031 fix. Payload normalization needs review.

## Out of scope

- DEC-006 (SubagentStop hook lifecycle understanding) is already accepted; no follow-up needed.
- Pattern-alerts integration for these issue categories. Deferred as a conditional follow-up FEAT only if any of issues #1, #2, or #8 recur in two or more of the next five grades after this SPEC satisfies.
- Backfilling historical zero-count agent reports or zero-cost reports.

## Acceptance criteria

- [ ] **AC-1**: SPEC decomposes into three FEATs (FEAT-A marker hygiene, FEAT-B cost telemetry, FEAT-C defensive). `loop:spec-decompose` invokes architect auto-dispatch to draft the decomposition. Human review on FEAT-A scope (it crosses dispatch machinery and ceremony).
- [ ] **AC-2**: All three FEATs ship to `backlog/done/`. `loop:spec-status` auto-rolls SPEC to `satisfied`.
- [ ] **AC-3**: Mean `production_readiness` dim score across the slices produced by FEAT-A + FEAT-B + FEAT-C grades is ≥ **0.90**. If below, SPEC stays `approved` (not `satisfied`); a follow-up FEAT captures the remediation gap.
- [ ] **AC-4**: For each of the nine issues, an artefact (test, code change, config option, or explicit decision-to-defer with rationale) is traceable in the closing grade or commit history of the FEAT that owned it.

## FEAT decomposition hint

| FEAT | Priority | Theme | Issues | Autonomous-safe | Notes |
|---|---|---|---|---|---|
| FEAT-A | P1 | Marker hygiene + builder cleanup | #1, #2, #3 | false | Architect pre-dispatch required. Touches `auto-dispatch.mts`, `slice-complete.mts`. Likely 2-3 slices: marker consumer + cleanup contract, builder turn-budget instrumentation, hardcoded-path config. |
| FEAT-B | P2 | Cost telemetry project-name | #4 | true | Path normalization in cost detector. Likely 1 slice. Unit test asserts `C--work-mega-loop` resolves correctly even when legacy alias appears in older sessions. |
| FEAT-C | P3 | Defensive (parsers + test coverage) | #5, #6, #7, #8, #9 | true | Five small additions in one FEAT — each is a unit test or a defensive validator. Likely 1-2 slices. Order: payload normalization (#9) first, parser hardening (#7, #8) next, test additions (#5, #6) last. |

## Conditional follow-up

After SPEC reaches `satisfied`, sample the next five graded slices. If any of issues #1, #2, or #8 recur in two or more of those grades' `## Surprises` or `## Followups`, open a new FEAT to integrate the recurrence-prone categories into the existing `pattern-alerts` machinery (extends FEAT-029 SLICE-A work). If recurrence is zero, close the SPEC loop.

## Risk

- FEAT-A is the highest-risk slice. It modifies machinery that the autonomous loop relies on. Reviewer ladder (Reviewer A: correctness on dispatch lifecycle, Reviewer B: regression risk on `/loop:slice complete` ceremony) is mandatory.
- FEAT-B is mechanical and zero-behavior-change risk.
- FEAT-C is defensive code only; no production-path risk.

## Testing

- Each FEAT brings unit tests for its own changes (per existing repo convention in `tests/` and `src/tests/`).
- SPEC-level test: a post-satisfaction script (or manual probe) recomputes the `production_readiness` mean over the SPEC's slices and verifies AC-3 before flipping status to `satisfied`.

## References

- Grades read: `.claude/artifacts/loop/grades/*-slice2[2-8]-grade.md`
- Decisions: DEC-001..DEC-006 in `.claude/artifacts/loop/decisions/`
- Pattern-alerts machinery: `src/scripts/lib/pattern-alerts.mts` (FEAT-029 SLICE-A)
- Dispatch machinery: `src/scripts/lib/auto-dispatch.mts` (FEAT-028 SLICE-A)
- Retrospective: `.claude/artifacts/loop/retrospectives/2026-06-04.md`
