---
id: FEAT-024
status: in-progress
priority: P0
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: []
slices: [SLICE-49]
derived_from: null
pm_customer_impact: 0.9
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.9
pm_technical_risk: 0.7
pm_dependency_depth: 0
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P0, holds and strengthened: this closes a fail-open gate now confirmed LIVE (not latent) on every single reviewer dispatch in the repo today, via a path (--scaffold --status in-progress) that is every reviewer prompt's mandatory first action. technical_risk raised to 0.7 (band 0.6-0.8, upper-middle: cross-file reach now spans crew.mts + workflow-state.mts + workflow-state-gates.mts + artifacts/write.mts passthrough + the run-brief writer, and six live agent prompts' existing behavior must survive unchanged)."
started_at: 2026-11-06
---
## Description

Audit T4: explicit, per-reviewer aggregated review and validation verdicts; scaffolds never flip the gate

Source: remediation plan Task 4; Codex #20, #21; assumption-attack #2/#3; architect OBJ-5. Wave 1 lane C. Depends on: none.

Problem (live on every dispatch, not latent): crew/scripts/crew.mts:566-577 resolveReviewVerdict returns undefined when --decision is absent; crew/scripts/lib/workflow-state.mts:425-444 (legacy comment 418-424) then applies review_passed. Every reviewer's mandatory FIRST action is `write-review-result --scaffold --status in-progress` with no decision (agents/reviewer.md:43-46, architect-reviewer.md:30, csharp-reviewer.md:44, typescript-reviewer.md:44, reviewer-lite.md:44, verifier.md:78); crew/scripts/lib/artifacts/write.mts:931-934 registers it, so the gate is green before the review starts, and src/scripts/lib/review-gate.mts:6 treats that as satisfied at slice close. With reviewers.ladder ["A","B"] dispatched in one message (commands/build.md:96), one reviewResult slot means reject-then-approve turns the gate green.

Deliverable:
- `--decision` required only when the write is terminal: `--status completed` or no --status, and no `--scaffold`. Missing → stderr "[crew] write-review-result refused: --decision is required (approved|approved_with_notes|rejected)", exit 2. `--scaffold` and `--status in-progress` writes register the artifact path and apply NO badge / NO verdict (gate unchanged). Same for write-validation-result (pass|fail|skipped; skipped requires --skip-reason → validation_skipped with reason). Preserves DEC-019 scaffold/update idempotency; existing tests in crew/tests/artifact-stub-and-update.test.mts keep passing.
- `run.gates.review.reviewers: Record<role, verdict>` keyed by the `--reviewer` value (role names such as typescript-reviewer; not letters). Status = failed if any rejected; else passed only when every required reviewer has written; else required. The required set is snapshotted from `reviewers.ladder` (.claude/loop.json:66-70, read via workflow-config.mts / src/scripts/lib/post-builder-fanout.mts:5) into `gates.review.required[]` at run-brief time. No `--required-reviewers` flag (second source of truth — deleted per architect). Same shape `validation.validators`.
- GateEntry (crew/scripts/lib/workflow-state-gates.mts:22-27) gains reviewers?/validators?/required?; delete the legacy default-approve comment; crew/scripts/validate-badges.mts (gate 25) and src/scripts/lib/review-gate.mts still pass; verdict/reviewer passthrough in write.mts (:112, :283).
- Test crew/tests/review-verdict-aggregation.test.mts using the real signature `registerWorkflowArtifact(repoPath, artifact: ArtifactRef, fields)`.

Acceptance criteria (draft):
- Given a run, when write-review-result is called with no --status (or --status completed) and no --decision, then exit 2 and stderr matches /--decision is required/.
- Given `--scaffold --status in-progress` with no --decision, then exit 0, the artifact path is recorded, and gates.review is unchanged (no review_passed).
- Given reviewer a=rejected then b=approved, and the mirror order, then gates.review.status is failed and reviewers equals {a: rejected, b: approved}.
- Given a run brief under ladder ["A","B"] (roles resolved) and only one reviewer written approved, then status is required; after both approved, passed.
- Given write-validation-result --decision skipped without --skip-reason, then exit 2; with it, validation_skipped carries the reason.
- `cd crew && bun test tests/` green; validate-badges green.

Scope: crew/scripts/crew.mts (verdict resolution + two handlers), crew/scripts/lib/workflow-state*.mts, crew/scripts/lib/artifacts/write.mts (passthrough), run-brief writer (required snapshot), crew/tests/. No prompt edits (FEAT-027/028 own prose).

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a run, When `write-review-result` is called with no `--status` (or `--status completed`) and no `--decision`, Then it exits `2` and stderr matches `/--decision is required/`.
- AC-2: Given `--scaffold --status in-progress` with no `--decision`, Then it exits `0`, the artifact path is recorded, and `gates.review` is unchanged (no `review_passed`).
- AC-3: Given reviewer `a=rejected` then `b=approved` (and the mirror order), Then `gates.review.status` is `failed` and `reviewers` equals `{a: rejected, b: approved}`.
- AC-4: Given a run brief under ladder `["A","B"]` (roles resolved) and only one reviewer has written `approved`, Then status is `required`; after both have written `approved`, Then status is `passed`.
- AC-5: Given `write-validation-result --decision skipped` without `--skip-reason`, Then it exits `2`; with `--skip-reason`, Then `validation_skipped` carries the reason, and `cd crew && bun test tests/` plus `validate-badges` are both green.
