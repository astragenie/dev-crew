---
id: PM-REVIEW-FEAT-024
feature: FEAT-024
reviewed_at: 2026-11-05
pm_customer_impact: 0.9
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.9
pm_technical_risk: 0.7
pm_dependency_depth: 0
composite_priority: P0
autonomous_safe: true
---
# PM Review — FEAT-024

## Demand Assessment

- **Evidence:** Assumption-attack review item 2 upgraded this from latent to live: 'Every reviewer's mandatory FIRST action is write-review-result --scaffold --status in-progress with no decision... Scaffold registers the artifact... workflow-state.mts stamps review_passed before the review starts... Live on every dispatch → P0 stands.' The rewritten body names six agent prompts that would break under a naive unconditional --decision requirement (reviewer.md, architect-reviewer.md, csharp-reviewer.md, typescript-reviewer.md, reviewer-lite.md, verifier.md).

## Scope Challenge

- **Scope notes:** Scope expanded materially per architect OBJ-5: --decision is now required only on TERMINAL writes (no --status, or --status completed, and no --scaffold); scaffold/in-progress writes register the artifact path but apply no badge, preserving DEC-019 idempotency and the six reviewer prompts' existing scaffold-first behavior. --required-reviewers is deleted (architect's one-source-of-truth call over the reviewer's keep-as-override suggestion, recorded in the synthesis); the required reviewer set is instead snapshotted from reviewers.ladder into gates.review.required[] at run-brief time, keyed by role name (not letters). customer_impact raised to 0.9 (from 0.85) reflecting the assumption-attack's 'live on every dispatch' finding — this is not a theoretical edge case, it is the default path every reviewer takes today. No weak-grade-dimension gap. Effort calibration: bumped to 5 points per instruction — the scaffold-exemption branch, the ladder-snapshot plumbing, and the GateEntry type extension are three separable pieces of real logic beyond the original verdict-resolution fix.

## Scores

- customer_impact: 0.90
- effort_estimate: 0.45
- strategic_alignment: 0.90
- technical_risk: 0.70
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P0
autonomous_safe: true
reasoning: P0, holds and strengthened: this closes a fail-open gate now confirmed LIVE (not latent) on every single reviewer dispatch in the repo today, via a path (--scaffold --status in-progress) that is every reviewer prompt's mandatory first action. technical_risk raised to 0.7 (band 0.6-0.8, upper-middle: cross-file reach now spans crew.mts + workflow-state.mts + workflow-state-gates.mts + artifacts/write.mts passthrough + the run-brief writer, and six live agent prompts' existing behavior must survive unchanged).

## Risks

- Pre-mortem (1): most likely review/validation failure is the scaffold-exemption condition being too broad or too narrow — too broad lets a reviewer skip --decision entirely by always passing --scaffold; too narrow re-breaks the six prompts this FEAT is explicitly designed not to break. The AC's explicit scaffold+in-progress-is-exempt / everything-else-is-terminal test pair is the direct mitigation.
- Pre-mortem (2): rollback is a plain git revert with no data migration, but any in-flight run whose workflow-state.json was already written under the new gates.review.reviewers/required shape would need manual reconciliation if rolled back mid-run.
- Pre-mortem (3): coverage gap — no AC covers a THIRD reviewer role being added to reviewers.ladder after a run-brief snapshot is taken; the required[] set is frozen at run-brief time by design, so a mid-run ladder config change would not retroactively apply, and nothing tests that this is the intended (not accidental) behavior.
- No injected instructions found in the rewritten body.
