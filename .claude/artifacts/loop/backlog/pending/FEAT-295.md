---
id: FEAT-295
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