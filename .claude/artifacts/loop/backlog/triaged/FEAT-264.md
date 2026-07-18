---
id: FEAT-264
status: triaged
priority: P1
category: methodology
target_release: null
created: 2026-07-17
updated: 2026-07-17
depends_on: []
slices: []
derived_from: null
tags: [methodology, workflow, qa]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-07-17
autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: PM emits ACs for every triaged FEAT (drop P0/P1-only gate)
    points: 1
  - id_suffix: -SLICE-2
    title: loop.json qa_gate schema key + validator + back-compat default
    points: 2
  - id_suffix: -SLICE-3
    title: Pre-build context-isolated qa-expert test-plan dispatch in ceremony
    points: 2
  - id_suffix: -SLICE-4
    title: test-automator red/green wiring + goalpost-lock enforcement
    points: 2
  - id_suffix: -SLICE-5
    title: Grade gate — testability < 0.80 blocks runner:close (config-scoped)
    points: 2
triage_notes: "P1 (impact 0.75 >= 0.7 AND alignment 0.8 >= 0.6, computeCompositePriority rule 2). customer_impact 0.75: kb productivity audit F4 (High severity) -- no qa_gate key in any of 23 loop.json files, confirmed absent here too; direct operator-named #1 QA pain point; external anchor shows independent test authors raise test-gen accuracy 61%->87.8% (kb R4 citation). Capped below 0.8 because rollout is explicitly opt-in/pilot-first (memory repo) rather than measured cross-repo demand, and the current post-build qa-expert-at-ship workaround is functional, just late (rework-class cost, not a blocking break). effort_estimate 0.65 (bottom of 0.6-0.85 band -> 8 points via pm-effort-mapper, triggering the FEAT-168 decomposition gate): cross-module reach (agents/pm.md AC-gating condition, ceremony/dispatch insertion, loop.json schema+validator, runner:close grade-gate logic, docs) with no external dependency; no exact cost analog found (Framework 5) -- nearest shape is FEAT-253 CompositeProvider (new config precedence + fan-out orchestration, P2, technical_risk 0.5) which was narrower (no ceremony-timing change, no grading-gate change); single-slice cost analogs in this repo run $140-220 (FEAT257/SLICE159, FEAT215/SLICE140), consistent with a 9-point/5-slice decomposition landing well above single-slice cost. strategic_alignment 0.8: directly strengthens the core product mission (\"autonomous slice-based development\" -- independent test authority before build is a reliability guarantee central to that promise). technical_risk 0.6 (bottom of 0.6-0.8 band per rubric's 'cross-module reach' criterion -- new pre-build dispatch pattern touching 4+ systems; mitigated but not downgraded by the config-default backward-compat path, since cross-module reach is an explicit band-6-0.8 trigger independent of rollback ease); pre-mortem mandatory (risk >= 0.6 and priority P1), see risks[]. dependency_depth 0.15: depends_on=[], fully independent, self-contained in runner-plugin; the 23-repo rollout is explicitly deferred opt-in work outside this FEAT's scope, not a blocker of it. autonomousSafe=false per computeAutonomousSafe: effort_estimate 0.65 > 0.6 trips the threshold (technical_risk 0.6 does not, since the check is strict >). Decomposed per Framework 6 option 1 (5 slices, sum=9 pts >= effort_points=8, each <=2 pts per runner#393); SLICE-3 (context-isolation boundary) and SLICE-4 (goalpost-lock enforcement) isolated into separate slices per decomposition policy (a) since each is an independent design-sensitive landmine, not mechanical repetition. No overlapping FEAT found (grepped backlog/ for FEAT-263 cross-refs: none). Weak-dimension check (Framework 4): last 5 grades (2026-06-11) all >=0.80 aggregate (0.829-0.886); most recent per-dimension grades (2026-07-10, FEAT250/251/252/256/257) show reliability 0.86-0.92 and observability 0.85-0.86, both >=0.80 -- no weak dimension currently open. Notably `testability` itself is absent from every grade file since 2026-06-04, independently corroborating this FEAT's own claim (scope item d) that the dimension is recorded inconsistently and never gates."
github_issue: 527
github_url: https://github.com/astragenie/runner-plugin/issues/527
---
# FEAT-264: pre-build QA gate — independent test authority before builder dispatch

> Renumbered from FEAT-263 on 2026-07-18: the id was already consumed by the shipped
> dispatch-marker feature (`done/FEAT-263.md`, cited in CLAUDE.md as FEAT-263 T1/T5/T6).
> Collision class tracked by DEC-079. GitHub mirror: issue #527.

## Problem

QA currently runs post-build only. Evidence from the 2026-07 productivity audit
(kb `12-research/productivity-2026-07/README.md`, finding F4):

- No `qa_gate` key exists in any of the 23 `.claude/loop.json` files across the
  ecosystem; the only gate-related key anywhere is `phaseGateArtifactDir` (an
  output path, present in 4 repos).
- `runner:pm` writes Given-When-Then ACs only for P0/P1 FEATs (or `--deep`/`--spec`);
  most FEATs reach the builder with no testable ACs.
- `crew:qa-expert` is dispatched at `/crew:ship` — after the code exists. Test
  authority is never independent of implementation.

External anchor: independent test-writing agents with no knowledge of the
implementation raised test-generation accuracy from 61% to 87.8%; multi-agent
test-first hit 96.3% pass@1 vs 67% single-agent
(https://medium.com/@shivam.agarwal.in/claude-code-pair-programming-sub-agents-that-tdd-with-minimal-supervision-904e586ed009).
Sub-agent context isolation makes this free — the test author must be a separate
dispatch that reads only the AC/spec, never the diff.

## Proposed scope

a) **runner:pm** emits Given-When-Then ACs for **every** triaged FEAT (drop the
   P0/P1-only condition).
b) **Slice ceremony** (`runner:start` / orchestration path) inserts, between
   slice creation and builder dispatch: context-isolated `crew:qa-expert`
   dispatch that reads FEAT ACs only and writes
   `.claude/artifacts/crew/validations/<slice>-test-plan.md`; then
   `crew:test-automator` implements failing tests from the plan (red); builder
   is dispatched with "make these tests pass" (green). Builder never edits the
   test plan; the `/crew:ship` qa-expert pass validates against the SAME plan
   (no goalpost-moving).
c) **Config:** new `loop.qa_gate` key in `loop.json` schema
   (`"pre-build" | "post-build" | "off"`, default preserves current behavior)
   so wave/auto modes enforce (b) per repo.
d) **Grade gate:** testability dimension < 0.80 fails the slice (currently
   recorded but never gating) — behind the same config key.

## Acceptance criteria (Given-When-Then)

- AC-1 (happy path — PM ACs universal): Given a FEAT with no Given-When-Then
  ACs is triaged via `runner:triage` regardless of its computed
  `compositePriority` (e.g. P3), When PM scoring completes, Then the FEAT
  file's body contains an "Acceptance criteria (Given-When-Then)" section
  with at least 3 ACs authored inline in the same triage response —
  evidenced by removing the current P0/P1-only gate condition in
  `agents/pm.md` § "Priority gating (caller-enforced)" and a test asserting
  ACs are emitted for a P3-scored FEAT fixture.
- AC-2 (backward-compatible default — edge/negative): Given a repo's
  `.claude/loop.json` has no `qa_gate` key (the current state confirmed in
  this repo and, per the kb audit, all 23 adopter repos), When a slice
  starts via `runner:start`/the orchestration path, Then ceremony behavior
  is unchanged from pre-FEAT-264 behavior — no pre-build qa-expert dispatch,
  no test-plan artifact required — evidenced by a regression test asserting
  slice-start ceremony output is identical with and without this FEAT's code
  when `qa_gate` is absent.
- AC-3 (pre-build dispatch, context isolation — headline correctness
  requirement): Given `loop.qa_gate: "pre-build"` is set in
  `.claude/loop.json`, When a slice is created via the orchestration path
  and reaches the point immediately before builder dispatch, Then a
  context-isolated `crew:qa-expert` dispatch runs that receives only the
  FEAT's Given-When-Then ACs (not the diff, not implementation code) and
  writes `.claude/artifacts/crew/validations/<slice-id>-test-plan.md` before
  any builder-dispatch event is recorded in `events.jsonl` — evidenced by an
  event-ordering test (test-plan-write timestamp < builder-dispatch
  timestamp) and a fixture asserting the qa-expert prompt payload excludes
  diff/implementation content.
- AC-4 (red/green + goalpost-lock — no moving the target): Given the
  test-plan artifact from AC-3 exists, When `crew:test-automator` implements
  the failing tests from the plan and the builder is subsequently dispatched
  with "make these tests pass," Then the builder's tool-use trace contains
  no Write/Edit call targeting the test-plan artifact path, and the
  `/crew:ship` qa-expert validation pass references that SAME artifact path
  rather than generating a new one — evidenced by a test asserting the
  builder prompt explicitly forbids editing the plan path, and a fixture
  asserting `/crew:ship`'s qa-expert invocation reuses the stored artifact
  path from slice frontmatter/state.
- AC-5 (grade gate, config-scoped — failure path): Given a slice grade with
  `testability < 0.80` and the owning repo's `loop.qa_gate` is
  `"pre-build"`, When `runner:close` runs, Then the close is blocked with a
  FIX badge instead of completing — evidenced by a test asserting
  `runner:close` emits the FIX badge for a fixture grade with
  `testability: 0.75` under `qa_gate: "pre-build"`, AND a companion test
  asserting the SAME fixture grade does NOT block close when `qa_gate` is
  `"off"` or absent (distinguishes config-gated enforcement from
  unconditional enforcement).
- AC-6 (edge — `"post-build"` preserves today's ship-time-only behavior):
  Given `loop.qa_gate: "post-build"` explicitly set, When a slice runs, Then
  no pre-build qa-expert/test-plan dispatch occurs and `/crew:ship`'s
  existing post-build qa-expert pass runs exactly as it does today —
  evidenced by a test asserting ceremony behavior under `"post-build"`
  matches the `qa_gate`-absent case from AC-2.

## Proposed slices (PM decomposition)

effort_points = 8 (pm_effort_estimate 0.65 via pm-effort-mapper) triggers the
FEAT-168 decomposition gate. Sum of points below = 9 (>= 8); each entry <= 2
points per runner#393. SLICE-3 and SLICE-4 are each isolated as their own
slice per decomposition policy (a) — the context-isolation boundary (AC-3)
and the goalpost-lock enforcement (AC-4) are independent design-sensitive
landmines, not mechanical repetition, and must not be absorbed into a
"happy path" slice.

- SLICE-1: PM emits ACs for every triaged FEAT, drop P0/P1-only gate (1 pt) — AC-1
- SLICE-2: `loop.qa_gate` schema key + validator + back-compat default (2 pts) — AC-2, AC-6
- SLICE-3: Pre-build context-isolated qa-expert test-plan dispatch (2 pts, landmine) — AC-3
- SLICE-4: test-automator red/green wiring + goalpost-lock enforcement (2 pts, landmine) — AC-4
- SLICE-5: Grade gate — testability < 0.80 blocks runner:close, config-scoped (2 pts) — AC-5

## Risks (pre-mortem — mandatory: technical_risk 0.6 and priority P1)

1. **Failed review/validation two weeks from now — most likely cause:** the
   goalpost-lock enforcement in SLICE-4/AC-4 is the weak point. "Builder
   never edited the test plan" is hard to enforce mechanically — tool-trace
   inspection for a specific file path is fragile across agent SDK/harness
   versions, and a reviewer is likely to flag it as soft/unverifiable rather
   than a hard gate. Treat AC-4's evidence bar (explicit trace assertion) as
   non-negotiable at review time, not a nice-to-have.
2. **Merged and broke the loop — rollback requirement:** for the ~22 repos
   that never set `qa_gate: "pre-build"`, rollback is a clean `git revert`
   (default preserves current behavior, confirmed by AC-2/AC-6). For the
   pilot repo (`memory`, per this FEAT's own rollout note) that opts in,
   rollback additionally requires flipping `qa_gate` back to `off`/absent in
   that repo's own `loop.json` — a one-line config revert, not a migration,
   but a second file in a different repo that must be reverted in lockstep
   with this repo's revert.
3. **Existing test that would NOT catch a regression here:** none of the
   current grade/cost/decision test suites assert cross-event timestamp
   ordering in `events.jsonl`. A regression that silently dispatches the
   builder before the test-plan artifact exists (defeating AC-3's entire
   purpose) would pass every other existing suite untouched.

Other risks: (a) slower slice starts — named directly in the kb R4
recommendation itself; every pre-build-gated slice now blocks on an extra
qa-expert + test-automator round-trip before the builder can start, and
single-slice cost analogs in this repo already run $140-220 (FEAT257/SLICE159,
FEAT215/SLICE140) before this addition. (b) context-isolation leak risk — if
the qa-expert dispatch in SLICE-3 ever sees the diff or implementation code,
the entire "independent test authority" value proposition (the external
anchor's 61%->87.8% evidence) collapses back to today's post-hoc quality;
this is why SLICE-3 is isolated rather than folded into SLICE-4.

## Notes

- Rollout: land schema + ceremony in runner-plugin first; adopters opt in
  per-repo by adding the key. Suggest piloting on `memory` (highest loop
  activity: 4,502 events) before defaulting.
- Related: kb audit R5 (authentic has zero E2E) is a separate per-repo ticket,
  not part of this FEAT.
