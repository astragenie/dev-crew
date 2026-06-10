---
id: FEAT-025
status: done
priority: P1
category: infrastructure
target_release: null
created: 2026-06-02
updated: 2026-06-03
depends_on: [FEAT-006]
slices: [SLICE-11, SLICE-19, SLICE-20]
slices_complete: [SLICE-11, SLICE-19, SLICE-20]
slices_remaining: []
derived_from: null
triage_notes: reopened — slice complete prematurely rolled FEAT to done after SLICE-A (dry-run walker primitive); SLICE-B (real dispatch + auto-commit) and SLICE-C (stop conditions + flip default to ship autonomous_safe=false items) still owed
started_at: 2026-06-02
completed_at: 2026-06-03
github_issue: 49
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/49"
---
# FEAT-025: /loop:auto — autonomous backlog walker that ships every FEAT/slice until exhaustion or hard halt

Walk the entire triaged backlog end-to-end without per-slice human approval, including features marked autonomous_safe=false, with compensating discipline (Plan Mode pre-flight, risk gates, auto-pivot to /crew:fix, escalation on repeat failure).

Note: requested as P0 by user. Loop backlog uses P1/P2/P3 today; treating as P1 (highest available tier) + escalated_to_human:false until P0 tier is added.

## Why

- Today the loop pauses on every autonomous_safe=false FEAT — and all 9 current triaged FEATs are autonomous_safe=false. So the loop is effectively manual.
- Need one command that walks the entire backlog autonomously while preserving safety primitives.
- Goal: unattended overnight runs that ship multiple FEATs with cost + grade + escalation telemetry, surfacing only on hard halts.

## Defaults (user-confirmed 2026-06-02)

1. Run until backlog exhaustion. Accept --max-features N to cap.
2. Auto-commit + push after each slice complete.
3. Mimic /loop:start first-action ceremony (read mandatory docs, run first-response checklist).
4. Escalated FEATs move to new .claude/artifacts/loop/backlog/escalated/ directory.
5. Implemented as P1 FEAT (not SPEC); ACs below.

## Architecture (from plan 2026-06-02)

### Step 1: pre-flight sweep
- Run /loop:pm-triage to refresh scores
- Run /loop:stop-check
- Abort if escalated_to_human or blocked badges present

### Step 2: backlog walker loop
For each iteration:
- a. Pick next triaged FEAT by: highest composite_score, ties by priority then pm_strategic_fit
- b. If autonomous_safe=false → run Plan Mode pre-flight (FEAT-006 adapted)
  - codebase research → plan-research-<slice>.md artifact
  - run AC linter; if vague → pivot to /crew:fix to rewrite AC
  - run risk gate (table below)
- c. Standard ceremony: slice from-feature → slice start → dispatch /crew:build (HARD RULE)
- d. Post-dispatch verification (FEAT-014 verification-before-completion skill)
  - if grade avg < 0.70 OR review = needs_fix → pivot through /crew:fix
  - if 3 consecutive fix attempts fail → move FEAT to escalated/, halt
- e. slice complete + auto-commit + push
- f. Stop-condition re-check

### Step 3: run summary
- FEATs shipped / blocked / escalated counts
- Total cost + per-FEAT breakdown
- Grade trend
- DEC-TBD auto-resolutions list for retroactive PM review

## Risk gate (autonomous_safe=false FEATs only)

| PM signal | Auto-mitigation |
|---|---|
| Vague AC | Dispatch /crew:fix to rewrite AC, re-run AC linter |
| pm_implementation_confidence < 0.5 | Dispatch crew:researcher first; unknowns surface → escalate |
| pm_risk_level >= 0.7 | Require SPEC; if missing → dispatch /loop:spec-add |
| ceremony hook change | Snapshot affected files; require pre/post diff in review artifact |
| depends_on non-empty + deps unfinished | Skip, pick next |
| deferred: true | Honor defer; skip with note |

## Hard halt conditions (loop MUST stop, surface to user)

1. 3 consecutive slice fails in same FEAT → move to escalated/, halt
2. Cost overrun (loop.json costStopThreshold, currently $15)
3. High-severity cost-advise alert (compaction:10+, fails:20%+)
4. Pattern alert from /loop:retrospective (grade trend < 0.70 over last 5)
5. crew:escalated_to_human badge written
6. FEAT requires secrets/credentials/external API not yet wired
7. FEAT scope mentions production deploy → always require human approval

## Implementation decomposition (suggested slices)

- SLICE-A: Backlog walker + auto-decisions for autonomous_safe=true items only (proves loop primitive) — low risk
- SLICE-B: Plan Mode pre-flight + risk gate + /crew:fix auto-pivot (FEAT-006 conditional half) — medium risk
- SLICE-C: Stop-condition wiring + cost cap + escalation flag → flip default to ship autonomous_safe=false items — high risk

Ship SLICE-A first as proof. SLICE-B/C only after SLICE-A runs cleanly on 2+ real FEATs.

## Telemetry

.claude/artifacts/loop/auto-runs/<TS>-auto-run.md capturing:
- FEATs attempted/shipped/escalated
- Per-slice cost + grade
- Auto-decisions (DEC-TBD log)
- Stop reason if halted early
- Recommended next action

## Acceptance criteria

- AC1: /loop:auto walks triaged backlog without prompting user when all items autonomous_safe=true
- AC2: For autonomous_safe=false items, Plan Mode pre-flight runs and produces plan artifact under .claude/artifacts/loop/plans/
- AC3: All 7 hard halt conditions correctly stop the loop with structured reason in run summary
- AC4: Run summary artifact written under .claude/artifacts/loop/auto-runs/<TS>-auto-run.md
- AC5: Cost cap from loop.json.costStopThreshold respected; halts when crossed
- AC6: 3-fail-per-FEAT auto-escalation works — failing FEAT moves to escalated/ after 3rd fix attempt
- AC7: All existing tests pass + lint clean
- AC8: --max-features N flag caps iterations regardless of backlog size
- AC9: Auto-commit + push fires after each slice complete; commit message includes FEAT id + slice id

## Depends on

- FEAT-006 (Plan Mode adapted) — SLICE-B requires the pre-flight primitive
- FEAT-014 (verification-before-completion skill) — already shipped, used in step 2d

## Out of scope

- /loop:auto-pr (separate FEAT later — autonomous PR-comment-driven loop, currently FEAT-009 deferred)
- Multi-repo orchestration
- Cross-session resumption (existing wake-up brief handles this)