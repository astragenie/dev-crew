---
id: FEAT-295
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-205]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.3
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Twin of the review-gate.mts grandfather clause SLICE-202 deleted per explicit owner decision (unbounded, not date-bounded — covers an artifact written this minute): validation-gate.mts's resolveVerdictOutcome (~line 158) treats any validation artifact lacking a decision key as satisfied. Review and validation are the loop's two behavioral gates; leaving one hardened and one permissive means the permissive one sets the real floor, so this should track FEAT-283/SLICE-202's severity — P1. This repo's reviewers.ladder [A] + loop.validation.satisfiedByReview:true reduces local blast radius (validation gate is usually satisfied by the reviewer badge here) but the FEAT is explicit this is product surface for adopter repos with a different ladder, so priority isn't discounted. Playbook is already established (SLICE-202 did the equivalent for ReviewGateResult), and scale must be counted first (review corpus was 160/211 frontmatter-less) before deleting the branch, since any open slice relying solely on a frontmatter-less validation artifact needs re-validation or an explicit validation_skipped badge. Related: FEAT-283/SLICE-202, FEAT-291 (same gate area, different drift shape). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Delete validation-gate.mts's unbounded null-decision grandfather clause"
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given resolveVerdictOutcome in validation-gate.mts (around line 158) currently treats a validation artifact with no decision key as satisfied (legacy, no decision frontmatter, grandfathered pre-P1.3), When this slice ships, Then that branch is deleted so a decision-less validation artifact no longer satisfies the gate, mirroring SLICE-202's removal of the equivalent review-gate.mts branch.", "AC-2: Given the validation corpus under .claude/artifacts/crew/validations has not yet been counted for missing-decision-key coverage, When this slice starts, Then it counts the corpus first (matching how the review corpus's 160/211 frontmatter-less figure was produced) and reports the number before deleting the branch.", "AC-3: Given any currently-open slice whose only validation evidence is frontmatter-less, When the corpus count identifies it, Then each such slice is named so it can be re-validated or given an explicit validation_skipped badge before the branch is deleted.", "AC-4: Given this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview:true, When the branch is deleted, Then the module header comment documenting the grandfathering behavior is also updated, and any now-dead legacy flag and its consumers (the pattern SLICE-202 followed for ReviewGateResult) are removed."]
    touches_files: [src/scripts/lib/validation-gate.mts, .claude/artifacts/crew/validations, src/tests/validation-gate.test.mts]
started_at: 2026-08-06
github_issue: 627
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/627"
---
## Description

validation-gate.mts carries a second unbounded grandfather clause, twin of the one deleted from review-gate.mts.

SLICE-202 deleted review-gate.mts's null-decision grandfather branch on 2026-08-05, per an explicit owner decision to clean this code of arbitrary cutoff and legacy-tolerance special cases rather than bound them with a date. builder-202 found and correctly flagged, rather than silently fixing, that validation-gate.mts has its own equivalent: resolveVerdictOutcome around line 158 applies the same treatment to validation artifacts that lack a decision key.

The same reasoning applies without modification. The clause is unbounded, so it covers an artifact written this minute, not merely genuinely historical ones. A validation artifact with no decision key proves nothing about whether the behavior was actually validated, and treating its absence of a verdict as a pass means the validation gate can be satisfied by a file that never recorded an outcome. Review and validation are the two behavioral gates in the loop; leaving one hardened and the other permissive means the weaker one sets the real floor.

Scale is likely comparable and should be measured before the change, not assumed. The review corpus turned out to be 160 of 211 artifacts lacking a decision key, roughly 76 percent, of which 85 had no frontmatter block at all. The validations directory has not been counted. Do that first, because the number determines how much re-validation the change creates and whether any currently-open slice depends on a frontmatter-less validation artifact to close.

Relevant local context: this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview true, so the close-time validation gate is normally satisfied by the reviewer approval badge rather than by a validation artifact. That reduces the blast radius here relative to review-gate, but it does not remove it, and it does not hold for adopter repos that ship this plugin with a different ladder or without satisfiedByReview. This is product surface, not just this repo's own configuration.

Acceptance direction. Count the validation corpus and identify any open slice whose only validation evidence is frontmatter-less, naming each so it can be re-validated or given an explicit validation_skipped badge. Delete the null-decision branch so such artifacts are unproven rather than satisfied. Remove any now-dead legacy flag and its consumers, as SLICE-202 did for ReviewGateResult. Update the module header comment, which documents the grandfathering behavior. Then sweep for any third instance of this pattern in other gate modules rather than assuming these two were the only ones.

Consider also whether the two gates should share one resolution helper instead of carrying parallel implementations that drifted apart, since parallel copies diverging is what allowed one to be hardened while the other was not.

Related: FEAT-283 and its SLICE-202 (the review-gate half), FEAT-291 (code-versus-prose vocabulary drift in the same gate area).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Delete validation-gate.mts's unbounded null-decision grandfather clause (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given resolveVerdictOutcome in validation-gate.mts (around line 158) currently treats a validation artifact with no decision key as satisfied (legacy, no decision frontmatter, grandfathered pre-P1.3), When this slice ships, Then that branch is deleted so a decision-less validation artifact no longer satisfies the gate, mirroring SLICE-202's removal of the equivalent review-gate.mts branch.
- AC-2: Given the validation corpus under .claude/artifacts/crew/validations has not yet been counted for missing-decision-key coverage, When this slice starts, Then it counts the corpus first (matching how the review corpus's 160/211 frontmatter-less figure was produced) and reports the number before deleting the branch.
- AC-3: Given any currently-open slice whose only validation evidence is frontmatter-less, When the corpus count identifies it, Then each such slice is named so it can be re-validated or given an explicit validation_skipped badge before the branch is deleted.
- AC-4: Given this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview:true, When the branch is deleted, Then the module header comment documenting the grandfathering behavior is also updated, and any now-dead legacy flag and its consumers (the pattern SLICE-202 followed for ReviewGateResult) are removed.
