---
id: FEAT-288
status: done
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-05
depends_on: []
slices: [SLICE-203, SLICE-204]
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.7
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-05
autonomous_safe: true
triage_notes: "This is a live, confirmed defect gating the wall-clock of the entire open-slice program: every slice created since SLICE-181 shipped presents to the wave planner as if it declared nothing, forcing sequential dispatch. The fix is a small, well-understood parser gap (accept inline arrays, not just block lists) with a clear acceptance-test shape (round-trip through the real writer and reader, not a hand-authored fixture — which is exactly what let this ship). High customer_impact and strategic_alignment (wave dispatch is a core capability) combined with low effort and moderate technical_risk (touching a parser, but additively) computes to P1 under the impact>=0.7 AND alignment>=0.6 rule. autonomous_safe holds because none of the three disqualifying dimensions exceed 0.6 and the FEAT will carry inline ACs."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Teach readTouchesFiles to parse inline-array YAML + real writer/reader round-trip test
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["GIVEN a slice frontmatter's touches_files field written as an inline YAML array (the writer's actual output), WHEN readTouchesFiles parses it, THEN it returns the declared paths with a non-missing confidence tier instead of confidence \"missing\".", "GIVEN a slice frontmatter's touches_files field written as a block-style YAML list (the previously-supported form), WHEN readTouchesFiles parses it, THEN it continues to return the declared paths with no regression.", "GIVEN the real writer (createSlice) creates a slice declaring touches_files, WHEN the real reader (readTouchesFiles) is invoked against the resulting file in one round-trip test, THEN the declared paths survive unchanged end to end."]
  - id_suffix: -SLICE-2
    title: Re-verify FEAT-276 AC-4 close record; promote missing-confidence WARN to ERROR
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["GIVEN FEAT-276 AC-4 was recorded as satisfied against a reader that could not parse the writer's own output, WHEN this fix lands, THEN FEAT-276's close record is re-verified against real slices (e.g. SLICE-187, SLICE-183) and corrected if the original satisfaction claim does not hold.", "GIVEN the parser fix removes the populated-but-unparseable case for the real writer, WHEN validate-slice-touches-files.mts runs, THEN a \"missing\" confidence result for a slice that declared touches_files is promoted from WARN to ERROR."]
started_at: 2026-08-05
github_issue: 625
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/625"
slices_complete: [SLICE-203, SLICE-204]
completed_at: 2026-08-05
---
## Description

touches_files round-trip is broken: the writer emits inline YAML arrays, the only reader parses block-style lists only, so FEAT-276 AC-4 is non-functional end to end and wave planning silently degrades.

Discovered 2026-08-04 by builder-187 while building an unrelated slice, then verified directly.

Evidence. src/scripts/lib/backlog-store/slice-store.mts:237 (the FEAT-276 AC-4 code, shipped earlier the same day via SLICE-181) sets frontmatter.touches_files = touchesFiles, which the frontmatter serializer emits as an inline array: touches_files: [hooks/report-gate.mjs, .claude-plugin/hooks/hooks.json, src/tests/report-gate.test.mts]. Calling readTouchesFiles (src/scripts/lib/wave/touches-files.mts) against those very files returns {paths: [], confidence: "missing"}. Reproduced against SLICE-187 and SLICE-183; validate-slice-touches-files.mts emits the same WARN for 9 slices — every slice created by today's /runner:start batch, i.e. every slice the new writer has produced since it landed.

Why it matters. touches_files exists to feed wave-mode conflict packing. packWave treats confidence: "missing" as a special case: such candidates cannot be packed alongside others and are deferred to solo dispatch (the code path FEAT-276/SLICE-179 rewrote to stop one missing-confidence candidate from poisoning the whole wave). So every slice created since the writer landed presents to the planner exactly as if it had declared nothing, and parallel wave dispatch degrades toward sequential for all of them. FEAT-276 was closed as done on 2026-08-04 with AC-4 recorded as satisfied; the field is genuinely written, but its only consumer cannot read it, so the feature does not exist at runtime.

Defect class. This is the tested-but-never-wired family (FEAT-281) in its writer/reader-mismatch variant, and a near-exact repeat of FEAT-282's two-producers-one-schema shape. Both halves are individually correct and individually tested. Nothing tests the round trip, so both test suites stay green while the composed behavior is dead. The module comment at slice-store.mts:234-236 even anticipates the missing tier as an acceptable fallback for an absent value, which is exactly why a populated-but-unparseable value reads as normal rather than as a bug.

Acceptance direction. Teach readTouchesFiles to accept inline-array frontmatter as well as block-style lists, since the writer legitimately produces the inline form and both are valid YAML. Add a round-trip test that goes through the real writer (createSlice) and the real reader (readTouchesFiles) in one test and asserts the declared paths survive, rather than testing either side against a hand-authored fixture -- a hand-authored fixture is what let this ship, because whoever wrote the reader's tests wrote block-style fixtures by hand and whoever wrote the writer never read one back. Then re-verify FEAT-276 AC-4 against real slices and correct its close record if warranted. Consider promoting validate-slice-touches-files.mts's WARN to an ERROR once the parser is fixed, since after that a missing value on a slice that declared one is unambiguously a bug rather than a parser limitation.

Related: FEAT-276 (AC-4, whose close should be revisited), FEAT-281 (the defect class), FEAT-282 (the same producer/consumer schema-mismatch shape), SLICE-179 (the packWave missing-confidence handling this degrades into).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- GIVEN a slice frontmatter's touches_files field written as an inline YAML array (the writer's actual output), WHEN readTouchesFiles parses it, THEN it returns the declared paths with a non-missing confidence tier instead of confidence "missing".
- GIVEN a slice frontmatter's touches_files field written as a block-style YAML list (the previously-supported form), WHEN readTouchesFiles parses it, THEN it continues to return the declared paths with no regression.
- GIVEN the real writer (createSlice) creates a slice declaring touches_files, WHEN the real reader (readTouchesFiles) is invoked against the resulting file in one round-trip test, THEN the declared paths survive unchanged end to end.
- GIVEN FEAT-276 AC-4 was recorded as satisfied against a reader that could not parse the writer's own output, WHEN this fix lands, THEN FEAT-276's close record is re-verified against real slices (e.g. SLICE-187, SLICE-183) and corrected if the original satisfaction claim does not hold.
- GIVEN the parser fix removes the populated-but-unparseable case for the real writer, WHEN validate-slice-touches-files.mts runs, THEN a "missing" confidence result for a slice that declared touches_files is promoted from WARN to ERROR.

## Proposed slices (PM decomposition)

- SLICE-1: Teach readTouchesFiles to parse inline-array YAML + real writer/reader round-trip test (1 pts)
- SLICE-2: Re-verify FEAT-276 AC-4 close record; promote missing-confidence WARN to ERROR (1 pts)
## Correction — 2026-08-05, scoring premise was wrong

The demand evidence above, and the P1 score resting on it, overstated this
FEAT's urgency. Corrected after builder-203 challenged the premise and I
verified independently.

**Claimed:** all 10 (later 28) currently-pending slices declare `touches_files`
but degrade to `confidence: "missing"` because the reader cannot parse the
writer's inline-array output, so this FEAT gates parallel wave dispatch for the
whole open-slice program.

**Measured:** 0 of 28 pending slices carry a `touches_files:` frontmatter key at
all. 0 FEATs declare `touches_files` inside a `proposed_slices` entry. SLICE-187
(completed) is the only file in the repo that has one — and it is the single
case the original repro was run against.

**Where the error came from:** a slice that declares nothing and a slice that
declares something unparseable both report `confidence: "missing"`. I observed
the symptom across the pending set and attributed all of it to the parser
without checking whether the key was present. Inference from symptom, not
verification — the same failure this FEAT's own body criticizes.

**What remains true:** the parser defect is real and was proven by builder-203's
pre-fix failure (3 tests, `Expected "declared" / Received "missing"`, green
after). A slice that DOES declare `touches_files` is silently downgraded today.
The fix is preventive rather than remedial: it changes the confidence tier of no
on-disk slice right now, and takes effect for slices materialized going forward.

**What actually gates wave parallelism** is a producer gap, not this parser —
see FEAT-292. `agents/pm.md:45` instructs the PM that `touches_files` is
"conservative-only ... When unsure, omit the field entirely; it is never
required." The PM therefore always omits it, so the wave planner never receives
data regardless of whether the reader works. Same producer/consumer shape as
FEAT-290.

Re-scoring is warranted: customer_impact 0.75 was justified by a gating claim
that does not hold. The defect-class value (silent writer/reader mismatch on a
hot path) still supports keeping this fixed, at lower urgency.
