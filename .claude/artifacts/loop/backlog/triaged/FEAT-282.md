---
id: FEAT-282
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.75
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "Contained, well-diagnosed bugfix-plus-wiring task with root cause already identified (two legitimate producers, one validator). Lower effort and lower customer impact than FEAT-283 because the validator is currently orphaned (provides zero protection but also blocks nothing today), and lower strategic urgency than FEAT-281 because it fixes one gate rather than preventing a class. P2 reflects real but non-urgent technical debt."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Discriminated-union schema fix for learnings validator (key-shape vs kind-shape)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Wire learnings validator into CI/pre-push and renumber CLAUDE.md gate list
    points: 1
    estimated_tokens: 60000
---
## Description

validate-learnings-schema.mts fails against real learnings.jsonl data and is wired into nothing. Discovered 2026-08-04 while running the full validator sweep before a push. Running 'bun ./src/scripts/validate-learnings-schema.mts --repo .' against this repo's own .claude/artifacts/loop/learnings.jsonl reports 14 errors across 7 lines (6,7,8,9,60,64,65), all of the form 'missing/invalid key' and 'missing/invalid insight'. Root cause is a two-producer schema mismatch, not corrupt data: the validator enforces the shape written by 'loop.mts learnings log' ({id, timestamp, key, insight, confidence, sliceId, status, scope, agentType}), but a second producer writes a completely different record shape -- e.g. line 6 is {kind: failure, ts, agent, severity, tags, summary, source: review_fail}, emitted by the review-failure capture path. Both shapes coexist legitimately in one append-only file; only one has a validator. Verified this is NOT new drift: line 6 is byte-identical 8 commits back, so the file has been failing this validator for a long time. It went unnoticed because validate-learnings-schema.mts is referenced by NOTHING -- it is absent from .github/workflows/ and from src/scripts/pre-push-validate.mts, and it is not among the 18 gates enumerated in CLAUDE.md's CI gates section. An orphan validator that no pipeline runs provides zero protection while appearing to. Fix options, in preference order: (a) teach the validator the union of both legitimate record shapes (discriminate on the presence of 'kind' vs 'key') and then WIRE IT INTO CI so it actually guards, renumbering the CLAUDE.md gate list accordingly -- note generate-metrics-band.mts counts that list programmatically, so the count and ordering are load-bearing; (b) if the failure-record shape is considered obsolete, migrate those rows and keep a single schema; (c) if the validator is genuinely dead, delete it rather than leave a red script in the tree implying coverage that does not exist. Do not simply relax the validator to pass -- that reproduces the tested-but-never-wired class this repo just filed as FEAT-281.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- Given a learnings.jsonl line matching the loop.mts learnings-log shape ({id, timestamp, key, insight, confidence, sliceId, status, scope, agentType}), when validate-learnings-schema.mts runs, then the line passes validation.
- Given a learnings.jsonl line matching the review-failure capture shape ({kind: failure, ts, agent, severity, tags, summary, source}), when the validator runs, then the line passes validation via the discriminated union.
- Given a line matching neither known shape, when the validator runs, then it reports an error naming the line number and the missing/invalid keys.
- Given this repo's own .claude/artifacts/loop/learnings.jsonl, when the fixed validator runs against it, then it reports zero errors.
- Given the validator is wired into pre-push-validate.mts and/or .github/workflows, when CI runs, then its exit code gates the pipeline and CLAUDE.md's numbered CI-gate list is updated to include it with a count that still matches generate-metrics-band.mts's programmatic check.

## Proposed slices (PM decomposition)

- SLICE-1: Discriminated-union schema fix for learnings validator (key-shape vs kind-shape) (2 pts)
- SLICE-2: Wire learnings validator into CI/pre-push and renumber CLAUDE.md gate list (1 pts)
