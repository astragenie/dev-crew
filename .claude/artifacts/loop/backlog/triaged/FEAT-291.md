---
id: FEAT-291
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.45
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Preventive tech-debt: review-gate.mts:29 (REVIEW_SATISFIED/REVIEW_REJECTED) vs skills/workflow/review-gates/SKILL.md:62,89 prose vocabulary have no gate tying them together, and REVIEW_REJECTED has zero production callers (FEAT-281 tested-but-never-wired pattern) with a target consumer (a markdown skill) that structurally cannot import a TS constant. No live incident cited — the drift risk is real but latent, so customer_impact stays low. Fix is a single narrow drift test plus dropping or keeping the export with a real consumer; effort and risk both low, single-file blast radius. Related: FEAT-281, FEAT-283/SLICE-200."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Pin review-verdict vocabulary between review-gate.mts and SKILL.md
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given review-gate.mts exports REVIEW_SATISFIED and REVIEW_REJECTED, and skills/workflow/review-gates/SKILL.md lists the same verdict vocabulary in prose at lines 62 and 89, When a new test parses the vocabulary list out of SKILL.md, Then it asserts the parsed set matches REVIEW_SATISFIED union REVIEW_REJECTED exactly.", "AC-2: Given SKILL.md's vocabulary list is edited to add or remove a value without updating review-gate.mts, When the drift test runs, Then it fails, naming the mismatched value.", "AC-3: Given REVIEW_REJECTED currently has zero production callers (only its definition and a test reference it), When this slice completes, Then the export either has a real consumer (the new drift test) or the export keyword is dropped per repo convention (PASS_VERDICTS in failure-classifier.mts stays module-private until a second consumer exists).", "AC-4: Given ordinary prose edits to unrelated parts of SKILL.md, When the drift test runs, Then it does not false-fail — the parse is anchored narrowly to the vocabulary list only."]
    touches_files: [src/scripts/lib/review-gate.mts, skills/workflow/review-gates/SKILL.md, src/tests/review-gate-vocabulary-drift.test.mts]
---
## Description

Review-verdict vocabulary is duplicated between code and prose with no gate tying them together.

src/scripts/lib/review-gate.mts:29 defines REVIEW_SATISFIED and (as of SLICE-200) REVIEW_REJECTED as the authoritative accepted values for a review artifact's decision field. skills/workflow/review-gates/SKILL.md:62 and :89 independently list the same vocabulary in prose, and that prose is what a dispatched reviewer actually reads when deciding what to write. Nothing asserts the two agree.

They can drift silently in either direction. If the code set gains or loses a value, the skill keeps instructing reviewers to write the old vocabulary and their artifacts start failing the gate. If the skill is edited, the code silently rejects what it now tells reviewers to produce. The failure surfaces as a blocked slice close with a confusing message, which is the exact user-visible symptom FEAT-283 was filed to fix.

This also gives a genuine consumer to an export that currently has none. SLICE-200 exported REVIEW_SATISFIED and REVIEW_REJECTED justified by a future reviewer-dispatch brief template importing them. Reviewer confirmed via grep that production callers are zero — only the definition site and a test reference them, the FEAT-281 tested-but-never-wired pattern. The justification is not merely unrealized, it is unachievable as stated: the thing that needs the vocabulary is skills/workflow/review-gates/SKILL.md, a markdown file, which cannot import a TypeScript constant. Repo convention (noted by the reviewer) is that PASS_VERDICTS in failure-classifier.mts stays module-private until a second consumer exists, so the export should either be dropped or given a real consumer.

Acceptance direction: add a test that parses the vocabulary list out of skills/workflow/review-gates/SKILL.md and asserts it matches the exported REVIEW_SATISFIED and REVIEW_REJECTED sets exactly, failing when either side drifts. That makes the export load-bearing rather than aspirational and closes the drift risk in one move. Keep the parse narrow and anchored so ordinary prose edits to the skill do not false-fail it. If a drift gate is judged not worth it, the alternative is to drop the export keyword and accept the duplication, but that leaves the silent-drift risk in place.

Consider whether the same treatment is warranted for other code-vs-skill vocabulary pairs; this is likely not the only one.

Related: FEAT-281 (same defect class, this is a sixth instance with a concrete fix), FEAT-283 (whose SLICE-200 produced the export), SLICE-200.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Pin review-verdict vocabulary between review-gate.mts and SKILL.md (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given review-gate.mts exports REVIEW_SATISFIED and REVIEW_REJECTED, and skills/workflow/review-gates/SKILL.md lists the same verdict vocabulary in prose at lines 62 and 89, When a new test parses the vocabulary list out of SKILL.md, Then it asserts the parsed set matches REVIEW_SATISFIED union REVIEW_REJECTED exactly.
- AC-2: Given SKILL.md's vocabulary list is edited to add or remove a value without updating review-gate.mts, When the drift test runs, Then it fails, naming the mismatched value.
- AC-3: Given REVIEW_REJECTED currently has zero production callers (only its definition and a test reference it), When this slice completes, Then the export either has a real consumer (the new drift test) or the export keyword is dropped per repo convention (PASS_VERDICTS in failure-classifier.mts stays module-private until a second consumer exists).
- AC-4: Given ordinary prose edits to unrelated parts of SKILL.md, When the drift test runs, Then it does not false-fail — the parse is anchored narrowly to the vocabulary list only.
