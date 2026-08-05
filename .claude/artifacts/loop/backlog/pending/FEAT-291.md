---
id: FEAT-291
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
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