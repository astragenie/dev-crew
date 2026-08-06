---
id: PM-REVIEW-FEAT-298
feature: FEAT-298
reviewed_at: 2026-08-06
pm_customer_impact: 0.65
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.55
pm_technical_risk: 0.5
pm_dependency_depth: 0.25
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-298

## Demand Assessment

- **Evidence:** none

## Scope Challenge

- **Scope notes:** none

## Scores

- customer_impact: 0.65
- effort_estimate: 0.55
- strategic_alignment: 0.55
- technical_risk: 0.50
- dependency_depth: 0.25

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: 212 slice files occupy 203 distinct ids: 4 genuine id collisions (SLICE-115 x4, SLICE-117 x4, SLICE-116 x2, SLICE-134 x2, 12 files total) plus SLICE-118's directory-drift case (tracked separately under FEAT-296). Not hypothetical for gating — SLICE-116's four review artifacts already span two different parent FEATs (feat-169-slice-116, feat-183-slice-116) pooled under one id token, meaning review-gate's id-tokenized artifact scan and any id-keyed lookup answer by whichever file is found first. This directly undermines the identity contract SLICE-192 just shipped (proposed_slice_id_suffix keying, with an exact-title-match fallback for ~200 legacy slices). Elevated to P1 over FEAT-296 because it's a correctness bug in gate matching today, not just a triage-input accuracy issue. Effort and risk are higher than the other items in this batch because remediation means renumbering 12 existing files while keeping their review/validation artifacts and github_issue references intact — a renumber that drops a reference converts a collision into an orphan, so I'm marking autonomous_safe false pending review of the existing renumber CLI's fitness for backfill (it was built for FEAT-257/DEC-079's allocation-side fix, not confirmed against existing collisions). Pre-mortem (required at P1): most likely two-weeks-later failure is a renumbered file's artifact or github_issue reference going stale because it wasn't included in the same-slice scan; rollback needs a targeted revert of the renumber commit plus artifact restoration, not a plain git revert. Related: FEAT-296 (SLICE-118, adjacent but distinct), FEAT-284/SLICE-192 (the identity contract this now threatens), FEAT-257/DEC-079 (allocation-side fix, did not backfill). No cost analog checked this pass.

## Risks

- none
